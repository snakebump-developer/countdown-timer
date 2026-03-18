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

1. migliorare la barra auth per dispositivi mobile, meglio spostarla con un allineamento centrale e migliorarne la UI e UX, sembra anche troppo attaccata al resto della pagina meglio distanziarla un po verticalmente ma mantenendo tutto dentro la viewport per evitare scroll inutili.
2. il pomodoro svg non lo riesco a visualizzare su iphone.
3. il totalizzatore non ha l'icona e il testo in linea.
4. perchè nello screenshot che un icona di freccia bianco in basso ma che non compare su browser?

CONSTRAINTS:

No framework (React/Vue).

Solo moduli CDN per Firebase.

Mantieni le performance PWA e il supporto offline.

Priorità: Velocità di caricamento e corretta gestione della memoria (Token).