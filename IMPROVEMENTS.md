# 🚀 Roadmap: Miglioramenti per Professionalizzare e Monetizzare il Futuristic Pomodoro Timer

> **Legenda priorità:**
> 🔴 **CRITICA** — Base indispensabile per retention e monetizzazione futura
> 🟡 **ALTA** — UX/features che fanno la differenza percepita rispetto ai competitor
> 🟢 **MEDIA** — Professionalità, polish e solidità tecnica
> 🔵 **BASSA / FUTURO** — Nice to have, monetizzazione diretta, espansione prodotto

---

## 🔴 Priorità CRITICA

### Autenticazione & Account

- [x] **Login con Google (OAuth)** — Abbassare la barriera di entry: un tap invece di email+password riduce abbandoni del ~60%
- [x] **Reset password via email** — Feature mancante che blocca utenti che dimenticano la password
- [x] **Account linking anonimo→registrato** — Permettere di convertire una sessione anonima in account senza perdere dati locali
- [x] **Verifica email** — Inviare email di verifica alla registrazione per ridurre spam e aumentare fiducia

### Dati & Statistiche (il cuore della retention)

- [x] **Dashboard statistiche personali** — Pagina dedicata con: focus time totale, media giornaliera, giorno migliore, trend settimanale
- [x] **Sistema Streak (giorni consecutivi)** — Mostrare la "striscia" di giorni con almeno 1 pomodoro: principale driver di retention (vedi Duolingo)
- [x] **Obiettivo giornaliero configurabile** — "Voglio completare X pomodori oggi" con progress bar visibile nel timer
- [x] **Heatmap annuale produttività** — Griglia stile GitHub contributions per visualizzare i propri pattern a lungo termine

### Acquisizione & Distribuzione

- [ ] **Pagina landing separata dall'app** — Homepage marketing con headline, screenshot, CTA "Installa gratis" — necessaria per SEO e conversioni
- [ ] **Meta tag Open Graph + Twitter Card** — Rendering link preview su WhatsApp/Telegram/X quando si condivide l'URL
- [x] **Notifiche Push (Web Push API)** — Reminder push giornaliero opzionale ("Hai completato 0 pomodori oggi") — strumento di re-engagement
- [ ] **PWA screenshots nel manifest.json** — Obbligatorie per il prompt di installazione attraente su Android e Chrome

---

## 🟡 Priorità ALTA

### Esperienza utente e personalizzazione

- [ ] **Migliorare il template delle email** - Andare su Firebase e migliorare i template forniti di default in : Autentication -> modelli
- [ ] **Libreria suoni di fine sessione** — Scelta tra: beep sintetico (attuale), campanello, gong zen, chime, white noise tick — differenziatore chiave rispetto a competitor
- [ ] **Suoni/musica ambiente durante la sessione** — Rain, café noise, forest: categoria molto richiesta su app productivity (vedi Brain.fm)
- [ ] **Temi visivi multipli** — Almeno 3 temi: Dark (attuale), Light, Hacker Green — può essere la prima feature premium
- [ ] **Task/progetto associato alla sessione** — Campo opzionale "Su cosa stai lavorando?" → la sessione viene salvata con label (es. "Capitolo 3", "Coding", "Studio")
- [ ] **Animazioni di completamento** — Particle burst / confetti al termine del ciclo Pomodoro per un momento di celebrazione (microinterazione ad alto impatto emotivo)
- [ ] **Tutorial onboarding** — Tooltip o stepper al primo avvio che spiega il metodo Pomodoro e le funzionalità principali
- [ ] **Timer visibile con scorrimento in background con schermo bloccato nell'area notifiche del telefono** — ❌ Non realizzabile in una PWA plain HTML/CSS/JS: su iOS richiede ActivityKit/Live Activities (framework nativo Swift); su Android richiede un Service nativo. La Media Session API (l'unica alternativa web) mostra un widget stile lettore musicale con pulsanti prev/next che entra in conflitto con le app musicali dell'utente. Nessuna API web standard permette un widget persistente nel lock screen del telefono.
- [ ] **Widget compatto / Picture-in-Picture** — Timer sempre visibile sopra le altre finestre tramite `document.pictureInPictureElement` (API supportata su Chrome)

### Dati & Sincronizzazione

- [ ] **Export dati (CSV/JSON)** — "I miei dati sono miei": opzione di scaricare tutta la cronologia pomodori, richiesto dagli utenti power
- [ ] **Sync offline robusta con queue** — Salvare le operazioni fallite offline in una queue e rilanciarle quando torna la connessione (attualmente i dati offline su Firestore non hanno retry garantito)
- [ ] **Analytics giornaliero dettagliato in-app** — Grafici settimanale/mensile renderizzati in canvas (Chart.js CDN) direttamente nell'app

### Sicurezza & Infrastruttura

- [ ] **Firebase App Check** — Proteggere le API Firestore da abusi e accessi non autorizzati dall'esterno dell'app
- [ ] **Rate limiting sulle scritture Firestore** — Regola nelle Security Rules: max N scritture/minuto per UID (prevenire pump di dati maliziosi)
- [ ] **Content Security Policy (CSP)** — Header `Content-Security-Policy` in `vercel.json` per prevenire XSS

---

## 🟢 Priorità MEDIA

### Qualità e professionalità

- [ ] **Changelog in-app post-aggiornamento** — Mostrare un bannerino "Novità in questa versione" dopo ogni aggiornamento SW (usa il `BUILD_VERSION` già presente)
- [ ] **Pagina Privacy Policy** — Obbligatoria per GDPR e necessaria per distribuire su app store / monetizzare con ads
- [ ] **Pagina Termini di Servizio** — Necessaria prima di qualsiasi piano a pagamento
- [ ] **Cookie consent banner (GDPR)** — Necessario se in futuro si integrano analytics di terze parti (Google Analytics, Mixpanel)
- [ ] **Error tracking in produzione (Sentry)** — Ricevere notifiche automatiche per errori JS non gestiti in produzione senza dover guardare i log
- [ ] **Lighthouse score ≥90 su tutte le categorie** — Performance, Accessibility, Best Practices, SEO: audit completo e fix puntuali
- [ ] **Favicon PNG in più risoluzioni** — Aggiungere fallback PNG oltre agli SVG nel manifest per massima compatibilità (Samsung Internet, vecchi Android)
- [x] **Wheel Picker per dispositivi mobile** — implementare la gestione della modifica del tempo minuti secondi della pomodoro challenge tramite wheel picker di ios e android sui dispositvi mobile e tablet così da rendere più fluida la modifica e veloce in linea con il design.
Se possibile far stare sia focus che break sullo stesso asse di modifica.

### Accessibilità

- [ ] **Focus trap nei modali** — Il focus da tastiera deve restare dentro il modale aperto (standard WCAG 2.1 AA)
- [ ] **Skip link "Vai al contenuto"** — Per utenti che navigano solo da tastiera
- [ ] **`prefers-reduced-motion` support** — Disabilitare animazioni per utenti con impostazione sistema attiva
- [ ] **`prefers-color-scheme` auto** — Rilevare automaticamente dark/light mode del sistema operativo

### Internazionalizzazione

- [ ] **Supporto multilingua (i18n)** — Inglese come prima lingua aggiuntiva: apre il mercato globale e aumenta le installazioni PWA

---

## 🔵 Priorità BASSA / Futuro

### Monetizzazione diretta

- [ ] **Piano FREE vs PRO (paywall)** — Definire chiaramente cosa è free (timer base, storico 7gg) e cosa è PRO (statistiche avanzate, temi, suoni, storico illimitato, sync multi-device)
- [ ] **Integrazione Stripe (pagamenti)** — Stripe Checkout o Stripe Customer Portal per gestire abbonamenti mensili/annuali
- [ ] **Referral program** — "Invita un amico, ottieni 1 mese PRO gratis" — growth loop a costo zero
- [ ] **Monetizzazione etica con ads** — Google AdSense come piano FREE alternativo (solo per utenti non-PRO, mai durante la sessione attiva)

### Social & Viralità

- [ ] **Condividi risultato sessione** — Generare un'immagine auto (canvas) con "Ho completato X pomodori oggi 🍅" da condividere sui social
- [ ] **Leaderboard amici** — Classifiche di produttività tra utenti che si seguono (richiede sistema "follow")
- [ ] **Sfide settimanali** — "Questa settimana sfida: 20 pomodori" — spinge retention + engagement

### Espansione piattaforma

- [ ] **Shortcut PWA nel manifest** — `shortcuts` array nel manifest per "Avvia Focus 25min" direttamente dal launcher Android/iOS
- [ ] **App desktop (Tauri)** — App nativa macOS/Windows/Linux partendo dagli stessi file HTML/JS (Tauri è più leggera di Electron)
- [ ] **API REST pubblica** — Endpoint per leggere le proprie statistiche: permette integrazioni con Notion, Obsidian, Zapier
- [ ] **Integrazione Todoist/Things** — Importare task e associarli alle sessioni Pomodoro
- [ ] **Modalità Team/Co-working** — Sessioni Pomodoro sincronizzate tra più utenti in tempo reale (feature B2B premium, usa Firebase Realtime DB)

---

## 📊 Matrice Impatto / Sforzo (Executive Summary)

| Feature | Impatto | Sforzo | Priorità consigliata |
|---|---|---|---|
| Login Google (OAuth) | 🔥🔥🔥 | Basso | Prima cosa da fare |
| Reset password | 🔥🔥🔥 | Minimo | Prima cosa da fare |
| Sistema Streak | 🔥🔥🔥 | Medio | Sprint 1 |
| Dashboard statistiche | 🔥🔥🔥 | Medio | ✅ Completato |
| Task associato sessione | 🔥🔥 | Basso | Sprint 1 |
| Suoni ambiente | 🔥🔥 | Basso | Sprint 1 |
| Temi visivi | 🔥🔥 | Medio | Sprint 2 |
| Notifiche Push | 🔥🔥🔥 | Medio | Sprint 2 |
| Landing page | 🔥🔥🔥 | Medio | Sprint 2 |
| Piano PRO + Stripe | 🔥🔥🔥 | Alto | Sprint 3 |
| App desktop (Tauri) | 🔥 | Alto | Futuro |

---

*Ultimo aggiornamento: 2026-03-20 (Account linking anonimo→registrato + Notifiche Push Web Push API)*
