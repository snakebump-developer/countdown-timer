document.addEventListener('DOMContentLoaded', () => {
    // Constants
    const CIRCUMFERENCE = 2 * Math.PI * 45; // ≈ 282.74 (r=45, viewBox 100×100)
    const HISTORY_KEY   = 'pom_history';
    const HISTORY_MAX   = 500;
    const DAILY_GOAL_KEY = 'daily_goal';
    const DAILY_GOAL_DEF = 8;

    // State
    let totalSeconds = 300;
    let currentSeconds = totalSeconds;
    let timerId = null;
    let isRunning = false;
    let hasInteracted = false;

    // Pomodoro state
    let isPomodoroMode = false;
    let pomPhase = 'work'; // 'work' | 'break'
    let pomCount = 0;
    let pomCyclesCompleted = 0;
    let pomIsInfinite = false;
    let pomSettingsOpen = false;

    // Custom cycles state
    let pomCustomMode   = false;
    let pomCyclesList   = []; // [{workMin, workSec, breakMin, breakSec}]
    let editingCycleIdx = -1;

    // Elements
    const timeDisplay = document.getElementById('time-display');
    const presetBtns = document.querySelectorAll('.presets__btn');
    const presetsHeader = document.getElementById('presets-header');
    const toggleBtn = document.getElementById('toggle-btn');
    const toggleText = document.getElementById('toggle-text');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const toast = document.getElementById('toast');
    const toastSpan = toast.querySelector('span');
    const progressRing = document.getElementById('progress-ring');
    const progressTrack = document.getElementById('progress-track');

    // Pomodoro elements
    const pomToggle = document.getElementById('pom-toggle');
    const pomConfig = document.getElementById('pom-config');
    const pomWorkMinInput = document.getElementById('pom-work-min');
    const pomWorkSecInput = document.getElementById('pom-work-sec');
    const pomBreakMinInput = document.getElementById('pom-break-min');
    const pomBreakSecInput = document.getElementById('pom-break-sec');
    const pomCyclesInput = document.getElementById('pom-cycles');
    const pomInfiniteBtn = document.getElementById('pom-infinite');
    const phaseLabel = document.getElementById('phase-label');
    const tomatoesEl = document.getElementById('tomatoes');
    const tomatoesTray = document.getElementById('tomatoes-tray');
    const pomSwitchEl = document.querySelector('.pom-switch');
    const pomSettingsBtn = document.getElementById('pom-settings-btn');
    const pomSettingsChevron = document.getElementById('pom-settings-chevron');

    // Custom cycles elements
    const pomCustomCyclesBtn    = document.getElementById('pom-custom-cycles-btn');
    const pomCyclesEditor       = document.getElementById('pom-cycles-editor');
    const pomCyclesEditorBd     = document.getElementById('pom-cycles-editor-backdrop');
    const pomCyclesEditorClose  = document.getElementById('pom-cycles-editor-close');
    const pomCycleListEl        = document.getElementById('pom-cycle-list');
    const pomAddCycleBtn        = document.getElementById('pom-add-cycle-btn');
    const pomCycleStartBtn      = document.getElementById('pom-cycle-start-btn');
    // Cycle sheet elements
    const cycleSheet         = document.getElementById('pom-cycle-sheet');
    const cycleSheetBackdrop = document.getElementById('pom-cycle-sheet-backdrop');
    const cycleSheetTitle    = document.getElementById('pom-cycle-sheet-title');
    const cycleSheetClose    = document.getElementById('pom-cycle-sheet-close');
    const cycleSheetCancel   = document.getElementById('pom-cycle-sheet-cancel');
    const cycleSheetSave     = document.getElementById('pom-cycle-sheet-save');
    const cteWorkMinInput    = document.getElementById('cte-work-min-input');
    const cteWorkSecInput    = document.getElementById('cte-work-sec-input');
    const cteBreakMinInput   = document.getElementById('cte-break-min-input');
    const cteBreakSecInput   = document.getElementById('cte-break-sec-input');

    // History elements
    const histBtn          = document.getElementById('pom-hist-btn');
    const histModal        = document.getElementById('pom-hist');
    const histBackdrop     = document.getElementById('pom-hist-backdrop');
    const histCloseBtn     = document.getElementById('pom-hist-close');
    const histBody         = document.getElementById('pom-hist-body');
    const histClearBtn     = document.getElementById('pom-hist-clear');

    // Stats elements
    const statsBtn         = document.getElementById('stats-btn');
    const statsModal       = document.getElementById('stats-modal');
    const statsBackdropEl  = document.getElementById('stats-backdrop');
    const statsCloseBtn    = document.getElementById('stats-close-btn');
    const statsBody        = document.getElementById('stats-body');

    // Daily goal elements
    const dailyGoalWidget  = document.getElementById('daily-goal');
    const dailyGoalBar     = document.getElementById('daily-goal-bar');
    const dailyGoalTrack   = document.getElementById('daily-goal-track');
    const dailyGoalCurrent = document.getElementById('daily-goal-current');
    const dailyGoalTarget  = document.getElementById('daily-goal-target');
    const dailyGoalForm    = document.getElementById('daily-goal-form');
    const dailyGoalInput   = document.getElementById('daily-goal-input');
    const dailyGoalSetBtn  = document.getElementById('daily-goal-set');
    const dailyGoalEditBtn = document.getElementById('daily-goal-edit-btn');

    // Init
    updateDisplay();
    updateRing();
    updateHistoryBtnVisibility();
    updateDailyGoal();

    // Sound Synthesis (Web Audio API)
    let audioCtx = null;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        // Audio non disponibile (es. iOS senza gesto utente)
    }
    
    function playSynthBeep(freq, type, duration, vol=0.1) {
        if (!audioCtx || audioCtx.state === 'closed') return;
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            
            // Envelope to prevent clipping
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            // Audio non disponibile su questo dispositivo/stato
        }
    }

    function playClick() { playSynthBeep(600, 'sine', 0.1, 0.1); }
    function playStart() { 
        playSynthBeep(880, 'square', 0.1, 0.05);
        setTimeout(() => playSynthBeep(1100, 'square', 0.15, 0.05), 100);
    }
    function playPause() { playSynthBeep(440, 'triangle', 0.15, 0.1); }
    
    let alarmInterval = null;
    function playAlarm() {
        if (alarmInterval) return;
        let count = 0;
        // Immediate first beep
        playSynthBeep(1200, 'square', 0.2, 0.1);
        count++;
        alarmInterval = setInterval(() => {
            playSynthBeep(1200, 'square', 0.2, 0.1);
            count++;
            if (count > 9) stopAlarm(); // Play 10 beeps total
        }, 400);
    }
    
    function stopAlarm() {
        if (alarmInterval) {
            clearInterval(alarmInterval);
            alarmInterval = null;
        }
    }

    // Update SVG progress ring
    function updateRing() {
        const elapsed = totalSeconds - currentSeconds;
        const fraction = totalSeconds > 0 ? elapsed / totalSeconds : 0;
        progressRing.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
    }

    // ── Pomodoro History (localStorage) ──────────────────────────

    function savePomodoroToHistory(durSec) {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        history.push({ ts: Date.now(), dur: durSec || 1500 });
        if (history.length > HISTORY_MAX) history.splice(0, history.length - HISTORY_MAX);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }

    function getHistory() {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    }

    function updateHistoryBtnVisibility() {
        histBtn.style.display = getHistory().length > 0 ? '' : 'none';
    }

    function openHistory() {
        renderHistory();
        histModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeHistory() {
        histModal.hidden = true;
        document.body.style.overflow = '';
    }

    function renderHistory() {
        const history = getHistory();

        if (history.length === 0) {
            histBody.innerHTML = '<p class="pom-hist__empty">Nessun pomodoro ancora. Inizia una sessione!</p>';
            return;
        }

        const today     = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        function isSameDay(d1, d2) {
            return d1.getFullYear() === d2.getFullYear() &&
                   d1.getMonth()    === d2.getMonth()    &&
                   d1.getDate()     === d2.getDate();
        }

        function formatDay(date) {
            if (isSameDay(date, today))     return 'OGGI';
            if (isSameDay(date, yesterday)) return 'IERI';
            return date.toLocaleDateString('it-IT', {
                day: '2-digit', month: 'short', year: 'numeric'
            }).toUpperCase();
        }

        function formatHM(ts) {
            return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        }

        // Group by calendar day
        const groupMap = new Map();
        history.forEach(entry => {
            const d = new Date(entry.ts);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!groupMap.has(key)) groupMap.set(key, { date: d, entries: [] });
            groupMap.get(key).entries.push(entry);
        });

        // Sort descending (most recent day first)
        const groups = [...groupMap.values()].sort((a, b) => b.date - a.date);

        let html = `<div class="pom-hist__total">Totale: <strong>${history.length} 🍅</strong></div>`;
        groups.forEach(group => {
            const times = group.entries
                .slice()
                .sort((a, b) => b.ts - a.ts)
                .map(e => `<span class="pom-hist__time">${formatHM(e.ts)}</span>`)
                .join('');
            html += `
                <div class="pom-hist__group">
                    <div class="pom-hist__date">
                        <span class="pom-hist__date-label">${formatDay(group.date)}</span>
                        <span class="pom-hist__date-count">${group.entries.length} 🍅</span>
                    </div>
                    <div class="pom-hist__times">${times}</div>
                </div>`;
        });

        histBody.innerHTML = html;
    }

    // Espone updateHistoryBtnVisibility per auth.js (post-sync al login)
    window.updateHistoryBtnVisibility = updateHistoryBtnVisibility;

    // ── Daily Goal ────────────────────────────────────────────────

    function getDailyGoal() {
        return Math.max(1, parseInt(localStorage.getItem(DAILY_GOAL_KEY) || DAILY_GOAL_DEF, 10));
    }

    function getTodayCount() {
        const now = new Date();
        return getHistory().filter(e => {
            const d = new Date(e.ts);
            return d.getFullYear() === now.getFullYear() &&
                   d.getMonth()    === now.getMonth()    &&
                   d.getDate()     === now.getDate();
        }).length;
    }

    function updateDailyGoal() {
        const goal    = getDailyGoal();
        const current = getTodayCount();
        const pct     = Math.min(100, Math.round((current / goal) * 100));

        dailyGoalCurrent.textContent = current;
        dailyGoalTarget.textContent  = goal;
        dailyGoalBar.style.width     = `${pct}%`;
        dailyGoalBar.classList.toggle('daily-goal__fill--complete', current >= goal);
        dailyGoalTrack.setAttribute('aria-valuenow', pct);

        // Celebrazione quando obiettivo raggiunto esattamente
        if (current === goal && goal > 0) {
            dailyGoalWidget.classList.add('daily-goal--complete');
        } else {
            dailyGoalWidget.classList.remove('daily-goal--complete');
        }
    }

    window.updateDailyGoalDisplay = updateDailyGoal;

    // Daily goal form toggle
    dailyGoalEditBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Previene la chiusura immediata dall'handler document
        const isOpen = !dailyGoalForm.hidden;
        if (isOpen) {
            dailyGoalForm.hidden = true;
        } else {
            dailyGoalInput.value = getDailyGoal();
            dailyGoalForm.hidden = false;
            dailyGoalInput.focus();
            dailyGoalInput.select();
        }
    });

    function saveDailyGoal() {
        const v = Math.max(1, Math.min(50, parseInt(dailyGoalInput.value, 10) || DAILY_GOAL_DEF));
        localStorage.setItem(DAILY_GOAL_KEY, v);
        window.saveDailyGoalToFirestore?.(v); // Persiste su Firestore se loggato
        dailyGoalForm.hidden = true;
        updateDailyGoal();
    }

    dailyGoalSetBtn.addEventListener('click', saveDailyGoal);
    dailyGoalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  { e.preventDefault(); saveDailyGoal(); }
        if (e.key === 'Escape') { dailyGoalForm.hidden = true; }
    });

    // Chiudi form se si clicca fuori
    document.addEventListener('click', (e) => {
        if (!dailyGoalForm.hidden && !dailyGoalWidget.contains(e.target)) {
            dailyGoalForm.hidden = true;
        }
    });

    // ── Wheel Picker (solo touch / mobile) ────────────────────────

    // Rileva se il dispositivo è touch-only (stessa logica del CSS hover:none)
    const isTouchDevice = () => window.matchMedia('(hover: none)').matches;

    /**
     * Costruisce un drum-scroller per un singolo valore numerico.
     * @param {HTMLElement} drumEl   - contenitore .pom-wheel-drum
     * @param {HTMLElement} inputEl  - <input type=number> nascosto da sincronizzare
     * @param {number}      min      - valore minimo
     * @param {number}      max      - valore massimo
     */
    function buildDrum(drumEl, inputEl, min, max) {
        const ITEM_H = 35.2; // 2.2rem × 16px (corrispondente al CSS)

        // Svuota e popola
        drumEl.innerHTML = '';
        // Padding: 1 item top + 1 bottom affinché lo snap funzioni su tutti i valori
        const padStart = document.createElement('div');
        padStart.className = 'pom-wheel-drum__item pom-wheel-drum__item--pad';
        padStart.setAttribute('aria-hidden', 'true');
        drumEl.appendChild(padStart);

        for (let i = min; i <= max; i++) {
            const item = document.createElement('div');
            item.className = 'pom-wheel-drum__item';
            item.textContent = String(i).padStart(2, '0');
            item.dataset.value = i;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', 'false');
            drumEl.appendChild(item);
        }

        const padEnd = document.createElement('div');
        padEnd.className = 'pom-wheel-drum__item pom-wheel-drum__item--pad';
        padEnd.setAttribute('aria-hidden', 'true');
        drumEl.appendChild(padEnd);

        // Scorri al valore corrente dell'input (senza animazione)
        function scrollToValue(val, smooth) {
            const idx = Math.max(min, Math.min(max, val)) - min; // 0-based dentro i reali
            drumEl.scrollTo({
                top: idx * ITEM_H,
                behavior: smooth ? 'smooth' : 'instant'
            });
        }

        // Aggiorna classe --selected e l'input nascosto in base alla posizione scroll
        function syncFromScroll() {
            const idx = Math.round(drumEl.scrollTop / ITEM_H);
            const val = Math.max(min, Math.min(max, idx + min));

            // Aggiorna input e triggera il listener 'input' usato dal live-update del timer
            inputEl.value = val;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));

            // Aggiorna classi visive
            const items = drumEl.querySelectorAll('.pom-wheel-drum__item[data-value]');
            items.forEach(el => {
                const isSelected = Number(el.dataset.value) === val;
                el.classList.toggle('pom-wheel-drum__item--selected', isSelected);
                el.setAttribute('aria-selected', isSelected ? 'true' : 'false');
            });
        }

        // Listener scroll (throttled con requestAnimationFrame)
        let rafId = null;
        drumEl.addEventListener('scroll', () => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                syncFromScroll();
                rafId = null;
            });
        }, { passive: true });

        // Tap su un item: scorri verso di esso
        drumEl.addEventListener('click', (e) => {
            const item = e.target.closest('.pom-wheel-drum__item[data-value]');
            if (!item) return;
            scrollToValue(Number(item.dataset.value), true);
        });

        // Inizializzazione
        const initVal = parseInt(inputEl.value, 10) || min;
        scrollToValue(initVal, false);
        syncFromScroll();

        // Espone un metodo per aggiornare il drum da codice
        drumEl._setVal = (v) => scrollToValue(v, false);
    }

    // Inizializza i 4 drum quando la sezione diventa visibile per la prima volta
    let wheelsBuilt = false;

    function initWheels() {
        if (!isTouchDevice() || wheelsBuilt) return;
        wheelsBuilt = true;
        buildDrum(document.getElementById('wheel-work-min'),  pomWorkMinInput,  0, 120);
        buildDrum(document.getElementById('wheel-work-sec'),  pomWorkSecInput,  0, 59);
        buildDrum(document.getElementById('wheel-break-min'), pomBreakMinInput, 0, 60);
        buildDrum(document.getElementById('wheel-break-sec'), pomBreakSecInput, 0, 59);
    }

    // Aggiorna i drum se i valori degli input vengono cambiati da codice
    window.syncWheelsFromInputs = function () {
        if (!wheelsBuilt) return;
        const wheelWorkMin  = document.getElementById('wheel-work-min');
        const wheelWorkSec  = document.getElementById('wheel-work-sec');
        const wheelBreakMin = document.getElementById('wheel-break-min');
        const wheelBreakSec = document.getElementById('wheel-break-sec');
        if (wheelWorkMin._setVal)  wheelWorkMin._setVal(parseInt(pomWorkMinInput.value,  10) || 0);
        if (wheelWorkSec._setVal)  wheelWorkSec._setVal(parseInt(pomWorkSecInput.value,  10) || 0);
        if (wheelBreakMin._setVal) wheelBreakMin._setVal(parseInt(pomBreakMinInput.value, 10) || 0);
        if (wheelBreakSec._setVal) wheelBreakSec._setVal(parseInt(pomBreakSecInput.value, 10) || 0);
    };

    // Costruisce i drum la prima volta che la pom-config diventa visibile
    pomToggle.addEventListener('change', () => {
        if (pomToggle.checked) initWheels();
    });
    // Fallback: costruisce se il pom-config era già visibile all'avvio
    if (pomToggle.checked) initWheels();

    // ── Dashboard Statistiche ─────────────────────────────────────

    function calcStats() {
        const history = getHistory();
        if (!history.length) return null;
        const now = new Date();

        const todayCount = getTodayCount();

        // Ultimi 7 giorni
        const week0 = new Date(now);
        week0.setDate(now.getDate() - 6);
        week0.setHours(0, 0, 0, 0);
        const weekCount = history.filter(e => e.ts >= week0.getTime()).length;

        const total = history.length;

        // Mappa giorni
        const dayMap = new Map();
        history.forEach(e => {
            const d = new Date(e.ts);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            dayMap.set(key, (dayMap.get(key) || 0) + 1);
        });
        const activeDays = dayMap.size;
        const avgPerDay  = activeDays > 0 ? (total / activeDays).toFixed(1) : '0';

        // Giorno migliore
        let bestKey = '', bestCount = 0;
        dayMap.forEach((cnt, k) => { if (cnt > bestCount) { bestCount = cnt; bestKey = k; } });
        let bestLabel = '';
        if (bestKey) {
            const [y, m, d] = bestKey.split('-').map(Number);
            bestLabel = new Date(y, m, d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
        }

        // Focus time effettivo: usa la durata salvata se disponibile, altrimenti 25 min di default
        const focusTotalSecs = history.reduce((acc, e) => acc + (e.dur ? e.dur : 25 * 60), 0);
        const focusHours = Math.floor(focusTotalSecs / 3600);
        const focusMinR  = Math.floor((focusTotalSecs % 3600) / 60);
        const focusSecR  = focusTotalSecs % 60;

        // Ultimi 7 giorni per il grafico
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            last7.push({
                label: d.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3).toUpperCase(),
                count: dayMap.get(key) || 0,
                isToday: i === 0,
            });
        }
        const max7 = Math.max(1, ...last7.map(d => d.count));

        return { total, todayCount, weekCount, focusHours, focusMinR, focusSecR, avgPerDay, activeDays, bestLabel, bestCount, last7, max7 };
    }

    // ── Heatmap annuale ──────────────────────────────────────────

    function renderHeatmapSection() {
        const history = getHistory();

        // Build daily count map
        const dayMap = new Map();
        history.forEach(e => {
            const d = new Date(e.ts);
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            dayMap.set(k, (dayMap.get(k) || 0) + 1);
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Start from Monday of the week 52 weeks (364 days) ago
        const startRaw = new Date(today);
        startRaw.setDate(today.getDate() - 364);
        const dow = startRaw.getDay(); // 0=Sun … 6=Sat
        startRaw.setDate(startRaw.getDate() - (dow === 0 ? 6 : dow - 1));

        const MONTHS_IT = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

        // Build week columns (Mon–Sun each)
        const weeks  = [];
        const cursor = new Date(startRaw);
        while (cursor.getTime() <= today.getTime()) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
                const isFuture = cursor.getTime() > today.getTime();
                week.push({
                    key,
                    count:    isFuture ? 0 : (dayMap.get(key) || 0),
                    isFuture,
                    isToday:  cursor.getTime() === today.getTime(),
                    label:    new Date(cursor).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
                });
                cursor.setDate(cursor.getDate() + 1);
            }
            weeks.push(week);
        }

        // Sessions in the last 365 days
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        const yearCount = history.filter(e => e.ts >= yearAgo.getTime()).length;

        // Month labels (one per column, text only on month change)
        let lastMonth = -1;
        const monthHtml = weeks.map(week => {
            const m = parseInt(week[0].key.split('-')[1], 10) - 1;
            const label = m !== lastMonth ? MONTHS_IT[m] : '';
            lastMonth = m;
            return `<span class="heatmap__month-lbl">${label}</span>`;
        }).join('');

        // Day-axis labels (show Mon, Wed, Fri, Sun)
        const dayAxisHtml = ['L', '', 'M', '', 'V', '', 'D']
            .map(l => `<span class="heatmap__day-ax-lbl">${l}</span>`)
            .join('');

        // Color level: 0 = none … 4 = high
        const getLevel = n => n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4;

        // Grid cells (flat list, grid-auto-flow:column groups them by week)
        const cellsHtml = weeks.map(week =>
            week.map(day => {
                if (day.isFuture) {
                    return `<div class="heatmap__cell heatmap__cell--future" aria-hidden="true"></div>`;
                }
                const lvl = getLevel(day.count);
                const tip = day.count === 0
                    ? `${day.label}: nessuna sessione`
                    : `${day.label}: ${day.count} session${day.count === 1 ? 'e' : 'i'}`;
                return `<div class="heatmap__cell heatmap__cell--${lvl}${day.isToday ? ' heatmap__cell--today' : ''}" title="${tip}"></div>`;
            }).join('')
        ).join('');

        return `
            <div class="stats-modal__heatmap-section">
                <div class="stats-modal__heatmap-hdr">
                    <span class="stats-modal__chart-title">🌱 PRODUTTIVITÀ ANNUALE</span>
                    <span class="heatmap__year-count">${yearCount} session${yearCount === 1 ? 'e' : 'i'}</span>
                </div>
                <div class="heatmap__outer">
                    <div class="heatmap__day-axis">${dayAxisHtml}</div>
                    <div class="heatmap__scroll-area">
                        <div class="heatmap__month-axis">${monthHtml}</div>
                        <div class="heatmap__grid">${cellsHtml}</div>
                    </div>
                </div>
                <div class="heatmap__legend">
                    <span class="heatmap__legend-lbl">MENO</span>
                    ${[0,1,2,3,4].map(l => `<div class="heatmap__leg-cell heatmap__cell--${l}"></div>`).join('')}
                    <span class="heatmap__legend-lbl">PIÙ</span>
                </div>
            </div>`;
    }

    function renderStats() {
        const s = calcStats();
        if (!s) {
            statsBody.innerHTML = '<p class="stats-modal__empty">Completa il tuo primo pomodoro per vedere le statistiche!</p>';
            return;
        }

        const bars = s.last7.map(d => {
            const pct = Math.round((d.count / s.max7) * 100);
            return `<div class="stats-modal__bar-item${d.isToday ? ' stats-modal__bar-item--today' : ''}">
                <div class="stats-modal__bar-track">
                    <div class="stats-modal__bar-fill" style="height:${pct}%"></div>
                </div>
                <span class="stats-modal__bar-count">${d.count > 0 ? d.count : ''}</span>
                <span class="stats-modal__bar-label">${d.label}</span>
            </div>`;
        }).join('');

        const goal         = getDailyGoal();
        const goalPct      = Math.min(100, Math.round((s.todayCount / goal) * 100));
        const goalComplete = s.todayCount >= goal;

        statsBody.innerHTML = `
            <div class="stats-modal__grid">
                <div class="stats-modal__kpi">
                    <span class="stats-modal__kpi-val">${s.total}</span>
                    <span class="stats-modal__kpi-lbl">🍅 TOTALI</span>
                </div>
                <div class="stats-modal__kpi">
                    <span class="stats-modal__kpi-val">${s.todayCount}</span>
                    <span class="stats-modal__kpi-lbl">📅 OGGI</span>
                </div>
                <div class="stats-modal__kpi">
                    <span class="stats-modal__kpi-val">${s.weekCount}</span>
                    <span class="stats-modal__kpi-lbl">📆 7 GIORNI</span>
                </div>
            </div>
            <div class="stats-modal__focus-time">
                <span class="stats-modal__focus-label">⏱ FOCUS TIME TOTALE</span>
                <span class="stats-modal__focus-val">${s.focusHours}h ${String(s.focusMinR).padStart(2,'0')}m ${String(s.focusSecR).padStart(2,'0')}s</span>
                <span class="stats-modal__focus-note">Basato sulla durata effettiva di ogni sessione</span>
            </div>
            <div class="stats-modal__row2">
                <div class="stats-modal__sub">
                    <span class="stats-modal__sub-lbl">MEDIA / GIORNO</span>
                    <span class="stats-modal__sub-val">${s.avgPerDay} 🍅</span>
                    <span class="stats-modal__sub-note">${s.activeDays} giorn${s.activeDays === 1 ? 'o' : 'i'} attivi</span>
                </div>
                <div class="stats-modal__sub stats-modal__sub--best">
                    <span class="stats-modal__sub-lbl">GIORNO MIGLIORE</span>
                    <span class="stats-modal__sub-val">${s.bestCount} 🍅</span>
                    <span class="stats-modal__sub-note">${s.bestLabel}</span>
                </div>
            </div>
            <div class="stats-modal__goal-section">
                <div class="stats-modal__goal-header">
                    <span class="stats-modal__goal-lbl"><i class="fa-solid fa-bullseye"></i> OBIETTIVO OGGI</span>
                    <span class="stats-modal__goal-nums${goalComplete ? ' stats-modal__goal-nums--done' : ''}">${s.todayCount} / ${goal} 🍅${goalComplete ? ' ✓' : ''}</span>
                </div>
                <div class="stats-modal__goal-track">
                    <div class="stats-modal__goal-fill${goalComplete ? ' stats-modal__goal-fill--done' : ''}" style="width:${goalPct}%"></div>
                </div>
            </div>
            <div class="stats-modal__chart">
                <span class="stats-modal__chart-title">ULTIMI 7 GIORNI</span>
                <div class="stats-modal__bars">${bars}</div>
            </div>
            ${renderHeatmapSection()}`;

        // Auto-scroll heatmap to show the most recent weeks (right side)
        setTimeout(() => {
            const scrollArea = statsBody.querySelector('.heatmap__scroll-area');
            if (scrollArea) scrollArea.scrollLeft = scrollArea.scrollWidth;
        }, 0);
    }

    function openStats() {
        renderStats();
        statsModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeStats() {
        statsModal.hidden = true;
        document.body.style.overflow = '';
    }

    statsBtn.addEventListener('click', openStats);
    statsCloseBtn.addEventListener('click', closeStats);
    statsBackdropEl.addEventListener('click', closeStats);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !statsModal.hidden) closeStats();
    });

    // History event listeners
    histBtn.addEventListener('click', openHistory);
    histCloseBtn.addEventListener('click', closeHistory);
    histBackdrop.addEventListener('click', closeHistory);
    histClearBtn.addEventListener('click', () => {
        localStorage.removeItem(HISTORY_KEY);
        updateHistoryBtnVisibility();
        // Cancella anche da Firestore se loggato
        window.clearFirestoreHistory?.();
        closeHistory();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !histModal.hidden) closeHistory();
    });

    // ── Pomodoro helpers ──────────────────────────────────────────

    function getPomWorkSec() {
        const m = Math.max(0, parseInt(pomWorkMinInput.value, 10) || 0);
        const s = Math.min(59, Math.max(0, parseInt(pomWorkSecInput.value, 10) || 0));
        return Math.max(1, m * 60 + s);
    }

    function getPomBreakSec() {
        const m = Math.max(0, parseInt(pomBreakMinInput.value, 10) || 0);
        const s = Math.min(59, Math.max(0, parseInt(pomBreakSecInput.value, 10) || 0));
        return Math.max(1, m * 60 + s);
    }

    // ── Custom Cycles Helpers ─────────────────────────────────────

    // Returns work seconds for a specific cycle index (wraps in infinite mode)
    function getCycleWorkSec(idx) {
        if (!pomCustomMode || pomCyclesList.length === 0) return getPomWorkSec();
        const c = pomCyclesList[idx % pomCyclesList.length];
        return Math.max(1, c.workMin * 60 + c.workSec);
    }

    // Returns break seconds for a specific cycle index (wraps in infinite mode)
    function getCycleBreakSec(idx) {
        if (!pomCustomMode || pomCyclesList.length === 0) return getPomBreakSec();
        const c = pomCyclesList[idx % pomCyclesList.length];
        return Math.max(1, c.breakMin * 60 + c.breakSec);
    }

    function renderCycleRows() {
        pomCycleListEl.innerHTML = '';
        pomCyclesList.forEach((c, i) => {
            const wm = String(c.workMin).padStart(2, '0');
            const ws = String(c.workSec).padStart(2, '0');
            const bm = String(c.breakMin).padStart(2, '0');
            const bs = String(c.breakSec).padStart(2, '0');
            const row = document.createElement('div');
            row.className = 'pom-cycle-row';
            row.dataset.idx = i;
            row.innerHTML = `
                <span class="pom-cycle-row__num">${i + 1}</span>
                <div class="pom-cycle-row__times">
                    <span class="pom-cycle-row__badge">
                        <i class="fa-solid fa-brain" aria-hidden="true"></i>
                        <span>${wm}:${ws}</span>
                    </span>
                    <span class="pom-cycle-row__arrow" aria-hidden="true">→</span>
                    <span class="pom-cycle-row__badge pom-cycle-row__badge--break">
                        <i class="fa-solid fa-mug-hot" aria-hidden="true"></i>
                        <span>${bm}:${bs}</span>
                    </span>
                </div>
                <button class="pom-cycle-row__edit" type="button" aria-label="Modifica ciclo ${i + 1}">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="pom-cycle-row__del" type="button" aria-label="Elimina ciclo ${i + 1}"${pomCyclesList.length === 1 ? ' disabled' : ''}>
                    <i class="fa-solid fa-trash-can"></i>
                </button>`;
            row.querySelector('.pom-cycle-row__edit').addEventListener('click', () => openCycleSheet(i));
            row.querySelector('.pom-cycle-row__del').addEventListener('click', () => {
                if (pomCyclesList.length <= 1) return;
                pomCyclesList.splice(i, 1);
                pomCyclesInput.value = pomCyclesList.length;
                if (isPomodoroMode) updatePhaseLabel();
                renderCycleRows();
            });
            pomCycleListEl.appendChild(row);
        });
    }

    function addNewCycle() {
        const last = pomCyclesList[pomCyclesList.length - 1] || { workMin: 25, workSec: 0, breakMin: 5, breakSec: 0 };
        pomCyclesList.push({ ...last });
        pomCyclesInput.value = pomCyclesList.length;
        if (isPomodoroMode) updatePhaseLabel();
        renderCycleRows();
        setTimeout(() => pomCycleListEl.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }

    function toggleCustomMode() {
        if (isRunning) return;
        if (!pomCustomMode) {
            const n    = Math.max(1, parseInt(pomCyclesInput.value, 10) || 4);
            const wMin = Math.max(0, parseInt(pomWorkMinInput.value, 10) || 0);
            const wSec = Math.min(59, Math.max(0, parseInt(pomWorkSecInput.value, 10) || 0));
            const bMin = Math.max(0, parseInt(pomBreakMinInput.value, 10) || 0);
            const bSec = Math.min(59, Math.max(0, parseInt(pomBreakSecInput.value, 10) || 0));
            pomCyclesList = Array.from({ length: n }, () => ({ workMin: wMin, workSec: wSec, breakMin: bMin, breakSec: bSec }));
            pomCustomMode = true;
            pomCustomCyclesBtn.setAttribute('aria-pressed', 'true');
            pomCustomCyclesBtn.classList.add('pom-config__custom-btn--active');
            pomCyclesInput.disabled = true;
            document.getElementById('pom-cycles-dec').disabled = true;
            document.getElementById('pom-cycles-inc').disabled = true;
            pomInfiniteBtn.disabled = true;
            renderCycleRows();
            openCustomEditor();
            if (isPomodoroMode && !isRunning) {
                totalSeconds = getCycleWorkSec(pomCyclesCompleted);
                currentSeconds = totalSeconds;
                updateDisplay();
            }
            if (isPomodoroMode) updatePhaseLabel();
        } else if (pomCyclesEditor.hidden) {
            // Custom mode already on, modal closed → just re-open it
            openCustomEditor();
        } else {
            // Custom mode on AND modal visible → deactivate entirely
            pomCustomMode = false;
            pomCyclesList = [];
            pomCustomCyclesBtn.setAttribute('aria-pressed', 'false');
            pomCustomCyclesBtn.classList.remove('pom-config__custom-btn--active');
            pomCyclesInput.disabled = pomIsInfinite;
            document.getElementById('pom-cycles-dec').disabled = false;
            document.getElementById('pom-cycles-inc').disabled = false;
            pomInfiniteBtn.disabled = false;
            closeCustomEditor();
            if (isPomodoroMode && !isRunning) {
                totalSeconds = getPomWorkSec();
                currentSeconds = totalSeconds;
                updateDisplay();
            }
            if (isPomodoroMode) updatePhaseLabel();
        }
    }

    function openCustomEditor() {
        pomCyclesEditorBd.hidden = false;
        pomCyclesEditor.hidden   = false;
        document.body.style.overflow = 'hidden';
    }

    function closeCustomEditor() {
        pomCyclesEditorBd.hidden = true;
        pomCyclesEditor.hidden   = true;
        document.body.style.overflow = '';
    }

    // ── Cycle Sheet (drum picker per singolo ciclo) ───────────────

    let cteBuilt = false;

    function buildCycleSheetDrums() {
        if (cteBuilt) return;
        cteBuilt = true;
        buildDrum(document.getElementById('cte-drum-work-min'),  cteWorkMinInput,  0, 120);
        buildDrum(document.getElementById('cte-drum-work-sec'),  cteWorkSecInput,  0,  59);
        buildDrum(document.getElementById('cte-drum-break-min'), cteBreakMinInput, 0,  60);
        buildDrum(document.getElementById('cte-drum-break-sec'), cteBreakSecInput, 0,  59);
    }

    function openCycleSheet(idx) {
        editingCycleIdx = idx;
        buildCycleSheetDrums();
        const c = pomCyclesList[idx];
        cteWorkMinInput.value  = c.workMin;
        cteWorkSecInput.value  = c.workSec;
        cteBreakMinInput.value = c.breakMin;
        cteBreakSecInput.value = c.breakSec;
        const dmWM = document.getElementById('cte-drum-work-min');
        const dmWS = document.getElementById('cte-drum-work-sec');
        const dmBM = document.getElementById('cte-drum-break-min');
        const dmBS = document.getElementById('cte-drum-break-sec');
        if (dmWM._setVal)  dmWM._setVal(c.workMin);
        if (dmWS._setVal)  dmWS._setVal(c.workSec);
        if (dmBM._setVal)  dmBM._setVal(c.breakMin);
        if (dmBS._setVal)  dmBS._setVal(c.breakSec);
        cycleSheetTitle.textContent = `MODIFICA CICLO ${idx + 1}`;
        cycleSheetBackdrop.hidden = false;
        cycleSheet.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeCycleSheet() {
        editingCycleIdx = -1;
        cycleSheet.hidden = true;
        cycleSheetBackdrop.hidden = true;
        document.body.style.overflow = '';
    }

    function saveCycleSheet() {
        if (editingCycleIdx < 0 || !pomCyclesList[editingCycleIdx]) { closeCycleSheet(); return; }
        pomCyclesList[editingCycleIdx] = {
            workMin:  Math.max(0, parseInt(cteWorkMinInput.value, 10) || 0),
            workSec:  Math.min(59, Math.max(0, parseInt(cteWorkSecInput.value, 10) || 0)),
            breakMin: Math.max(0, parseInt(cteBreakMinInput.value, 10) || 0),
            breakSec: Math.min(59, Math.max(0, parseInt(cteBreakSecInput.value, 10) || 0)),
        };
        // Ensure at least 1 second of focus time
        const c = pomCyclesList[editingCycleIdx];
        if (c.workMin === 0 && c.workSec === 0) c.workSec = 1;
        // Update timer display if currently on this cycle's work phase
        if (isPomodoroMode && !isRunning && pomPhase === 'work' && pomCyclesCompleted === editingCycleIdx) {
            totalSeconds = getCycleWorkSec(editingCycleIdx);
            currentSeconds = totalSeconds;
            updateDisplay();
        }
        renderCycleRows();
        closeCycleSheet();
    }

    function updatePhaseLabel() {
        phaseLabel.className = 'phase-label';
        if (!isPomodoroMode) { phaseLabel.textContent = ''; return; }
        const maxCycles = pomCustomMode
            ? pomCyclesList.length
            : Math.max(1, parseInt(pomCyclesInput.value, 10) || 4);
        const cycleStr = pomIsInfinite ? '\u221e' : `${pomCyclesCompleted + 1} / ${maxCycles}`;
        if (pomPhase === 'work') {
            phaseLabel.textContent = `— FOCUS \u2014  ${cycleStr}`;
            phaseLabel.classList.add('phase-label--work');
        } else {
            phaseLabel.textContent = `— BREAK \u2014  ${cycleStr}`;
            phaseLabel.classList.add('phase-label--break');
        }
    }

    function updateRingTheme() {
        if (isPomodoroMode && pomPhase === 'break') {
            progressRing.classList.add('timer__progress--break');
            progressTrack.classList.add('timer__track--break');
        } else {
            progressRing.classList.remove('timer__progress--break');
            progressTrack.classList.remove('timer__track--break');
        }
    }

    function addTomato() {
        pomCount++;
        const item = document.createElement('span');
        item.className = 'tomatoes__item';
        item.textContent = '🍅';
        item.setAttribute('title', `Pomodoro #${pomCount}`);
        tomatoesTray.appendChild(item);
        // Salva nella cronologia locale e aggiorna pulsante
        savePomodoroToHistory(totalSeconds);
        updateHistoryBtnVisibility();
        // Aggiorna obiettivo giornaliero
        updateDailyGoal();
        // Aggiorna badge streak in auth-bar
        window.updateStreakBadge?.();
        // Mostra nudge registrazione per utenti ospite dopo primo pomodoro
        window.showAnonNudgeIfNeeded?.();
        // Salva su Firestore se l'utente è autenticato
        window.savePomodoro?.(totalSeconds);
    }

    // Blocca il click sul display durante la modalità pomodoro
    function blockDisplayEdit(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }

    function enterPomodoroMode() {
        isPomodoroMode = true;
        pomPhase = 'work';
        pomCount = 0;
        pomCyclesCompleted = 0;
        tomatoesTray.innerHTML = '';

        stopTimer();
        totalSeconds = getCycleWorkSec(0);
        currentSeconds = totalSeconds;
        updateDisplay();
        updatePhaseLabel();
        updateRingTheme();

        pomConfig.classList.add('pom-config--visible');
        pomConfig.removeAttribute('aria-hidden');
        tomatoesEl.classList.add('tomatoes--visible');
        tomatoesEl.removeAttribute('aria-hidden');
        pomSwitchEl.classList.add('pom-switch--active');

        // Mostra il bottone chevron e segna i settings come aperti
        pomSettingsOpen = true;
        if (pomSettingsBtn) {
            pomSettingsBtn.hidden = false;
            pomSettingsBtn.setAttribute('aria-expanded', 'true');
        }
        if (pomSettingsChevron) pomSettingsChevron.className = 'fa-solid fa-chevron-up pom-switch__settings-chevron';
        document.querySelector('.app')?.classList.remove('pom-settings--collapsed');

        presetsHeader.classList.add('presets--pomodoro');
        timeDisplay.contentEditable = 'false';
        timeDisplay.addEventListener('click', blockDisplayEdit, true);
    }

    function exitPomodoroMode() {
        isPomodoroMode = false;
        stopTimer();

        pomConfig.classList.remove('pom-config--visible');
        pomConfig.setAttribute('aria-hidden', 'true');
        tomatoesEl.classList.remove('tomatoes--visible');
        tomatoesEl.setAttribute('aria-hidden', 'true');
        pomSwitchEl.classList.remove('pom-switch--active');

        // Nasconde chevron e rimuove stato collasso
        pomSettingsOpen = false;
        if (pomSettingsBtn) pomSettingsBtn.hidden = true;
        document.querySelector('.app')?.classList.remove('pom-settings--collapsed');

        // Chiude cycles editor se aperto
        closeCustomEditor();

        updatePhaseLabel();
        updateRingTheme();

        presetsHeader.classList.remove('presets--pomodoro');
        timeDisplay.removeEventListener('click', blockDisplayEdit, true);

        totalSeconds = 300;
        currentSeconds = totalSeconds;
        updateDisplay();
        presetBtns.forEach(b => b.classList.remove('presets__btn--active'));
    }

    function togglePomSettings() {
        pomSettingsOpen = !pomSettingsOpen;
        if (pomSettingsOpen) {
            pomConfig.classList.add('pom-config--visible');
            pomConfig.removeAttribute('aria-hidden');
            if (pomSettingsBtn) pomSettingsBtn.setAttribute('aria-expanded', 'true');
            if (pomSettingsChevron) pomSettingsChevron.className = 'fa-solid fa-chevron-up pom-switch__settings-chevron';
            document.querySelector('.app')?.classList.remove('pom-settings--collapsed');
        } else {
            pomConfig.classList.remove('pom-config--visible');
            pomConfig.setAttribute('aria-hidden', 'true');
            if (pomSettingsBtn) pomSettingsBtn.setAttribute('aria-expanded', 'false');
            if (pomSettingsChevron) pomSettingsChevron.className = 'fa-solid fa-chevron-down pom-switch__settings-chevron';
            document.querySelector('.app')?.classList.add('pom-settings--collapsed');
        }
    }

    // Helper: format time for display
    function formatTime(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;

        let formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        if (h > 0) {
            formatted = `${h.toString().padStart(2, '0')}:${formatted}`;
        }
        return formatted;
    }

    // Helper: parse string to seconds
    function parseTimeInput(inputStr) {
        const parts = inputStr.trim().split(':');
        let sec = 0;

        if (parts.length === 1) {
            // Only minutes
            const m = parseInt(parts[0], 10);
            if (!isNaN(m)) sec = m * 60;
        } else if (parts.length === 2) {
            // MM:SS
            const m = parseInt(parts[0], 10);
            const s = parseInt(parts[1], 10);
            if (!isNaN(m) && !isNaN(s)) sec = (m * 60) + s;
        } else if (parts.length === 3) {
            // HH:MM:SS
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const s = parseInt(parts[2], 10);
            if (!isNaN(h) && !isNaN(m) && !isNaN(s)) sec = (h * 3600) + (m * 60) + s;
        }
        return sec;
    }

    // Update Display DOM
    function updateDisplay() {
        const timeString = formatTime(currentSeconds);
        if (document.activeElement !== timeDisplay) {
            timeDisplay.textContent = timeString;
        }
        document.title = `${timeString} - Futuristic Timer`;
        updateRing();
    }

    // Controls
    function startTimer() {
        if (isRunning || currentSeconds <= 0) return;
        requestPermissions();

        isRunning = true;
        updateToggleButton();
        timeDisplay.contentEditable = "false";

        timerId = setInterval(() => {
            currentSeconds--;
            updateDisplay();

            if (currentSeconds <= 0) {
                stopTimer();
                timerComplete();
            }
        }, 1000);
    }

    function stopTimer() {
        if (!isRunning) return;
        isRunning = false;
        clearInterval(timerId);
        updateToggleButton();
        stopAlarm();
    }

    function resetTimer() {
        stopTimer();
        currentSeconds = totalSeconds;
        updateDisplay();
    }

    function updateToggleButton() {
        if (isRunning) {
            toggleBtn.disabled = true;
            toggleText.textContent = 'START';
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            toggleBtn.style.color = '#000';
            toggleBtn.style.borderColor = 'transparent';
            toggleBtn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)';
            pauseBtn.disabled = false;
        } else {
            toggleBtn.disabled = false;
            const isPaused = currentSeconds < totalSeconds && currentSeconds > 0;
            toggleText.textContent = isPaused ? 'RIPRENDI' : 'START';
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            toggleBtn.style.color = '#000';
            toggleBtn.style.borderColor = 'transparent';
            toggleBtn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)';
            pauseBtn.disabled = true;
        }
    }

    // Handle timer completion
    function timerComplete() {
        try { playAlarm(); } catch (e) { /* audio non disponibile */ }

        if (isPomodoroMode) {
            if (pomPhase === 'work') {
                addTomato();

                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification(`🍅 Sessione focus #${pomCount} completata!`, {
                        body: `Prenditi una pausa di ${formatTime(getCycleBreakSec(pomCyclesCompleted))}.`
                    });
                }

                pomPhase = 'break';
                totalSeconds = getCycleBreakSec(pomCyclesCompleted);
                currentSeconds = totalSeconds;
                updatePhaseLabel();
                updateRingTheme();
                updateDisplay();
                toastSpan.textContent = `🍅  +1 pomodoro! Pausa ${formatTime(getCycleBreakSec(pomCyclesCompleted))} in arrivo…`;
            } else {
                pomCyclesCompleted++;
                const maxCycles = pomCustomMode
                    ? pomCyclesList.length
                    : Math.max(1, parseInt(pomCyclesInput.value, 10) || 4);
                const allDone = !pomIsInfinite && pomCyclesCompleted >= maxCycles;

                if (allDone) {
                    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                        new Notification(`🏆 Sessione completata!`, {
                            body: `${pomCount} pomodor${pomCount === 1 ? 'o' : 'i'} in ${pomCyclesCompleted} cicl${pomCyclesCompleted === 1 ? 'o' : 'i'}!`
                        });
                    }
                    pomPhase = 'work';
                    pomCyclesCompleted = 0;
                    totalSeconds = getCycleWorkSec(0);
                    currentSeconds = totalSeconds;
                    updatePhaseLabel();
                    updateRingTheme();
                    updateDisplay();
                    toastSpan.textContent = `🏆 ${pomCount} pomodor${pomCount === 1 ? 'o' : 'i'} raccolti — sessione completata!`;
                    toast.classList.add('toast--visible');
                    setTimeout(() => toast.classList.remove('toast--visible'), 5000);
                    return;
                }

                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('⚡ Break terminato! Nuova sessione focus.', {
                        body: `Pomodori completati: ${pomCount}`
                    });
                }

                pomPhase = 'work';
                totalSeconds = getCycleWorkSec(pomCyclesCompleted);
                currentSeconds = totalSeconds;
                updatePhaseLabel();
                updateRingTheme();
                updateDisplay();
                toastSpan.textContent = '⚡  Break terminato! Nuova sessione focus.';
            }

            toast.classList.add('toast--visible');
            setTimeout(() => {
                toast.classList.remove('toast--visible');
                startTimer();
            }, 3000);

        } else {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('Timer Completato!', {
                    body: 'Il conto alla rovescia è terminato.',
                    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⏰</text></svg>"
                });
            }

            toastSpan.textContent = 'Timer Completato!';
            toast.classList.add('toast--visible');
            setTimeout(() => toast.classList.remove('toast--visible'), 5000);
        }
    }

    // Permissions
    function requestPermissions() {
        if (!hasInteracted) {
            hasInteracted = true;
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            // Notification perm
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }

    // Event Listeners: Presets
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            requestPermissions();
            playClick();
            presetBtns.forEach(b => b.classList.remove('presets__btn--active'));
            btn.classList.add('presets__btn--active');

            const newTime = parseInt(btn.getAttribute('data-time'), 10);
            totalSeconds = newTime;
            currentSeconds = newTime;
            updateDisplay();

            // Auto start? As per instructions, maybe just set it or let user start.
            // Let's reset but not start, to let user decide. Or if running, restart.
            stopTimer();
        });
    });

    // Event Listeners: Editable Timer
    timeDisplay.addEventListener('click', () => {
        requestPermissions();
        if (isRunning) {
            playPause();
        } else {
            playClick();
        }
        stopTimer();
        timeDisplay.contentEditable = "true";
        timeDisplay.focus();

        // Select all text for easy replacement
        document.execCommand('selectAll', false, null);
    });

    timeDisplay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            timeDisplay.blur();
        }
    });

    timeDisplay.addEventListener('blur', () => {
        timeDisplay.contentEditable = "false";
        if (isPomodoroMode) return;
        const input = timeDisplay.textContent || "0";
        const newSec = parseTimeInput(input);

        if (newSec > 0) {
            totalSeconds = newSec;
            currentSeconds = newSec;
            updateDisplay();
            // User requirement: "e rifar partire il timer con il nuovo valore" -> restart automatically
            startTimer();
        } else {
            // Invalid or 0 input, revert to previous
            updateDisplay();
        }

        // Clear active presets
        presetBtns.forEach(b => b.classList.remove('presets__btn--active'));
    });

    // Event Listeners: Controls
    toggleBtn.addEventListener('mousedown', () => {
        requestPermissions();
        playStart();
        startTimer();
        // Chiude i settings pomodoro al click su START (solo su mobile con settings aperte)
        if (isPomodoroMode && pomSettingsOpen) {
            togglePomSettings();
        }
    });

    pauseBtn.addEventListener('mousedown', () => {
        requestPermissions();
        playPause();
        stopTimer();
    });

    resetBtn.addEventListener('mousedown', () => {
        requestPermissions();
        playPause();
        resetTimer();
    });

    // Pomodoro toggle
    pomToggle.addEventListener('change', () => {
        if (pomToggle.checked) {
            enterPomodoroMode();
        } else {
            exitPomodoroMode();
        }
    });

    // Chevron toggle settings
    if (pomSettingsBtn) {
        pomSettingsBtn.addEventListener('click', () => {
            togglePomSettings();
        });
    }

    // Live-update timer when config inputs change (only when stopped, correct phase)
    [pomWorkMinInput, pomWorkSecInput].forEach(el => {
        el.addEventListener('input', () => {
            if (!isPomodoroMode || isRunning || pomPhase !== 'work') return;
            totalSeconds = getPomWorkSec();
            currentSeconds = totalSeconds;
            updateDisplay();
        });
    });

    [pomBreakMinInput, pomBreakSecInput].forEach(el => {
        el.addEventListener('input', () => {
            if (!isPomodoroMode || isRunning || pomPhase !== 'break') return;
            totalSeconds = getPomBreakSec();
            currentSeconds = totalSeconds;
            updateDisplay();
        });
    });

    // Cycles count input — aggiorna label in tempo reale
    pomCyclesInput.addEventListener('input', () => {
        if (isPomodoroMode) updatePhaseLabel();
    });

    // Stepper −/+ cicli (mobile touch)
    document.getElementById('pom-cycles-dec').addEventListener('click', () => {
        if (pomCyclesInput.disabled) return;
        const v = Math.max(1, (parseInt(pomCyclesInput.value, 10) || 4) - 1);
        pomCyclesInput.value = v;
        if (isPomodoroMode) updatePhaseLabel();
    });
    document.getElementById('pom-cycles-inc').addEventListener('click', () => {
        if (pomCyclesInput.disabled) return;
        const v = Math.min(99, (parseInt(pomCyclesInput.value, 10) || 4) + 1);
        pomCyclesInput.value = v;
        if (isPomodoroMode) updatePhaseLabel();
    });

    // Infinite toggle
    pomInfiniteBtn.addEventListener('click', () => {
        pomIsInfinite = !pomIsInfinite;
        pomInfiniteBtn.classList.toggle('pom-config__infinite-btn--active', pomIsInfinite);
        pomInfiniteBtn.setAttribute('aria-pressed', String(pomIsInfinite));
        pomCyclesInput.disabled = pomIsInfinite;
        if (isPomodoroMode) updatePhaseLabel();
    });

    // Custom cycles toggle + editor controls
    pomCustomCyclesBtn.addEventListener('click', toggleCustomMode);
    pomCyclesEditorClose.addEventListener('click', closeCustomEditor);
    pomCyclesEditorBd.addEventListener('click', closeCustomEditor);
    pomAddCycleBtn.addEventListener('click', addNewCycle);

    // START button: close editor + start timer
    pomCycleStartBtn.addEventListener('click', () => {
        closeCustomEditor();
        if (isPomodoroMode && !isRunning) {
            requestPermissions();
            playStart();
            startTimer();
        }
    });

    // Cycle sheet (single cycle drum picker) controls
    cycleSheetClose.addEventListener('click', closeCycleSheet);
    cycleSheetCancel.addEventListener('click', closeCycleSheet);
    cycleSheetBackdrop.addEventListener('click', closeCycleSheet);
    cycleSheetSave.addEventListener('click', saveCycleSheet);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !cycleSheet.hidden) { closeCycleSheet(); return; }
        if (e.key === 'Escape' && !pomCyclesEditor.hidden) closeCustomEditor();
    });

    // Keyboard shortcuts: Space → start, P → pausa, R → reset
    document.addEventListener('keydown', (e) => {
        if (typeof window.isAuthModalOpen === 'function' && window.isAuthModalOpen()) return;
        const tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement === timeDisplay) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (!isRunning) {
                    requestPermissions();
                    playStart();
                    startTimer();
                }
                break;
            case 'KeyP':
                e.preventDefault();
                if (isRunning) {
                    requestPermissions();
                    playPause();
                    stopTimer();
                }
                break;
            case 'KeyR':
                e.preventDefault();
                requestPermissions();
                playPause();
                resetTimer();
                break;
        }
    });
});

// ── Service Worker (PWA) ─────────────────────────────────────────
if ('serviceWorker' in navigator) {
    // ── Elementi banner aggiornamento ──────────────────────────
    const updateBanner   = document.getElementById('update-banner');
    const updateApplyBtn = document.getElementById('update-apply-btn');
    const updateDismiss  = document.getElementById('update-dismiss-btn');
    let pendingWorker    = null; // SW in attesa di attivazione

    function showUpdateBanner(worker) {
        pendingWorker = worker;
        updateBanner.hidden = false;
    }

    function hideUpdateBanner() {
        updateBanner.hidden = true;
        pendingWorker = null;
    }

    // "AGGIORNA" → invia skip al SW in attesa → controllerchange → reload
    updateApplyBtn.addEventListener('click', () => {
        if (pendingWorker) {
            pendingWorker.postMessage('SKIP_WAITING');
        }
    });

    // "×" → l'utente rimanda: il banner sparisce ma al prossimo caricamento
    //       il SW in attesa sarà ancora lì e verrà di nuovo proposto
    updateDismiss.addEventListener('click', hideUpdateBanner);

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {

            // ── Versione attiva loggata in console per il developer ──
            navigator.serviceWorker.addEventListener('message', (e) => {
                if (e.data?.type === 'SW_VERSION') {
                    console.info(`[PWA] 🟢 Service Worker attivo  •  build ${e.data.version}`);
                }
            });

            // ── Nuovo SW trovato: mostra banner quando entra in "installed" ──
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    // 'installed' + controller esistente = update in attesa (non prima installazione)
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.info('[PWA] 🟡 Aggiornamento disponibile — mostra banner');
                        showUpdateBanner(newWorker);
                    }
                });
            });

            // ── iOS fix: controlla se c'è già un SW in attesa al ritorno in foreground ──
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    reg.update().catch(() => {}); // forza ricontrollo su Vercel
                    if (reg.waiting && navigator.serviceWorker.controller) {
                        showUpdateBanner(reg.waiting);
                    }
                }
            });

            // ── Controllo periodico ogni 30 min (sessioni lunghe) ──────
            setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

        }).catch(() => { /* SW non disponibile in questo ambiente */ });

        // ── Controller cambiato → il nuovo SW è attivo → ricarica ───
        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!reloading) {
                reloading = true;
                hideUpdateBanner();
                window.location.reload();
            }
        });
    });
}
