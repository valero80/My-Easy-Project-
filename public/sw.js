// Self-healing Service Worker to clear any stale Workbox precache that could block preview rendering
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.includes('workbox') || k.includes('precache'))
            .map((k) => caches.delete(k))
        );
      } catch {
        // ignore cache cleanup errors
      }
      try {
        await self.registration.unregister();
      } catch {
        // ignore unregister errors
      }
      try {
        const clientsList = await self.clients.matchAll({ type: 'window' });
        for (const client of clientsList) {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        }
      } catch {
        // ignore navigation errors
      }
    })()
  );
});
