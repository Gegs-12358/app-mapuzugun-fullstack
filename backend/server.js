const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURACIÓN DE TU BASE DE DATOS POSTGRESQL
const pool = new Pool({
  user: 'postgres',          // Tu usuario de pgAdmin (por defecto es postgres)
  host: 'localhost',
  database: 'mapuzugun_db',  // El nombre que le diste a tu BD
  password: 'Casa0025', // ¡CAMBIA ESTO POR TU CONTRASEÑA DE PgAdmin!
  port: 5432,
});

// Ruta para obtener el primer ejercicio
app.get('/api/exercises', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM exercises ORDER BY id');
    if (result.rows.length === 0) return res.status(404).json({ error: 'No hay ejercicios' });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

app.listen(3000, () => {
  console.log('✅ Backend corriendo en http://localhost:3000');
});

// Ruta para obtener los datos del usuario (XP, racha)
app.get('/api/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

// Ruta para actualizar el XP del usuario
app.post('/api/update-xp', async (req, res) => {
  const { username, xp } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE users SET xp = $1 WHERE username = $2 RETURNING *',
      [xp, username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});
