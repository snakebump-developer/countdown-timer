PROJECT: Futuristic Timer & Pomodoro PWA.
STACK: HTML5, CSS3 (Custom Properties), Vanilla JS (ES6 Modules), Firebase Auth + Firestore.

CORE LOGIC (main.js):

Timer: Gestito con setInterval, calcolo basato su totalSeconds e currentSeconds.

State: Modalità doppia (Timer Libero / Pomodoro). Pomodoro gestisce fasi work e break.

Audio: Sintesi sonora via Web Audio API (senza file esterni).

PWA: Service Worker con auto-reload al controllerchange per aggiornamenti immediati.

Auth/DB: Predisposto per Firebase (manca inizializzazione nel codice fornito, ma presente hook window.savePomodoro).

KEY FUNCTIONS:

updateDisplay() / updateRing(): Gestione UI e progresso SVG (circonferenza 282.74).

timerComplete(): Logica di switch automatico tra Focus e Break.

enter/exitPomodoroMode(): Switch di stato e reset UI.

requestPermissions(): Gestisce sblocco Audio e Notifiche al primo clic.

PENDING TASKS:

Nessuna task in sospeso.

COMPLETED TASKS:

1. ✅ [2026-03-18] Migliorato l'aggiornamento PWA su iPhone:
   - sw.js: aggiunto BUILD_VERSION (es. '2026-03-18.1') e CACHE_NAME aggiornato v3-<version>.
     Per ogni nuovo deploy aggiornare SOLO la costante BUILD_VERSION.
   - sw.js: rimosso skipWaiting() automatico — ora l'attivazione è controllata dall'utente.
   - sw.js: aggiunto listener 'message' → SKIP_WAITING; on activate → postMessage SW_VERSION a tutti i client.
   - index.html: aggiunto banner #update-banner con bottone "AGGIORNA" e dismiss "×".
   - style.css: stilizzato .update-banner (arancio neon, bottom 5rem, animazione slide-up).
   - script.js: logica SW completamente riscritta:
       • Su SW_VERSION message → console.info con build number (per il developer).
       • Su updatefound + state 'installed' + controller presente → mostra banner.
       • Su visibilitychange (ritorno foreground iOS) → reg.update() + check reg.waiting.
       • Polling ogni 30 min con reg.update() per sessioni lunghe.
       • "AGGIORNA" → postMessage SKIP_WAITING → controllerchange → reload.
       • "×" → nascondi banner (il SW rimane in attesa per il prossimo reload).

IN THE END:
Eseguire sempre il browser integrato sul link: https://countdown-timer-red-nu.vercel.app/

CONSTRAINTS:

No framework (React/Vue).

Solo moduli CDN per Firebase.

Mantieni le performance PWA e il supporto offline.

Priorità: Velocità di caricamento e corretta gestione della memoria (Token).