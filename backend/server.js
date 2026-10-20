require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
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
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Datos inválidos' });
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
      'INSERT INTO users (username, password, xp, streak, lives, gems) VALUES ($1, $2, 120, 3, 5, 500) RETURNING id, username, xp, streak, lives, gems',
      [username, hashedPassword]
    );

    const user = newUser.rows[0];
    res.json({ ...user, token: crearToken(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    // Mismo mensaje si falla el usuario o la contraseña
    const valid = user && await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    res.json({
      id: user.id,
      username: user.username,
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
    res.status(500).json({ error: 'Error al obtener las unidades' });
  }
});

// ---------- RUTAS PROTEGIDAS ----------
// De aquí en adelante hace falta token. El usuario sale del token,
// no del cuerpo de la petición.
app.use('/api', requireAuth);

app.get('/api/exercises', async (req, res) => {
  try {
    const { unitId } = req.query;
    let query = 'SELECT * FROM exercises';
    const params = [];
    if (unitId) {
      query += ' WHERE unit_id = $1';
      params.push(unitId);
    }
    query += ' ORDER BY id';
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No hay ejercicios' });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

// El parámetro :username se mantiene para no tocar el frontend,
// pero se ignora: siempre responde con el usuario del token.
app.get('/api/user/:username', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, xp, streak, lives, gems FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
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

// OJO: este endpoint sigue aceptando el xp del cliente. Se corrige en el paso 3.
app.post('/api/update-xp', async (req, res) => {
  const { xp } = req.body;
  if (!Number.isInteger(xp) || xp < 0) {
    return res.status(400).json({ error: 'XP inválido' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET xp = $1 WHERE id = $2 RETURNING id, username, xp, streak, lives, gems',
      [xp, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
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

app.post('/api/progress', async (req, res) => {
  const { unitId, score } = req.body;
  if (!Number.isInteger(unitId) || !Number.isInteger(score) || score < 0) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO user_progress (username, unit_id, completed, score)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (username, unit_id)
       DO UPDATE SET completed = true,
                     score = GREATEST(user_progress.score, $3),
                     completed_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.username, unitId, score]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar progreso' });
  }
});

app.get('/api/progress/:username', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_progress WHERE username = $1',
      [req.user.username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

app.post('/api/earn-life', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET lives = LEAST(lives + 1, 5) WHERE id = $1 RETURNING lives, gems',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
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
    const livesToAdd = Math.floor(minutesSinceLast / 10);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});