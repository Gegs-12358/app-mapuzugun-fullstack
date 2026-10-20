const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',          
  host: 'localhost',
  database: 'mapuzugun_db',  
  password: 'Casa0025', // ¡Asegúrate de poner tu contraseña!
  port: 5432,
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

app.listen(3000, () => {
  console.log('✅ Backend corriendo en http://localhost:3000');
});