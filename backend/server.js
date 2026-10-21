require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const AVATARES = ['puma', 'aguila', 'bandurria', 'monito'];
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env');
  process.exit(1);
}

const app = express();

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
});

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
  const { username, password, avatar } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  if (!AVATARES.includes(avatar)) {
    return res.status(400).json({ error: 'Elige un avatar' });
  }
  if (username.trim().length < 3 || username.length > 50) {
    return res.status(400).json({ error: 'El usuario debe tener entre 3 y 50 caracteres' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const userExists = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (username, password, avatar, xp, streak, lives, gems)
       VALUES ($1, $2, $3, 120, 3, 5, 500)
       RETURNING id, username, avatar, xp, streak, lives, gems`,
      [username, hashedPassword, avatar]
    );

    const user = newUser.rows[0];
    res.json({ ...user, token: crearToken(user) });
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
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
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
    const result = await pool.query('SELECT * FROM units ORDER BY id');
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

app.get('/api/exercises', async (req, res) => {
  const unitId = parseInt(req.query.unitId, 10);
  const stage = req.query.stage !== undefined ? parseInt(req.query.stage, 10) : null;

  if (!Number.isInteger(unitId) || (stage !== null && !Number.isInteger(stage))) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  try {
    let query = 'SELECT * FROM exercises WHERE unit_id = $1';
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
      'SELECT id, username, avatar, xp, streak, lives, gems, last_life_regen FROM users WHERE id = $1',
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
    const result = await pool.query(
      'UPDATE users SET lives = GREATEST(lives - 1, 0) WHERE id = $1 RETURNING lives, gems',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

app.post('/api/buy-lives', async (req, res) => {
  const costoGemas = 100;
  try {
    // Una sola consulta atómica: descuenta solo si alcanzan las gemas
    const result = await pool.query(
      'UPDATE users SET gems = gems - $1, lives = 5 WHERE id = $2 AND gems >= $1 RETURNING lives, gems',
      [costoGemas, req.user.id]
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

const XP_POR_ACIERTO = 20;
const XP_POR_REPASO = 5;

app.post('/api/lessons/complete', async (req, res) => {
  const { unitId, stage, correct } = req.body;
  if (!Number.isInteger(unitId) || !Number.isInteger(stage) || !Number.isInteger(correct) || correct < 0) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const client = await pool.connect();
  try {
    const totalRes = await client.query(
      'SELECT COUNT(*)::int AS total FROM exercises WHERE unit_id = $1 AND stage = $2',
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

    const user = await client.query(
      'UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING id, username, xp, streak, lives, gems',
      [xpGanado, req.user.id]
    );

    await client.query('COMMIT');
    res.json({ ...user.rows[0], xpGanado, primeraVez, aciertos, total });
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
    const userRes = await pool.query(
      'SELECT lives, last_life_regen FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = userRes.rows[0];
    const minutesSinceLast = (Date.now() - new Date(user.last_life_regen).getTime()) / 60000;
    const livesToAdd = Math.floor(minutesSinceLast / 10); // 1 vida cada 10 minutos

    if (livesToAdd > 0 && user.lives < 5) {
      const newLives = Math.min(user.lives + livesToAdd, 5);
      const updateRes = await pool.query(
        'UPDATE users SET lives = $1, last_life_regen = CURRENT_TIMESTAMP WHERE id = $2 RETURNING lives',
        [newLives, req.user.id]
      );
      return res.json({ lives: updateRes.rows[0].lives, regened: livesToAdd });
    }

    res.json({ lives: user.lives, regened: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al regenerar vidas' });
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
app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});