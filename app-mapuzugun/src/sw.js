// Service worker de Kimanke: solo muestra los avisos web (recordatorio y novedades).
// No guarda la app en caché ni intercepta peticiones.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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
