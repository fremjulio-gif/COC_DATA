/**
 * CoC Freemium Optimizer — Service Worker
 * Stratégie : Cache-First (App Shell) & Stale-While-Revalidate (Données)
 * Fonctionne 100% hors-ligne après le premier chargement.
 */

const CACHE_NAME = 'coc-optimizer-shell-v1';
const DATA_CACHE_NAME = 'coc-optimizer-data-v1';

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/css/tokens.css',
  '/css/base.css',
  '/css/components.css',
  '/css/views.css',
  '/js/app.js',
  '/js/router.js',
  '/js/store.js',
  '/js/i18n.js',
  '/js/coc_data.js',
  '/js/analysis.js',
  '/js/advice.js',
  '/js/sync.js',
  '/js/charts.js',
  '/data/townhall_caps.json',
  '/data/upgrade_costs.json',
  '/data/advice_rules.json',
  '/data/glossary.fr.json',
  '/i18n/fr.json',
  '/vendor/chart.umd.min.js',
  '/vendor/qrious.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Precache tout ce qui est déjà disponible, sans échouer si un fichier manque encore pendant le dev
      return Promise.allSettled(
        APP_SHELL_ASSETS.map((url) =>
          fetch(url).then((res) => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Requêtes API : Stale-While-Revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            if (response.ok && request.method === 'GET') {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cache.match(request));
      })
    );
    return;
  }

  // App Shell & Fichiers Statiques : Cache-First avec Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok && request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // En cas de navigation hors-ligne complète, renvoie index.html
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
