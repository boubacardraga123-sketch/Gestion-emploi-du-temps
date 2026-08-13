// Service worker MEPUA — installation + fonctionnement hors-ligne basique
const CACHE_NAME = 'mepua-cache-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-180.png',
  './icon-512.png'
];

// Installation : met en cache les fichiers de base de l'application
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activation : nettoie les anciens caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Stratégie : réseau d'abord, puis cache en secours (pour les fichiers de l'app)
// Les requêtes vers Firestore/Firebase/API externes ne sont jamais interceptées.
self.addEventListener('fetch', function (event) {
  var url = event.request.url;

  // Ne pas intercepter les appels réseau externes (Firebase, CDN dynamique, etc.)
  if (event.request.method !== 'GET' || url.indexOf(self.location.origin) !== 0) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
