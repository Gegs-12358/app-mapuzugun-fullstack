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
const helmet = require('helmet');
const crypto = require('crypto');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env');
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1);   // necesario detrás del proxy de Render (para el límite de intentos)

// Encabezados de seguridad. La API solo responde JSON, así que la política de
// contenido puede ser la más cerrada. CORP en 'cross-origin' para que la app web
// y la APK (que vienen de otro origen) puedan leer las respuestas.
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});
app.disable('x-powered-by');

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
// Sin cuerpo JSON (o con otro tipo de contenido), req.body queda como objeto vacío
// en vez de undefined, para que las validaciones respondan 400 y no un error 500.
app.use((req, res, next) => {
  if (req.body === undefined || req.body === null || typeof req.body !== 'object') req.body = {};
  next();
});

// Enteros válidos para ids de unidad, etapa y ejercicio (evita desbordar el INT de Postgres)
const esId = (n) => Number.isInteger(n) && n > 0 && n < 1_000_000;

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
  // Correo para recuperar la contraseña (verificado con un código). Uno por cuenta.
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unico ON users (LOWER(email))');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS codigos_correo (
      id          SERIAL PRIMARY KEY,
      user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      proposito   TEXT NOT NULL CHECK (proposito IN ('verificar', 'recuperar')),
      email       TEXT NOT NULL,
      codigo_hash TEXT NOT NULL,
      intentos    INT NOT NULL DEFAULT 0,
      expira      TIMESTAMPTZ NOT NULL,
      creado      TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await pool.query('CREATE INDEX IF NOT EXISTS codigos_correo_usuario ON codigos_correo (user_id, proposito)');
  // El progreso apunta al nombre de usuario: al cambiar el nombre, el progreso lo sigue
  await pool.query(`
    DO $$
    DECLARE fk text;
    BEGIN
      SELECT conname INTO fk FROM pg_constraint
      WHERE conrelid = 'user_progress'::regclass AND contype = 'f'
        AND confrelid = 'users'::regclass AND confupdtype <> 'c';
      IF fk IS NOT NULL THEN
        EXECUTE format('ALTER TABLE user_progress DROP CONSTRAINT %I', fk);
        ALTER TABLE user_progress ADD CONSTRAINT user_progress_username_fkey
          FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`);
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

// Terminar lecciones y repasos: máximo 40 por hora por persona (no por conexión),
// para que nadie sume puntos mandando la misma petición en un ciclo
const limiteCompletar = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  keyGenerator: (req) => `usuario-${req.user?.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Has terminado muchas lecciones seguidas. Descansa un rato y sigue después.' }
});

// Envío de códigos por correo: máximo 5 cada 15 minutos por conexión
const limiteCodigos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Pediste muchos códigos seguidos. Espera unos minutos.' }
});

// ---------- NOMBRES DE USUARIO ----------
// Se comparan sin distinguir mayúsculas: «Gabriel» y «gabriel» son el mismo nombre
// exceptoId: al cambiar el nombre, la propia cuenta no cuenta como ocupada
async function nombreOcupado(nombre, exceptoId = null) {
  const r = await pool.query(
    'SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) AND ($2::int IS NULL OR id <> $2)',
    [nombre, exceptoId]
  );
  return r.rows.length > 0;
}

// Reglas del nombre de usuario (registro y cambio de nombre). Devuelve el error o null.
function errorDeNombre(username) {
  if (username.length < 3 || username.length > 50) return 'El usuario debe tener entre 3 y 50 caracteres';
  if (username.includes('@')) return 'Usa un apodo, no tu correo';
  // Letras (con tildes, ñ y ü), números, espacio, punto, guion y guion bajo.
  // Así no se cuelan etiquetas HTML ni caracteres invisibles para suplantar a alguien.
  if (!/^[\p{L}\p{N}._\- ]+$/u.test(username)) return 'Usa solo letras, números, espacios, punto, guion o guion bajo';
  return null;
}

// bcrypt solo considera los primeros 72 bytes de la contraseña
function errorDeContrasena(password) {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (Buffer.byteLength(password, 'utf8') > 72) return 'La contraseña es demasiado larga (máximo 72 caracteres)';
  return null;
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

// ---------- CORREO ----------
// Los correos se envían con la API de Brevo (plan gratuito, 300 al día).
// Sin BREVO_API_KEY no se pide correo a nadie: así, publicar este código antes de
// configurar Brevo no deja a nadie bloqueado. CORREO_PRUEBA=true (solo desarrollo)
// muestra los códigos en el registro del servidor en vez de enviarlos.
const CORREO_PRUEBA = process.env.CORREO_PRUEBA === 'true';
const CORREO_DISPONIBLE = !!(process.env.BREVO_API_KEY && process.env.CORREO_REMITENTE) || CORREO_PRUEBA;
const MINUTOS_CODIGO = 15;
const INTENTOS_CODIGO = 5;

function normalizarCorreo(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function correoValido(email) {
  return email.length <= 254 && /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(email);
}

// Código de 6 dígitos. Se guarda solo su huella, nunca el código.
function nuevoCodigo() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}
function huellaCodigo(codigo) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(String(codigo)).digest('hex');
}
function mismoCodigo(codigo, huella) {
  const a = Buffer.from(huellaCodigo(codigo), 'hex');
  const b = Buffer.from(huella, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function enviarCorreo(para, asunto, texto) {
  if (CORREO_PRUEBA && !process.env.BREVO_API_KEY) {
    console.log(`[correo de prueba] Para: ${para} · ${asunto}\n${texto}`);
    return;
  }
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Kimanke', email: process.env.CORREO_REMITENTE },
      to: [{ email: para }],
      subject: asunto,
      textContent: texto
    })
  });
  if (!r.ok) throw new Error(`Brevo respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

// Crea un código nuevo (anula los anteriores del mismo tipo) y lo envía
async function enviarCodigo(userId, proposito, email, nombre) {
  const codigo = nuevoCodigo();
  await pool.query('DELETE FROM codigos_correo WHERE user_id = $1 AND proposito = $2', [userId, proposito]);
  await pool.query(
    `INSERT INTO codigos_correo (user_id, proposito, email, codigo_hash, expira)
     VALUES ($1, $2, $3, $4, now() + make_interval(mins => $5))`,
    [userId, proposito, email, huellaCodigo(codigo), MINUTOS_CODIGO]
  );
  const motivo = proposito === 'verificar'
    ? 'Para confirmar este correo en tu cuenta de Kimanke, escribe este código en la app:'
    : 'Pediste recuperar tu contraseña de Kimanke. Escribe este código en la app para elegir una nueva:';
  await enviarCorreo(email, `Tu código de Kimanke: ${codigo}`,
    `Mari mari, ${nombre}.\n\n${motivo}\n\n${codigo}\n\nVence en ${MINUTOS_CODIGO} minutos. ` +
    'Si no lo pediste tú, ignora este correo: tu cuenta sigue segura.\n\nKimanke');
}

// Revisa un código. Devuelve la fila si es correcto; si no, suma un intento.
async function revisarCodigo(userId, proposito, codigo) {
  const r = await pool.query(
    `SELECT * FROM codigos_correo
     WHERE user_id = $1 AND proposito = $2 AND expira > now() AND intentos < $3
     ORDER BY creado DESC LIMIT 1`,
    [userId, proposito, INTENTOS_CODIGO]
  );
  const fila = r.rows[0];
  if (!fila) return { error: 'El código venció o ya no es válido. Pide uno nuevo.' };
  if (!/^\d{6}$/.test(String(codigo ?? '')) || !mismoCodigo(codigo, fila.codigo_hash)) {
    await pool.query('UPDATE codigos_correo SET intentos = intentos + 1 WHERE id = $1', [fila.id]);
    const quedan = INTENTOS_CODIGO - fila.intentos - 1;
    return { error: quedan > 1 ? `Código incorrecto. Te quedan ${quedan} intentos.` : quedan === 1 ? 'Código incorrecto. Te queda 1 intento.' : 'Código incorrecto. Pide uno nuevo.' };
  }
  await pool.query('DELETE FROM codigos_correo WHERE user_id = $1 AND proposito = $2', [userId, proposito]);
  return { fila };
}

// ---------- AUTENTICACIÓN ----------
function crearToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sesión no iniciada' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); // { id, username }
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
  const errorNombre = errorDeNombre(username);
  if (errorNombre) return res.status(400).json({ error: errorNombre });
  const errorClave = errorDeContrasena(password);
  if (errorClave) return res.status(400).json({ error: errorClave });

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
    res.json({ ...user, tiene_correo: false, correo_requerido: CORREO_DISPONIBLE, token: crearToken(user) });
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
  const errorNombre = errorDeNombre(nombre);
  if (errorNombre) return res.json({ disponible: false, sugerencias: [], error: errorNombre });
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
      tiene_correo: !!user.email,
      correo_requerido: CORREO_DISPONIBLE,
      token: crearToken(user)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ---------- RECUPERAR LA CONTRASEÑA ----------
// Se busca por nombre de usuario o por correo. La respuesta es siempre la misma,
// exista o no la cuenta, para no revelar quién usa Kimanke.
app.post('/api/recuperar/pedir', limiteCodigos, async (req, res) => {
  const dato = typeof req.body.usuario === 'string' ? req.body.usuario.trim() : '';
  if (dato.length < 3 || dato.length > 254) return res.status(400).json({ error: 'Escribe tu usuario o tu correo' });
  const respuesta = { ok: true, mensaje: 'Si existe una cuenta con ese usuario o correo, te enviamos un código. Revisa también la carpeta de spam.' };
  if (!CORREO_DISPONIBLE) return res.status(503).json({ error: 'La recuperación por correo todavía no está disponible.' });
  try {
    const r = await pool.query(
      `SELECT id, username, email FROM users
       WHERE email IS NOT NULL AND (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1))
       LIMIT 1`,
      [dato]
    );
    const user = r.rows[0];
    if (user) {
      // Un código por minuto como máximo para la misma cuenta
      const reciente = await pool.query(
        `SELECT 1 FROM codigos_correo WHERE user_id = $1 AND proposito = 'recuperar' AND creado > now() - interval '1 minute'`,
        [user.id]
      );
      if (reciente.rows.length === 0) await enviarCodigo(user.id, 'recuperar', user.email, user.username);
    }
    res.json(respuesta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No pudimos enviar el código. Inténtalo más tarde.' });
  }
});

app.post('/api/recuperar/cambiar', limiteLogin, async (req, res) => {
  const { codigo, password } = req.body;
  const dato = typeof req.body.usuario === 'string' ? req.body.usuario.trim() : '';
  if (!dato || typeof password !== 'string') return res.status(400).json({ error: 'Datos inválidos' });
  const errorClave = errorDeContrasena(password);
  if (errorClave) return res.status(400).json({ error: errorClave });
  try {
    const r = await pool.query(
      `SELECT id FROM users
       WHERE email IS NOT NULL AND (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1))
       LIMIT 1`,
      [dato]
    );
    if (r.rows.length === 0) return res.status(400).json({ error: 'El código venció o ya no es válido. Pide uno nuevo.' });
    const revision = await revisarCodigo(r.rows[0].id, 'recuperar', codigo);
    if (revision.error) return res.status(400).json({ error: revision.error });

    const hash = await bcrypt.hash(password, 10);
    const u = await pool.query(
      `UPDATE users SET password = $1 WHERE id = $2
       RETURNING id, username, avatar, xp, streak, lives, gems`,
      [hash, r.rows[0].id]
    );
    const user = u.rows[0];
    res.json({ ...user, tiene_correo: true, correo_requerido: CORREO_DISPONIBLE, token: crearToken(user) });
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

// El nombre se lee siempre de la base y no del token: así, si la persona cambió su
// nombre desde otro dispositivo, una sesión antigua sigue guardando bien el progreso.
app.use('/api', async (req, res, next) => {
  try {
    const r = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    if (r.rows.length === 0) return res.status(401).json({ error: 'Sesión expirada o inválida' });
    req.user.username = r.rows[0].username;
    next();
  } catch (err) {
    next(err);
  }
});

// Cambiar el nombre de usuario. Pide la contraseña para confirmar.
app.put('/api/username', limiteLogin, async (req, res) => {
  const { password } = req.body || {};
  let { username } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  username = username.trim();
  const errorNombre = errorDeNombre(username);
  if (errorNombre) return res.status(400).json({ error: errorNombre });

  try {
    const found = await pool.query('SELECT password, avatar FROM users WHERE id = $1', [req.user.id]);
    if (found.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!(await bcrypt.compare(password, found.rows[0].password))) {
      return res.status(403).json({ error: 'Contraseña incorrecta' });
    }
    if (await nombreOcupado(username, req.user.id)) {
      return res.status(409).json({
        error: 'Ese nombre ya está en uso',
        sugerencias: await sugerirNombres(username, found.rows[0].avatar)
      });
    }
    const result = await pool.query(
      'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, avatar, xp, streak, lives, gems',
      [username, req.user.id]
    );
    const user = result.rows[0];
    res.json({ ...user, token: crearToken(user) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ese nombre ya está en uso', sugerencias: [] });
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ---------- CORREO DE LA CUENTA ----------
// Paso 1: la persona escribe su correo y le llega un código
app.post('/api/correo/enviar', limiteCodigos, async (req, res) => {
  const email = normalizarCorreo(req.body.email);
  if (!correoValido(email)) return res.status(400).json({ error: 'Revisa el correo: parece que está mal escrito' });
  if (!CORREO_DISPONIBLE) return res.status(503).json({ error: 'El envío de correos todavía no está disponible.' });
  try {
    const usado = await pool.query('SELECT 1 FROM users WHERE LOWER(email) = $1 AND id <> $2', [email, req.user.id]);
    if (usado.rows.length) return res.status(409).json({ error: 'Ese correo ya está en otra cuenta de Kimanke' });
    await enviarCodigo(req.user.id, 'verificar', email, req.user.username);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No pudimos enviar el código. Revisa el correo o inténtalo más tarde.' });
  }
});

// Paso 2: con el código correcto, el correo queda guardado en la cuenta
app.post('/api/correo/verificar', limiteLogin, async (req, res) => {
  try {
    const revision = await revisarCodigo(req.user.id, 'verificar', req.body.codigo);
    if (revision.error) return res.status(400).json({ error: revision.error });
    await pool.query('UPDATE users SET email = $1 WHERE id = $2', [revision.fila.email, req.user.id]);
    res.json({ ok: true, tiene_correo: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ese correo ya está en otra cuenta de Kimanke' });
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

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
  const unitId = Number(req.query.unitId);
  const stage = req.query.stage !== undefined ? Number(req.query.stage) : null;

  if (!esId(unitId) || (stage !== null && !esId(stage))) {
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
        (email IS NOT NULL) AS tiene_correo, $2::boolean AS correo_requerido,
        CASE
          WHEN last_played::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date - 1
            THEN streak
          ELSE 0
        END AS streak
        FROM users WHERE id = $1`,
      [req.user.id, CORREO_DISPONIBLE]
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

// ¿Puede esta persona jugar esta etapa? Misma regla que el mapa: la primera unidad
// está abierta; una unidad se abre al completar todas las etapas de la anterior;
// y dentro de la unidad, una etapa se abre al completar la anterior.
async function etapaDisponible(client, username, unitId, stage) {
  const visibles = await client.query(
    `SELECT DISTINCT unit_id, stage FROM exercises WHERE ${soloAprobado()} ORDER BY unit_id, stage`
  );
  const hechas = await client.query(
    'SELECT unit_id, stage FROM user_progress WHERE username = $1 AND completed',
    [username]
  );
  const completa = new Set(hechas.rows.map(r => `${r.unit_id}-${r.stage}`));
  if (completa.has(`${unitId}-${stage}`)) return true;          // repetir siempre se puede

  const unidades = [...new Set(visibles.rows.map(r => r.unit_id))];
  const i = unidades.indexOf(unitId);
  if (i < 0) return false;
  if (i > 0) {
    const anterior = unidades[i - 1];
    const etapasAnterior = visibles.rows.filter(r => r.unit_id === anterior);
    if (!etapasAnterior.every(r => completa.has(`${anterior}-${r.stage}`))) return false;
  }
  const hayAnterior = visibles.rows.some(r => r.unit_id === unitId && r.stage === stage - 1);
  return !hayAnterior || completa.has(`${unitId}-${stage - 1}`);
}

app.post('/api/lessons/complete', limiteCompletar, async (req, res) => {
  const { unitId, stage, correct } = req.body;
  if (!esId(unitId) || !esId(stage) || !Number.isInteger(correct) || correct < 0) {
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
    if (!(await etapaDisponible(client, req.user.username, unitId, stage))) {
      return res.status(403).json({ error: 'Esta etapa todavía está bloqueada' });
    }

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

// Cada vez que se pide un repaso se anota cuántas preguntas se entregaron. Al
// terminarlo, los aciertos se limitan a ese número y la sesión se usa una sola vez,
// así no se puede sumar Kimün enviando «repaso terminado» sin haber repasado.
// Vive en memoria: si el servidor se reinicia a mitad de un repaso, ese repaso no
// suma Kimün, pero sí cuenta para la racha.
const sesionesRepaso = new Map(); // id de usuario -> { preguntas, hasta }
const MS_SESION_REPASO = 2 * 60 * 60 * 1000;

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
    if (result.rows.length) {
      sesionesRepaso.set(req.user.id, { preguntas: result.rows.length, hasta: Date.now() + MS_SESION_REPASO });
    }
    res.json({ total, ejercicios: result.rows.map(({ total, ...e }) => e) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar el repaso' });
  }
});

// Terminar un repaso: suma Kimün y cuenta para la racha, sin Llankas
app.post('/api/repaso/completar', limiteCompletar, async (req, res) => {
  const { correct } = req.body || {};
  if (!Number.isInteger(correct) || correct < 0) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  const sesion = sesionesRepaso.get(req.user.id);
  sesionesRepaso.delete(req.user.id);
  const valida = sesion && sesion.hasta > Date.now();
  const aciertos = valida ? Math.min(correct, sesion.preguntas) : 0;
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