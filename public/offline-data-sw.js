// Service Worker for Offline Essential Data Caching, Official Terminal Logo Icons & Background Push Notifications
const CACHE_NAME = 'mep-essential-data-v3';
const BRAND_ICONS_TO_PRECACHE = [
  '/manifest.webmanifest?v=3',
  '/pwa-192x192.png?v=3',
  '/pwa-512x512.png?v=3',
  '/pwa-maskable-512x512.png?v=3',
  '/apple-touch-icon.png?v=3',
  '/icon.svg?v=3',
  '/favicon.ico?v=3',
  '/assets/aistudio/1793739153965_ba98c3b0.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(BRAND_ICONS_TO_PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the main thread to cache data OR trigger background push notifications
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'CACHE_ESSENTIAL_DATA') {
    const { key, payload } = event.data;
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        const response = new Response(JSON.stringify({
          cachedAt: new Date().toISOString(),
          data: payload,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
        return cache.put(new Request(`/offline-cache/${key}`), response);
      })
    );
  }

  // Trigger a native OS / Browser Service Worker notification (works even when tab is in background)
  if (event.data.type === 'DISPATCH_SW_PUSH_NOTIFICATION' || event.data.type === 'SHOW_URGENT_NOTIFICATION') {
    const payload = event.data.payload || {};
    const title = payload.title || 'My Easy Project — Alerte Critique';
    const options = {
      body: payload.body || 'Nouvelle notification urgente reçue dans votre espace.',
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag || `mep-push-${Date.now()}`,
      renotify: true,
      requireInteraction: payload.requireInteraction !== undefined ? payload.requireInteraction : true,
      vibrate: [200, 100, 200, 100, 300],
      data: {
        url: payload.url || '/',
        targetTab: payload.targetTab || 'alerts',
        category: payload.category || 'critical_alert',
        docId: payload.docId || null,
        alertId: payload.alertId || null,
        timestamp: new Date().toISOString(),
      },
      actions: [
        { action: 'open_app', title: 'Ouvrir dans My Easy Project' },
        { action: 'acknowledge', title: 'Marquer comme lu' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Listen for Web Push API events from push servers
self.addEventListener('push', (event) => {
  let payload = {
    title: 'My Easy Project — Alerte Prioritaire',
    body: 'Une nouvelle facture urgente ou alerte critique requiert votre attention immédiate.',
    targetTab: 'alerts',
    category: 'urgent_push',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || `mep-webpush-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [250, 100, 250, 100, 400],
    data: {
      url: payload.url || '/',
      targetTab: payload.targetTab || 'alerts',
      category: payload.category || 'urgent_push',
      docId: payload.docId || null,
      alertId: payload.alertId || null,
      timestamp: new Date().toISOString(),
    },
    actions: [
      { action: 'open_app', title: 'Consulter maintenant' },
      { action: 'acknowledge', title: 'Acquitter' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Handle user clicks on the Service Worker push notification
self.addEventListener('notificationclick', (event) => {
  const notificationData = event.notification.data || {};
  const action = event.action || 'open_app';
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'SW_NOTIFICATION_CLICKED',
            action,
            payload: notificationData,
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(notificationData.url || '/');
      }
    })
  );
});

// Intercept requests to /offline-cache/* and return cached JSON
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/offline-cache/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) return response;
          return new Response(JSON.stringify({ error: 'Not found in offline cache' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        });
      })
    );
  }
});
