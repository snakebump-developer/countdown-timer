// ── Versione build: aggiornare ad ogni deploy (YYYY-MM-DD.N) ────
const BUILD_VERSION = '2026-03-20.6';
const CACHE_NAME = `futuristic-timer-v3-${BUILD_VERSION}`;

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

// ── Install: precache asset statici, NON chiamare skipWaiting automaticamente ──
// L'attivazione è controllata dall'utente tramite il banner di aggiornamento
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_ASSETS))
    );
    // NON chiamiamo skipWaiting qui: il client mostrerà un banner
    // e chiamerà skipWaiting solo quando l'utente lo conferma (o il timer è fermo)
});

// ── Messaggio dal client: SKIP_WAITING → attiva il nuovo SW ─────
self.addEventListener('message', (e) => {
    if (e.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ── Activate: rimuove cache vecchie, prende il controllo e notifica versione ──
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim()) // Prende il controllo di tutte le tab aperte
         .then(() => {
             // Notifica tutti i client aperti con la versione attiva
             return self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
                 .then(clients => {
                     clients.forEach(c => c.postMessage({ type: 'SW_VERSION', version: BUILD_VERSION }));
                 });
         })
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
