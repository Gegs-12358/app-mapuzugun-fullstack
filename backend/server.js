const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt'); // <-- Nueva librería

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',          
  host: 'localhost',
  database: 'mapuzugun_db',  
  password: 'Casa0025', // ¡Pon tu contraseña real aquí!
  port: 5432,
});

// RUTA DE REGISTRO
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Verificar si el usuario ya existe
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const newUser = await pool.query(
      'INSERT INTO users (username, password, xp, streak) VALUES ($1, $2, 120, 3) RETURNING id, username, xp, streak',
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
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    
    // Comparar contraseña ingresada con la encriptada
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Devolver datos del usuario (sin la contraseña)
    res.json({
      id: user.id,
      username: user.username,
      xp: user.xp,
      streak: user.streak
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// --- RUTAS ANTERIORES (Se mantienen igual) ---
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
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
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

app.listen(3000, () => {
  console.log('✅ Backend corriendo en http://localhost:3000');
});