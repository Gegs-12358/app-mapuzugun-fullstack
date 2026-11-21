require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const AVATARES = ['puma', 'aguila', 'bandurria', 'monito', 'pudu', 'ranita'];

// ---------- REGLAS DEL JUEGO ----------
const XP_POR_ACIERTO = 20;
const XP_POR_REPASO = 5;
const GEMAS_INICIALES = 40;
const COSTO_RECARGA = 30;
const GEMAS_POR_ACIERTO = 2; // solo la primera vez que se completa una etapa
const VIDAS_MAX = 5;
const MINUTOS_POR_VIDA = 10;

// Contenido: en producción solo se entrega lo aprobado por hablantes.
// Para desarrollo, pon CONTENIDO_BORRADOR=true en el .env.
const VER_BORRADORES = process.env.CONTENIDO_BORRADOR === 'true';
// «retirado»: contenido con errores que se saca de circulación sin borrarlo (nunca se muestra)
const soloAprobado = (alias = '') => {
  const col = `${alias ? alias + '.' : ''}estado`;
  return VER_BORRADORES ? `${col} <> 'retirado'` : `${col} = 'aprobado'`;
};
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env');
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1);   // necesario detrás del proxy de Render (para el límite de intentos)

// ---------- CORS ----------
// Orígenes permitidos, separados por coma en el .env
const origenesPermitidos = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Sin origen (apps nativas, curl): se permite. Con origen: solo los de la lista.
    if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
    callback(null, false);
  }
}));

app.use(express.json({ limit: '10kb' }));

// ---------- BASE DE DATOS ----------
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  // Se verifica el certificado del servidor (Neon usa uno válido).
  // DB_SSL=false solo para una base local sin SSL.
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: true }
});

// ---------- PREPARAR LA BASE ----------
// Crea lo que falte al arrancar, para no tener que correr SQL a mano en cada cambio.
// Todo usa IF NOT EXISTS, así que correrlo varias veces no hace nada.
async function prepararBase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_errores (
      user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_id       INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      fallos            INT NOT NULL DEFAULT 0,
      aciertos_seguidos INT NOT NULL DEFAULT 0,
      actualizado       TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, exercise_id)
    )`);
  // Fecha de creación de cada cuenta. Las cuentas antiguas quedan sin fecha (NULL).
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ');
  await pool.query('ALTER TABLE users ALTER COLUMN creado_en SET DEFAULT now()');
}

// ---------- LÍMITES DE INTENTOS ----------
// Máximo 10 intentos fallidos de login cada 15 minutos por conexión
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
});

// Máximo 10 cuentas nuevas por hora por conexión
const limiteRegistro = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados registros desde esta conexión. Inténtalo más tarde.' }
});

// Consultas de nombre disponible mientras se escribe: máximo 60 cada 15 minutos
const limiteDisponible = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas. Espera unos minutos.' }
});

// ---------- NOMBRES DE USUARIO ----------
// Se comparan sin distinguir mayúsculas: «Gabriel» y «gabriel» son el mismo nombre
async function nombreOcupado(nombre) {
  const r = await pool.query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [nombre]);
  return r.rows.length > 0;
}

// Hasta 3 nombres parecidos que estén libres, a partir del que escribió la persona
async function sugerirNombres(nombre, avatar) {
  const base = nombre.replace(/\s+/g, '').slice(0, 40) || 'kimanke';
  const azar = () => Math.floor(10 + Math.random() * 990);
  const candidatos = [...new Set([
    AVATARES.includes(avatar) ? `${base}_${avatar}` : `${base}_kimanke`,
    `${base}${azar()}`,
    `${base}.${new Date().getFullYear()}`,
    `${base}_kimanke`,
    `${base}${azar()}`,
  ])].filter(c => c.length >= 3 && c.length <= 50);

  const ocupados = await pool.query(
    'SELECT LOWER(username) AS u FROM users WHERE LOWER(username) = ANY($1)',
    [candidatos.map(c => c.toLowerCase())]
  );
  const usados = new Set(ocupados.rows.map(r => r.u));
  return candidatos.filter(c => !usados.has(c.toLowerCase())).slice(0, 3);
}

// ---------- AUTENTICACIÓN ----------
function crearToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sesión no iniciada' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, username }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión expirada o inválida' });
  }
}

// ---------- RUTAS PÚBLICAS ----------
app.post('/api/register', limiteRegistro, async (req, res) => {
  const { password, avatar } = req.body;
  let { username } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  username = username.trim();
  if (!AVATARES.includes(avatar)) {
    return res.status(400).json({ error: 'Elige un avatar' });
  }
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ error: 'El usuario debe tener entre 3 y 50 caracteres' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  if (username.includes('@')) {
    return res.status(400).json({ error: 'Usa un apodo, no tu correo' });
  }

  try {
    if (await nombreOcupado(username)) {
      return res.status(409).json({
        error: 'El nombre de usuario ya está en uso',
        sugerencias: await sugerirNombres(username, avatar)
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (username, password, avatar, xp, streak, lives, gems)
       VALUES ($1, $2, $3, 0, 0, 5, $4)
       RETURNING id, username, avatar, xp, streak, lives, gems`,
      [username, hashedPassword, avatar, GEMAS_INICIALES]
    );

    const user = newUser.rows[0];
    res.json({ ...user, token: crearToken(user) });
  } catch (err) {
    // Dos registros simultáneos con el mismo nombre: gana uno, el otro choca con UNIQUE
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'El nombre de usuario ya está en uso',
        sugerencias: await sugerirNombres(username, avatar).catch(() => [])
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Para despertar el servidor y para un monitor externo que lo visite y no lo deje dormir.
// No toca la base de datos.
app.get('/api/salud', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ ok: true });
});

// ¿Está libre este nombre? Se usa mientras la persona escribe al crear su cuenta
app.get('/api/usuario-disponible', limiteDisponible, async (req, res) => {
  const nombre = typeof req.query.nombre === 'string' ? req.query.nombre.trim() : '';
  const avatar = typeof req.query.avatar === 'string' ? req.query.avatar : '';
  if (nombre.length < 3 || nombre.length > 50 || nombre.includes('@')) {
    return res.json({ disponible: false, sugerencias: [] });
  }
  try {
    if (!(await nombreOcupado(nombre))) return res.json({ disponible: true, sugerencias: [] });
    res.json({ disponible: false, sugerencias: await sugerirNombres(nombre, avatar) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/login', limiteLogin, async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  try {
    // Sin distinguir mayúsculas; si hubiera dos cuentas antiguas que solo difieren en eso, gana la exacta
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) ORDER BY (username = $1) DESC LIMIT 1',
      [username.trim()]
    );
    const user = result.rows[0];

    // Mismo mensaje si falla el usuario o la contraseña
    const valid = user && user.password && await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    res.json({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      xp: user.xp,
      streak: user.streak,
      lives: user.lives,
      gems: user.gems,
      token: crearToken(user)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.get('/api/units', async (req, res) => {
  try {
    // Solo unidades que tienen al menos un ejercicio visible.
    // La nota cultural se entrega solo si está aprobada (o en modo borrador).
    const result = await pool.query(
      `SELECT u.id, u.title,
              CASE WHEN ${VER_BORRADORES ? 'TRUE' : "u.nota_estado = 'aprobado'"}
                   THEN u.nota_cultural END AS nota_cultural,
              u.nota_estado
       FROM units u
       WHERE EXISTS (SELECT 1 FROM exercises e WHERE e.unit_id = u.id AND ${soloAprobado('e')})
       ORDER BY u.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las unidades' });
  }
});

// ---------- RUTAS PROTEGIDAS ----------
// De aquí en adelante hace falta token. El usuario sale del token,
// no del cuerpo de la petición.
app.use('/api', requireAuth);

app.put('/api/avatar', async (req, res) => {
  const { avatar } = req.body;
  if (!AVATARES.includes(avatar)) {
    return res.status(400).json({ error: 'Avatar inválido' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING avatar',
      [avatar, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar la cuenta y todo su progreso. Pide la contraseña para confirmar.
// El progreso se borra solo, porque la tabla de progreso tiene ON DELETE CASCADE.
app.delete('/api/account', limiteLogin, async (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Debes escribir tu contraseña' });
  }
  try {
    const found = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (found.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password, found.rows[0].password);
    if (!valid) return res.status(403).json({ error: 'Contraseña incorrecta' });

    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.get('/api/exercises', async (req, res) => {
  const unitId = parseInt(req.query.unitId, 10);
  const stage = req.query.stage !== undefined ? parseInt(req.query.stage, 10) : null;

  if (!Number.isInteger(unitId) || (stage !== null && !Number.isInteger(stage))) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  try {
    let query = `SELECT id, unit_id, stage, type, question, correct_answer, options,
                        audio_url, cultural_note, estado, grafemario, variante
                 FROM exercises WHERE unit_id = $1 AND ${soloAprobado()}`;
    const params = [unitId];
    if (stage !== null) {
      query += ' AND stage = $2';
      params.push(stage);
    }
    query += ' ORDER BY id';

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No hay ejercicios' });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

app.get('/api/stages', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.unit_id, e.stage, COUNT(*)::int AS ejercicios, s.title,
              COALESCE(p.completed, false) AS completed,
              COALESCE(p.score, 0) AS score
       FROM exercises e
       LEFT JOIN stages s ON s.unit_id = e.unit_id AND s.stage = e.stage
       LEFT JOIN user_progress p
              ON p.unit_id = e.unit_id AND p.stage = e.stage AND p.username = $1
       WHERE ${soloAprobado('e')}
       GROUP BY e.unit_id, e.stage, s.title, p.completed, p.score
       ORDER BY e.unit_id, e.stage`,
      [req.user.username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

// El parámetro :username se mantiene para no tocar el frontend,
// pero se ignora: siempre responde con el usuario del token.
app.get('/api/user/:username', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, avatar, xp, lives, gems, last_life_regen,
        CASE
          WHEN last_played::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date - 1
            THEN streak
          ELSE 0
        END AS streak
        FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

app.post('/api/lose-life', async (req, res) => {
  try {
    // Si estaba con las vidas llenas, el reloj de recarga parte ahora.
    // Sin esto, last_life_regen quedaba viejo y la vida perdida volvía al instante.
    const result = await pool.query(
      `UPDATE users
       SET lives = GREATEST(lives - 1, 0),
           last_life_regen = CASE WHEN lives >= $2::int THEN LOCALTIMESTAMP ELSE last_life_regen END
       WHERE id = $1 RETURNING lives, gems`,
      [req.user.id, VIDAS_MAX]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

app.post('/api/buy-lives', async (req, res) => {
  const costoGemas = COSTO_RECARGA;
  try {
    // Una sola consulta atómica: descuenta solo si alcanzan las gemas
    const result = await pool.query(
      'UPDATE users SET gems = gems - $1, lives = $3 WHERE id = $2 AND gems >= $1 RETURNING lives, gems',
      [costoGemas, req.user.id, VIDAS_MAX]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No tienes suficientes gemas' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/lessons/complete', async (req, res) => {
  const { unitId, stage, correct } = req.body;
  if (!Number.isInteger(unitId) || !Number.isInteger(stage) || !Number.isInteger(correct) || correct < 0) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const client = await pool.connect();
  try {
    const totalRes = await client.query(
      `SELECT COUNT(*)::int AS total FROM exercises
       WHERE unit_id = $1 AND stage = $2 AND ${soloAprobado()}`,
      [unitId, stage]
    );
    const total = totalRes.rows[0].total;
    if (total === 0) return res.status(404).json({ error: 'Etapa no encontrada' });

    // El servidor limita los aciertos al número real de ejercicios
    const aciertos = Math.min(correct, total);

    await client.query('BEGIN');

    // Si la fila ya existía, no es la primera vez
    const insert = await client.query(
      `INSERT INTO user_progress (username, unit_id, stage, completed, score)
       VALUES ($1, $2, $3, true, $4)
       ON CONFLICT (username, unit_id, stage) DO NOTHING
       RETURNING unit_id`,
      [req.user.username, unitId, stage, aciertos]
    );
    const primeraVez = insert.rows.length > 0;

    if (!primeraVez) {
      await client.query(
        `UPDATE user_progress
         SET completed = true,
             score = GREATEST(score, $4),
             completed_at = CURRENT_TIMESTAMP
         WHERE username = $1 AND unit_id = $2 AND stage = $3`,
        [req.user.username, unitId, stage, aciertos]
      );
    }

    const xpGanado = aciertos * (primeraVez ? XP_POR_ACIERTO : XP_POR_REPASO);
    const gemasGanadas = primeraVez ? aciertos * GEMAS_POR_ACIERTO : 0;

    const user = await client.query(
      `UPDATE users
       SET xp = xp + $1,
           gems = gems + $3,
           streak = CASE
             WHEN last_played::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date
               THEN GREATEST(streak, 1)
             WHEN last_played::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date - 1
               THEN streak + 1
             ELSE 1
           END,
           last_played = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date
       WHERE id = $2
       RETURNING id, username, xp, streak, lives, gems`,
      [xpGanado, req.user.id, gemasGanadas]
    );

    await client.query('COMMIT');
    res.json({ ...user.rows[0], xpGanado, gemasGanadas, primeraVez, aciertos, total });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => { });
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la lección' });
  } finally {
    client.release();
  }
});

app.post('/api/earn-life', async (req, res) => {
  try {
    // Solo se puede recuperar una vida cuando te quedaste sin ninguna
    const result = await pool.query(
      'UPDATE users SET lives = 1 WHERE id = $1 AND lives = 0 RETURNING lives, gems',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Todavía tienes vidas disponibles' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al ganar vida' });
  }
});

app.post('/api/regen-lives', async (req, res) => {
  try {
    // Los minutos se calculan en la base, no en Node: last_life_regen no guarda zona
    // horaria, y si Node y Postgres tienen zonas distintas el cálculo se desfasa horas.
    const userRes = await pool.query(
      `SELECT lives,
              EXTRACT(EPOCH FROM (LOCALTIMESTAMP - last_life_regen)) / 60 AS minutos
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = userRes.rows[0];
    const minutesSinceLast = Number(user.minutos) || 0;
    const livesToAdd = Math.floor(minutesSinceLast / MINUTOS_POR_VIDA);

    if (livesToAdd > 0 && user.lives < VIDAS_MAX) {
      const newLives = Math.min(user.lives + livesToAdd, VIDAS_MAX);
      // Se avanza el reloj solo lo que se usó, para no perder los minutos sobrantes.
      // Con las vidas llenas, el reloj ya no importa (lose-life lo reinicia).
      const updateRes = await pool.query(
        `UPDATE users
         SET lives = $1::int,
             last_life_regen = CASE WHEN $1::int >= $4::int THEN LOCALTIMESTAMP
                                    ELSE last_life_regen + make_interval(mins => $3::int) END
         WHERE id = $2 AND lives = $5::int
         RETURNING lives`,
        [newLives, req.user.id, livesToAdd * MINUTOS_POR_VIDA, VIDAS_MAX, user.lives]
      );
      if (updateRes.rows.length === 0) {
        // Otra petición cambió las vidas entretanto; se responde con el valor actual
        const actual = await pool.query('SELECT lives FROM users WHERE id = $1', [req.user.id]);
        return res.json({ lives: actual.rows[0]?.lives ?? user.lives, regened: 0 });
      }
      return res.json({ lives: updateRes.rows[0].lives, regened: newLives - user.lives });
    }

    res.json({ lives: user.lives, regened: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al regenerar vidas' });
  }
});

// ---------- REPASO ----------
// Una palabra sale del repaso cuando se responde bien dos veces seguidas.
const ACIERTOS_PARA_APRENDIDA = 2;
const PREGUNTAS_POR_REPASO = 8;

// Se registra cada respuesta. Un error suma un fallo; un acierto solo cuenta
// si la palabra ya estaba en el repaso.
app.post('/api/respuesta', async (req, res) => {
  const { exerciseId, correcta } = req.body || {};
  if (!Number.isInteger(exerciseId) || typeof correcta !== 'boolean') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  try {
    if (correcta) {
      await pool.query(
        `UPDATE user_errores
         SET aciertos_seguidos = aciertos_seguidos + 1, actualizado = now()
         WHERE user_id = $1 AND exercise_id = $2`,
        [req.user.id, exerciseId]
      );
    } else {
      await pool.query(
        `INSERT INTO user_errores (user_id, exercise_id, fallos, aciertos_seguidos)
         SELECT $1, id, 1, 0 FROM exercises WHERE id = $2
         ON CONFLICT (user_id, exercise_id)
         DO UPDATE SET fallos = user_errores.fallos + 1, aciertos_seguidos = 0, actualizado = now()`,
        [req.user.id, exerciseId]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la respuesta' });
  }
});

// Las palabras que más le han costado a la persona (solo contenido visible)
app.get('/api/repaso', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id, e.unit_id, e.stage, e.type, e.question, e.correct_answer, e.options,
              e.audio_url, e.cultural_note, e.estado, e.grafemario, e.variante,
              COUNT(*) OVER()::int AS total
       FROM user_errores r
       JOIN exercises e ON e.id = r.exercise_id
       WHERE r.user_id = $1 AND r.aciertos_seguidos < $2 AND ${soloAprobado('e')}
       ORDER BY r.fallos DESC, r.actualizado DESC
       LIMIT $3`,
      [req.user.id, ACIERTOS_PARA_APRENDIDA, PREGUNTAS_POR_REPASO]
    );
    const total = result.rows[0]?.total ?? 0;
    res.json({ total, ejercicios: result.rows.map(({ total, ...e }) => e) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar el repaso' });
  }
});

// Terminar un repaso: suma Kimün y cuenta para la racha, sin Llankas
app.post('/api/repaso/completar', async (req, res) => {
  const { correct } = req.body || {};
  if (!Number.isInteger(correct) || correct < 0) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  const aciertos = Math.min(correct, PREGUNTAS_POR_REPASO * 2);
  const xpGanado = aciertos * XP_POR_REPASO;
  try {
    const user = await pool.query(
      `UPDATE users
       SET xp = xp + $1,
           streak = CASE
             WHEN last_played::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date
               THEN GREATEST(streak, 1)
             WHEN last_played::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date - 1
               THEN streak + 1
             ELSE 1
           END,
           last_played = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date
       WHERE id = $2
       RETURNING id, username, xp, streak, lives, gems`,
      [xpGanado, req.user.id]
    );
    if (user.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ...user.rows[0], xpGanado, gemasGanadas: 0, aciertos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el repaso' });
  }
});

// ---------- MANEJO DE ERRORES ----------
// Evita que un JSON mal formado devuelva una página con rutas internas del servidor
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Petición demasiado grande' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error en el servidor' });
});

const PORT = process.env.PORT || 3000;
prepararBase()
  .catch(err => console.error('No se pudo preparar la base:', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
    });
  });