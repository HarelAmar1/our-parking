import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; }
  catch { payload = { title: 'החניה שלנו', body: event.data?.text() || '' }; }
  event.waitUntil(self.registration.showNotification(payload.title || 'החניה שלנו', {
    body: payload.body || 'החניה עודכנה',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'parking-available',
    data: { url: '/' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const win of windows) {
      if (new URL(win.url).origin === self.location.origin) return win.focus();
    }
    return self.clients.openWindow('/');
  })());
});
