// Avisos web (notificaciones push del navegador).
// - Recordatorio diario: a la hora que eligió la persona, si ese día no ha practicado.
// - Novedades: cuando se agregan mejoras a la app, solo a quien aceptó recibirlas.
// Los envía el servidor cuando lo llama una tarea programada (cron-job.org) con
// un secreto. Si faltan las claves VAPID, los avisos quedan apagados y la app
// funciona igual.
const webpush = require('web-push');
const crypto = require('crypto');

const PUBLICA = process.env.VAPID_PUBLIC_KEY || '';
const PRIVADA = process.env.VAPID_PRIVATE_KEY || '';
const CONTACTO = process.env.VAPID_CONTACTO || 'mailto:kimankeapp@gmail.com';
const SECRETO = process.env.AVISOS_SECRETO || '';
const DISPONIBLE = !!(PUBLICA && PRIVADA);
if (DISPONIBLE) webpush.setVapidDetails(CONTACTO, PUBLICA, PRIVADA);

const NOMBRES = {
  puma: 'Pangipol', aguila: 'Manketor', bandurria: 'Rakyfar',
  monito: 'Teutimos', pudu: 'Pudimel', ranita: 'Rinodar',
};

function mensajeRecordatorio(avatar) {
  const nombre = NOMBRES[avatar] || 'Tu compañero';
  const textos = [
    `${nombre} te espera. ¿Practicamos unos minutos?`,
    `¡Mari mari! ${nombre} tiene una lección lista para ti.`,
    'Un ratito de mapuzugun hoy mantiene encendido tu Kütral.',
    `${nombre} quiere aprender contigo hoy. ¡Amulepe!`,
  ];
  return textos[new Date().getDate() % textos.length];
}

function secretoValido(req) {
  const dado = String(req.get('x-avisos-secreto') || '');
  if (!SECRETO || dado.length !== SECRETO.length) return false;
  return crypto.timingSafeEqual(Buffer.from(dado), Buffer.from(SECRETO));
}

async function prepararTablas(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_suscripciones (
      id                  SERIAL PRIMARY KEY,
      user_id             INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint            TEXT NOT NULL UNIQUE,
      p256dh              TEXT NOT NULL,
      auth                TEXT NOT NULL,
      recordatorio        BOOLEAN NOT NULL DEFAULT false,
      hora                TEXT NOT NULL DEFAULT '19:00',
      novedades           BOOLEAN NOT NULL DEFAULT false,
      ultimo_recordatorio DATE,
      actualizado         TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
}

// Envía a una suscripción; si el navegador ya no la acepta (404/410), se borra
async function enviar(pool, fila, datos) {
  try {
    await webpush.sendNotification(
      { endpoint: fila.endpoint, keys: { p256dh: fila.p256dh, auth: fila.auth } },
      JSON.stringify(datos),
      { TTL: 6 * 60 * 60 }
    );
    return true;
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`Suscripción vencida (${err.statusCode}), se borra`);
      await pool.query('DELETE FROM push_suscripciones WHERE id = $1', [fila.id]);
    } else {
      console.error('Aviso no enviado:', err.statusCode || '', String(err.body || err.message).slice(0, 200));
    }
    return false;
  }
}

// Rutas públicas (antes de requireAuth): la clave pública y las que llama la tarea programada
function rutasPublicas(app, pool) {
  app.get('/api/push/clave', (req, res) => {
    res.json({ disponible: DISPONIBLE, clave: PUBLICA });
  });

  // Recordatorios del día: se llama cada 15 minutos. Manda a quien ya llegó a su
  // hora, no recibió el de hoy y no ha practicado hoy (hora de Chile).
  app.post('/api/avisos/recordatorios', async (req, res) => {
    if (!secretoValido(req)) return res.status(403).json({ error: 'No autorizado' });
    if (!DISPONIBLE) return res.json({ enviados: 0, motivo: 'Faltan las claves VAPID' });
    try {
      const r = await pool.query(`
        SELECT s.*, u.avatar
        FROM push_suscripciones s JOIN users u ON u.id = s.user_id
        WHERE s.recordatorio
          AND s.hora <= to_char(now() AT TIME ZONE 'America/Santiago', 'HH24:MI')
          AND (s.ultimo_recordatorio IS NULL OR s.ultimo_recordatorio < (now() AT TIME ZONE 'America/Santiago')::date)
          AND (u.last_played IS NULL OR u.last_played::date < (now() AT TIME ZONE 'America/Santiago')::date)`);
      let enviados = 0;
      for (const fila of r.rows) {
        // Se marca antes de enviar, para no mandar dos veces si la tarea se repite
        await pool.query(
          `UPDATE push_suscripciones SET ultimo_recordatorio = (now() AT TIME ZONE 'America/Santiago')::date WHERE id = $1`,
          [fila.id]);
        if (await enviar(pool, fila, { title: 'Kimanke', body: mensajeRecordatorio(fila.avatar), url: '/units' })) enviados++;
      }
      res.json({ enviados, revisados: r.rows.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al enviar recordatorios' });
    }
  });

  // Novedades: avisa de mejoras a quien aceptó recibirlas
  app.post('/api/avisos/novedad', async (req, res) => {
    if (!secretoValido(req)) return res.status(403).json({ error: 'No autorizado' });
    if (!DISPONIBLE) return res.json({ enviados: 0, motivo: 'Faltan las claves VAPID' });
    const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim().slice(0, 60) : '';
    const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim().slice(0, 200) : '';
    if (!titulo || !texto) return res.status(400).json({ error: 'Faltan titulo y texto' });
    try {
      const r = await pool.query('SELECT * FROM push_suscripciones WHERE novedades');
      let enviados = 0;
      for (const fila of r.rows) {
        if (await enviar(pool, fila, { title: titulo, body: texto, url: '/units' })) enviados++;
      }
      res.json({ enviados, suscritos: r.rows.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al enviar la novedad' });
    }
  });
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Rutas con sesión: guardar o borrar la suscripción de este navegador
function rutasProtegidas(app, pool) {
  app.post('/api/push/suscripcion', async (req, res) => {
    const { suscripcion, recordatorio, hora, novedades } = req.body || {};
    const endpoint = suscripcion?.endpoint;
    const p256dh = suscripcion?.keys?.p256dh;
    const auth = suscripcion?.keys?.auth;
    const textoValido = (t, max) => typeof t === 'string' && t.length > 0 && t.length <= max;
    if (!textoValido(endpoint, 1000) || !/^https:\/\//.test(endpoint) || !textoValido(p256dh, 200) || !textoValido(auth, 100)
        || typeof recordatorio !== 'boolean' || typeof novedades !== 'boolean' || !HORA.test(hora ?? '')) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    try {
      const r = await pool.query(`
        INSERT INTO push_suscripciones (user_id, endpoint, p256dh, auth, recordatorio, hora, novedades)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4,
          recordatorio = $5, hora = $6, novedades = $7, actualizado = now()
        RETURNING (xmax = 0) AS nueva`,
        [req.user.id, endpoint, p256dh, auth, recordatorio, hora, novedades]);
      // nueva: el servidor no la tenía (o se borró porque venció)
      res.json({ ok: true, nueva: r.rows[0].nueva });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al guardar los avisos' });
    }
  });

  app.delete('/api/push/suscripcion', async (req, res) => {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== 'string' || endpoint.length > 1000) return res.status(400).json({ error: 'Datos inválidos' });
    try {
      await pool.query('DELETE FROM push_suscripciones WHERE endpoint = $1 AND user_id = $2', [endpoint, req.user.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al borrar los avisos' });
    }
  });
}

module.exports = { prepararTablas, rutasPublicas, rutasProtegidas };
