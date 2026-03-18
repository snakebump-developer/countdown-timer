const CACHE_NAME = 'futuristic-timer-v2';

// Asset statici da precachare (aggiornaci la versione ad ogni deploy)
const LOCAL_ASSETS = [
    './style.css',
    './script.js',
    './auth.js',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg',
    './icon-maskable.svg'
];

// ── Install: precache asset statici (NON l'HTML, sarà sempre network-first) ──
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_ASSETS))
    );
    self.skipWaiting(); // Attiva subito il nuovo SW senza aspettare la chiusura delle tab
});

// ── Activate: rimuove cache vecchie e prende il controllo ────────
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim()) // Prende il controllo di tutte le tab aperte
    );
});

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    if (!e.request.url.startsWith('http')) return;

    const url     = new URL(e.request.url);
    const isLocal = url.origin === self.location.origin;
    const isHTML  = e.request.destination === 'document';

    if (isHTML) {
        // Network-first per l'HTML: garantisce che gli aggiornamenti arrivino sempre
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(e.request)) // Offline: usa cache
        );
    } else if (isLocal) {
        // Cache-first per CSS/JS/immagini locali (cambio CACHE_NAME = aggiornamento forzato)
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
        // Network-first per CDN (Google Fonts, FontAwesome, Firebase)
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
