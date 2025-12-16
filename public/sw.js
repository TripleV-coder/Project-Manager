/**
 * Service Worker pour PM - Gestion de Projets
 * Gère les notifications push et le cache offline
 */

const CACHE_NAME = 'pm-cache-v1';
const OFFLINE_URL = '/offline.html';

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching offline page');
      return cache.addAll([
        '/',
        '/login',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png'
      ]).catch(err => {
        console.warn('[SW] Cache addAll failed:', err);
      });
    })
  );

  // Activer immédiatement
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'PM - Notification',
    body: 'Vous avez une nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge.png'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.warn('[SW] Failed to parse push data:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge.png',
    tag: data.tag || `pm-notification-${Date.now()}`,
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    timestamp: data.timestamp || Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  // Si l'action est "dismiss", ne rien faire
  if (event.action === 'dismiss') {
    return;
  }

  // URL à ouvrir (par défaut: dashboard)
  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Chercher une fenêtre déjà ouverte
        for (const client of clientList) {
          if (client.url.includes('/dashboard') && 'focus' in client) {
            // Naviguer vers l'URL et focus
            client.navigate(urlToOpen);
            return client.focus();
          }
        }

        // Sinon ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Fermeture de notification
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');

  // Optionnel: envoyer une analytique
  // fetch('/api/analytics/notification-closed', { ... });
});

// Gestion des fetch pour le mode offline (optionnel)
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les requêtes API
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Pour les navigations, essayer le réseau d'abord
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL) || caches.match('/');
        })
    );
    return;
  }

  // Pour les autres ressources, cache first
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

// Sync en arrière-plan (pour les actions offline)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Synchroniser les notifications en attente
      Promise.resolve()
    );
  }
});

// Message du client
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded');
