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
    badge: '/assets/icon/icon-192.png',
    lang: 'es',
    data: { url: datos.url || '/units' },
  }));
});

// Al tocar el aviso: si la app ya está abierta, se trae al frente; si no, se abre
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/units';
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const v of ventanas) {
      if ('focus' in v) { await v.focus(); if ('navigate' in v) { try { await v.navigate(url); } catch (e) {} } return; }
    }
    await self.clients.openWindow(url);
  })());
});
