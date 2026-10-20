const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURACIÓN DE TU BASE DE DATOS POSTGRESQL
const pool = new Pool({
  user: 'postgres',          
  host: 'localhost',
  database: 'mapuzugun_db',  
  password: 'Casa0025', // ¡Asegúrate de que tu contraseña siga aquí!
  port: 5432,
});

// NUEVA RUTA: Obtener la lista de unidades disponibles para el menú
app.get('/api/units', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM units ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las unidades' });
  }
});

// RUTA MODIFICADA: Obtener ejercicios (filtrados por unidad si se envía el parámetro)
app.get('/api/exercises', async (req, res) => {
  try {
    const { unitId } = req.query;
    let query = 'SELECT * FROM exercises';
    let params = [];

    // Si el frontend envía un unitId (ej: ?unitId=1), filtramos
    if (unitId) {
      query += ' WHERE unit_id = $1';
      params.push(unitId);
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

// Ruta para obtener usuario (ya la tenías)
app.get('/api/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

// Ruta para actualizar XP (ya la tenías)
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
    console.error(err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

app.listen(3000, () => {
  console.log('✅ Backend corriendo en http://localhost:3000');
});