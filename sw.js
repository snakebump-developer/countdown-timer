const CACHE_NAME = 'futuristic-timer-v1';

const LOCAL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg',
    './icon-maskable.svg'
];

// ── Install: precache local assets ──────────────────────────────
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_ASSETS))
    );
    self.skipWaiting();
});

// ── Activate: rimuove cache vecchie ─────────────────────────────
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch: cache-first locale, network-first CDN ────────────────
self.addEventListener('fetch', (e) => {
    // Ignora richieste non-GET e chrome-extension
    if (e.request.method !== 'GET') return;
    if (!e.request.url.startsWith('http')) return;

    const isLocal = e.request.url.startsWith(self.location.origin);

    if (isLocal) {
        // Cache-first per asset locali
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(res => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
                    }
                    return res;
                });
            })
        );
    } else {
        // Network-first per CDN (Google Fonts, FontAwesome)
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
    }
});
