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

COMPLETED TASKS:

1. ✅ [2026-03-18] Migliorato l'aggiornamento PWA su iPhone.

2. ✅ [2026-03-18] Implementata cronologia pomodori (localStorage, offline-first).

3. ✅ [2026-03-18] Cronologia sincronizzata con Firestore per utenti loggati:
   - auth.js: import aggiuntivi addDoc, getDocs, deleteDoc, collection, writeBatch.
   - window.savePomodoro: ora salva anche { ts: serverTimestamp() } nella subcollection users/{uid}/history.
   - syncHistory(uid): al login scarica tutti i doc della subcollection, merge con localStorage
     (deduplicazione per timestamp arrotondato al secondo), aggiorna il pulsante STORICO via window.updateHistoryBtnVisibility?.().
   - window.clearFirestoreHistory: cancella in batch tutti i doc di users/{uid}/history (chiamato da SVUOTA TUTTO).
   - script.js: espone window.updateHistoryBtnVisibility; il bottone SVUOTA TUTTO chiama anche window.clearFirestoreHistory?.().
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

4. ✅ [2026-03-18] Implementata cronologia pomodori guadagnati:
   - localStorage key: 'pom_history' — array di {ts: timestamp}, max 500 voci.
   - script.js: funzioni savePomodoroToHistory(), getHistory(), renderHistory(),
     updateHistoryBtnVisibility(); addTomato() ora salva ogni pomodoro nello storico.
   - index.html: pulsante "STORICO" (clock-rotate-left) visibile solo se esiste storico;
     panel/modal bottom-sheet con backdrop, header, body scrollabile, footer con "SVUOTA TUTTO".
   - style.css: stili .pom-hist* — bottom-sheet su mobile, modale centrato su ≥480px,
     animazione slide-up, raggruppamento per giorno (OGGI / IERI / data), badge orari.
   - La cronologia è locale (offline-first), accessibile a utenti loggati e anonimi.
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

5. ✅ [2026-03-19] Diagnosticata e fixata la mancata persistenza della cronologia su Firestore:
   - CAUSA: il catch {} vuoto in savePomodoro (e nelle altre funzioni Firestore) inghiottiva
     silenziosamente tutti gli errori. I 11 totalPomodoros erano stati scritti da una versione
     precedente del codice che NON includeva il campo history; le scritture successive con
     history: arrayUnion(...) potevano fallire (es. Security Rules) senza alcuna traccia.
   - auth.js: catch {} → catch (e) { console.error('[fn] ...', e?.message ?? e) } in tutte
     le funzioni Firestore (loadUserStats, savePomodoro, syncHistory, clearFirestoreHistory).
   - auth.js: aggiunto commento con le Firestore Security Rules necessarie sopra savePomodoro:
       rules_version = '2';
       service cloud.firestore {
         match /databases/{database}/documents {
           match /users/{userId} {
             allow read, write: if request.auth != null && request.auth.uid == userId;
           }
         }
       }
     ⚠️  Se le regole usano hasOnly([...]) assicurarsi che 'history' sia nella lista.
   - sw.js: BUILD_VERSION aggiornato a '2026-03-19.1' per forzare l'invalidazione del cache
     del Service Worker e garantire che tutti i client ricevano il codice aggiornato.
   - AZIONE RICHIESTA: verificare le Firestore Security Rules nel Firebase Console e aggiornarle
     se necessario per consentire la scrittura del campo 'history'.

6. ✅ [2026-03-19] Implementati Reset Password e Verifica Email:
   - auth.js: import aggiuntivi sendPasswordResetEmail, sendEmailVerification.
   - auth.js: aggiunte funzioni showVerifyNotice() / hideVerifyNotice() per il banner #verify-notice.
   - auth.js: handler forgot-password-btn → sendPasswordResetEmail(auth, email); usa l'email già nel campo login;
     se vuoto/non valido mostra hint d'errore inline senza aprire nessun modal extra.
   - auth.js: registrazione → cattura UserCredential da createUserWithEmailAndPassword,
     chiama sendEmailVerification(cred.user) in background (non bloccante, errori loggati).
   - auth.js: onAuthStateChanged → dopo login controlla user.emailVerified:
     • false → showVerifyNotice() + snack 'warning' "verifica la tua email per attivare l'account"
     • true  → hideVerifyNotice() + snack 'success' normale
     • registrazione (justRegistered) → snack 'success' con invito a verificare email
   - auth.js: handler resend-verify-btn → sendEmailVerification(auth.currentUser).
   - auth.js: handler dismiss-verify-btn → hideVerifyNotice().
   - auth.js: friendlyError aggiornato con 'auth/missing-email' e 'auth/requires-recent-login'.
   - index.html: aggiunto #forgot-password-btn (.auth-modal__link) nel panel-login sotto il submit.
   - index.html: aggiunto #verify-notice (.verify-notice) tra auth-bar e pom-switch.
   - style.css: aggiunto .auth-modal__link (bottone testo discreto per password dimenticata).
   - style.css: aggiunto .verify-notice e child elements (pill giallo stile update-banner in-flow).
   - sw.js: BUILD_VERSION aggiornato a '2026-03-19.2'.
   COMPORTAMENTO ACCOUNT GIÀ REGISTRATI:
     • user.emailVerified = false → alla loro prossima login vedranno il banner giallo "EMAIL NON VERIFICATA"
       con pulsante "RINVIA EMAIL" per ricevere una nuova email di verifica.
     • L'app rimane completamente accessibile — la verifica è informativa, non bloccante.
     • Una volta verificata l'email, il banner scompare definitivamente.

7. ✅ [2026-03-19] Implementato Login con Google (OAuth):
   - auth.js: import aggiuntivi GoogleAuthProvider, signInWithPopup.
   - auth.js: ref googleLoginBtn, googleRegisterBtn; istanza const googleProvider = new GoogleAuthProvider().
   - auth.js: funzione handleGoogleSignIn() → signInWithPopup; gestisce popup-closed/cancelled silenziosamente.
   - auth.js: entrambi i bottoni (#google-login-btn, #google-register-btn) chiamano handleGoogleSignIn.
   - auth.js: onAuthStateChanged aggiornato:
     • authEmailEl mostra user.displayName (Google) con fallback a user.email.
     • snack personalizzato "Bentornato, <nome>!" per accessi Google.
     • verifyNotice mai mostrato per Google (emailVerified sempre true).
   - auth.js: friendlyError aggiornato con 'auth/popup-blocked' e 'auth/account-exists-with-different-credential'.
   - index.html: bottone #google-login-btn nel panel-login con SVG Google ufficiale + divisore OPPURE.
   - index.html: bottone #google-register-btn nel panel-register con SVG Google ufficiale + divisore OPPURE.
   - style.css: .auth-modal__divider (separatore testo "OPPURE" con linee laterali).
   - style.css: .auth-modal__google (bottone grigio traslucido con logo Google SVG inline).
   - sw.js: BUILD_VERSION aggiornato a '2026-03-19.3'.
   NOTE:
     • signInWithPopup funziona su desktop e browser moderni mobile; non richiede redirect.
     • Se l'utente ha già un account email/password con la stessa email, Firebase restituisce
       'auth/account-exists-with-different-credential' → messaggio friendly già gestito.
     • Il flusso di sync Firestore (loadUserStats + syncHistory) è identico per Google e email/password.

8. ✅ [2026-03-19] Implementati Sistema Streak + Profile Panel:
   File modificati:
   - auth.js: calcStreak(), calcToday(), updateStreakBadge(), openProfilePanel(), closeProfilePanel().
   - auth.js: DOM refs per panel (profilePanel, profileBackdrop, profileCloseBtn, profileAvatar, ecc.).
   - auth.js: updateStreakBadge() chiamato in onAuthStateChanged dopo syncHistory().
   - auth.js: event listeners panel (auth-profile-btn, close, backdrop, logout, Escape key).
   - auth.js: window.updateStreakBadge esposto per script.js.
   - script.js: window.updateStreakBadge?.() chiamato in addTomato() dopo updateHistoryBtnVisibility().
   - index.html: badge #auth-streak-badge (🔥 count + label STREAK) in auth-bar__user.
   - index.html: <span class="auth-bar__email"> wrappato in <button class="auth-bar__profile-btn"> con chevron.
   - index.html: profile panel HTML (#profile-panel) con drawer, avatar, stats (streak/totali/oggi), sezione PROSSIMAMENTE, logout.
   - style.css: .auth-bar__streak, .auth-bar__streak-count, .auth-bar__streak-label, .auth-bar__profile-btn, .auth-bar__profile-chevron.
   - style.css: responsive max-width:374px nasconde .auth-bar__streak-label e .auth-bar__profile-chevron.
   - style.css: sezione .profile-panel completa (drawer desktop 300px + bottom sheet mobile ≤480px).
   - sw.js: BUILD_VERSION aggiornato a '2026-03-19.4'.
   NOTE:
     • Il panel è un right-side drawer su desktop, bottom sheet rounded su mobile.
     • La sezione PROSSIMAMENTE (Dashboard Statistiche, Obiettivo Giornaliero, Heatmap, Export CSV, Temi, Piano PRO) è opaca (cursor:default, opacity:0.5) per comunicare roadmap senza feature incomplete attive.
     • calcStreak() tollera il caso "nessun pomodoro oggi": fa partire il conteggio da ieri.
     • IMPROVEMENTS.md: Sistema Streak marcato [x].

IN THE END:
Eseguire sempre il browser integrato sul link: https://countdown-timer-red-nu.vercel.app/

CONSTRAINTS:

No framework (React/Vue).

Solo moduli CDN per Firebase.

Mantieni le performance PWA e il supporto offline.

Priorità: Velocità di caricamento e corretta gestione della memoria (Token).