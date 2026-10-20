require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');

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

// RUTA DE REGISTRO
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Asignamos 5 vidas y 500 gemas por defecto
    const newUser = await pool.query(
      'INSERT INTO users (username, password, xp, streak, lives, gems) VALUES ($1, $2, 120, 3, 5, 500) RETURNING id, username, xp, streak, lives, gems',
      [username, hashedPassword]
    );

    res.json(newUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// RUTA DE LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

    // Devolvemos las vidas y gemas
    res.json({
      id: user.id,
      username: user.username,
      xp: user.xp,
      streak: user.streak,
      lives: user.lives,
      gems: user.gems
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// NUEVA RUTA: Restar una vida al fallar
app.post('/api/lose-life', async (req, res) => {
  const { username } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET lives = GREATEST(lives - 1, 0) WHERE username = $1 RETURNING lives, gems',
      [username]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

// --- RUTAS ANTERIORES ---
app.get('/api/units', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM units ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener las unidades' });
  }
});

app.get('/api/exercises', async (req, res) => {
  try {
    const { unitId } = req.query;
    let query = 'SELECT * FROM exercises';
    let params = [];
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

app.get('/api/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query('SELECT id, username, xp, streak, lives, gems FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

app.post('/api/update-xp', async (req, res) => {
  const { username, xp } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET xp = $1 WHERE username = $2 RETURNING *',
      [xp, username]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

// NUEVA RUTA: Comprar vidas con gemas
app.post('/api/buy-lives', async (req, res) => {
  const { username } = req.body;
  const costoGemas = 100;

  try {
    // Verificar si tiene suficientes gemas
    const userRes = await pool.query('SELECT gems FROM users WHERE username = $1', [username]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    if (userRes.rows[0].gems < costoGemas) {
      return res.status(400).json({ error: 'No tienes suficientes gemas' });
    }

    // Restar gemas y recargar las 5 vidas
    const updateRes = await pool.query(
      'UPDATE users SET gems = gems - $1, lives = 5 WHERE username = $2 RETURNING lives, gems',
      [costoGemas, username]
    );
    
    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// GUARDAR PROGRESO DE UNA UNIDAD
app.post('/api/progress', async (req, res) => {
  const { username, unitId, score } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO user_progress (username, unit_id, completed, score)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (username, unit_id) 
       DO UPDATE SET completed = true, 
                     score = GREATEST(user_progress.score, $3),
                     completed_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [username, unitId, score]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar progreso' });
  }
});

// OBTENER PROGRESO DE UN USUARIO
app.get('/api/progress/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(
      'SELECT * FROM user_progress WHERE username = $1',
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

// PRACTICAR PARA GANAR UNA VIDA
app.post('/api/earn-life', async (req, res) => {
  const { username } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET lives = LEAST(lives + 1, 5) WHERE username = $1 RETURNING lives, gems',
      [username]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al ganar vida' });
  }
});

// REGENERACIÓN POR TIEMPO (cada 10 minutos = 1 vida, máx 5)
app.post('/api/regen-lives', async (req, res) => {
  const { username } = req.body;
  try {
    const userRes = await pool.query('SELECT lives, last_life_regen FROM users WHERE username = $1', [username]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = userRes.rows[0];
    const minutesSinceLast = (Date.now() - new Date(user.last_life_regen).getTime()) / 60000;
    const livesToAdd = Math.floor(minutesSinceLast / 10); // 1 vida cada 10 minutos

    if (livesToAdd > 0 && user.lives < 5) {
      const newLives = Math.min(user.lives + livesToAdd, 5);
      const updateRes = await pool.query(
        'UPDATE users SET lives = $1, last_life_regen = CURRENT_TIMESTAMP WHERE username = $2 RETURNING lives',
        [newLives, username]
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