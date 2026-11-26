// Service worker de Kimanke.
// 1) Avisos web (recordatorio y novedades).
// 2) Sin internet: guarda la app y lo que ya se abrió (mapa, lecciones, palabras)
//    para seguir practicando sin conexión. El avance hecho sin conexión lo guarda
//    la app y lo envía al volver internet (ver src/app/pendientes.ts).
const ESTATICOS = 'kimanke-estaticos-v1';
const DATOS = 'kimanke-datos-v1';
const RUTAS_API = /^\/api\/(units|stages|exercises|user|repaso|mis-palabras)\b/;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(ESTATICOS).then(c => c.add(new Request('/index.html', { cache: 'reload' }))).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const guardar = [ESTATICOS, DATOS];
    for (const nombre of await caches.keys()) if (!guardar.includes(nombre)) await caches.delete(nombre);
    await self.clients.claim();
  })());
});

// La app pide borrar lo guardado al cerrar sesión (los datos son de esa cuenta)
self.addEventListener('message', (event) => {
  if (event.data === 'borrar-datos') event.waitUntil(caches.delete(DATOS));
});

async function primeroLaRed(request, cacheName, respaldo) {
  try {
    const respuesta = await fetch(request);
    if (respuesta.ok) {
      const cache = await caches.open(cacheName);
      cache.put(respaldo || request, respuesta.clone());
    }
    return respuesta;
  } catch (err) {
    const guardada = await caches.match(respaldo || request, { ignoreVary: true });
    if (guardada) return guardada;
    throw err;
  }
}

async function guardadoYActualizar(request) {
  const cache = await caches.open(ESTATICOS);
  const guardada = await cache.match(request);
  const red = fetch(request).then(r => { if (r.ok) cache.put(request, r.clone()); return r; }).catch(() => null);
  return guardada || (await red) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname === '/sw.js') return;
    // Las pantallas de la app: siempre la última versión; sin red, la guardada
    if (request.mode === 'navigate') {
      event.respondWith(primeroLaRed(request, ESTATICOS, '/index.html'));
      return;
    }
    // Código, estilos, imágenes y fuentes: lo guardado al tiro, y se actualiza por detrás
    event.respondWith(guardadoYActualizar(request));
    return;
  }

  // Datos del servidor que sirven para jugar sin conexión
  if (url.pathname.startsWith('/api/') && RUTAS_API.test(url.pathname)) {
    event.respondWith(primeroLaRed(request, DATOS));
  }
});

self.addEventListener('push', (event) => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; } catch (e) { datos = { body: event.data && event.data.text() }; }
  const titulo = datos.title || 'Kimanke';
  event.waitUntil(self.registration.showNotification(titulo, {
    body: datos.body || '',
    icon: '/assets/icon/icon-192.png',
    badge: '/assets/icon/badge-96.png',   // silueta blanca: Android pinta este ícono de un solo color
    lang: 'es',
    data: { url: datos.url || '/units', texto: datos.body || '' },
  }));
});

// Al tocar el aviso: si la app ya está abierta, se trae al frente; si no, se abre
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const datos = event.notification.data || {};
  // El mensaje viaja en la dirección para que el compañero lo repita en el mapa
  let url = datos.url || '/units';
  if (datos.texto) url += (url.includes('?') ? '&' : '?') + 'aviso=' + encodeURIComponent(datos.texto);
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const v of ventanas) {
      if ('focus' in v) { await v.focus(); if ('navigate' in v) { try { await v.navigate(url); } catch (e) {} } return; }
    }
    await self.clients.openWindow(url);
  })());
});
