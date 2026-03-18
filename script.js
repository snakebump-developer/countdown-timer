document.addEventListener('DOMContentLoaded', () => {
    // Constants
    const CIRCUMFERENCE = 2 * Math.PI * 45; // ≈ 282.74 (r=45, viewBox 100×100)

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

    // Init
    updateDisplay();
    updateRing();

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

    function updatePhaseLabel() {
        phaseLabel.className = 'phase-label';
        if (!isPomodoroMode) { phaseLabel.textContent = ''; return; }
        const maxCycles = Math.max(1, parseInt(pomCyclesInput.value, 10) || 4);
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
        // Salva su Firestore se l'utente è autenticato
        window.savePomodoro?.();
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
        totalSeconds = getPomWorkSec();
        currentSeconds = totalSeconds;
        updateDisplay();
        updatePhaseLabel();
        updateRingTheme();

        pomConfig.classList.add('pom-config--visible');
        pomConfig.removeAttribute('aria-hidden');
        tomatoesEl.classList.add('tomatoes--visible');
        tomatoesEl.removeAttribute('aria-hidden');
        pomSwitchEl.classList.add('pom-switch--active');

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

        updatePhaseLabel();
        updateRingTheme();

        presetsHeader.classList.remove('presets--pomodoro');
        timeDisplay.removeEventListener('click', blockDisplayEdit, true);

        totalSeconds = 300;
        currentSeconds = totalSeconds;
        updateDisplay();
        presetBtns.forEach(b => b.classList.remove('presets__btn--active'));
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
                        body: `Prenditi una pausa di ${formatTime(getPomBreakSec())}.`
                    });
                }

                pomPhase = 'break';
                totalSeconds = getPomBreakSec();
                currentSeconds = totalSeconds;
                updatePhaseLabel();
                updateRingTheme();
                updateDisplay();
                toastSpan.textContent = `🍅  +1 pomodoro! Pausa ${formatTime(getPomBreakSec())} in arrivo…`;
            } else {
                pomCyclesCompleted++;
                const maxCycles = Math.max(1, parseInt(pomCyclesInput.value, 10) || 4);
                const allDone = !pomIsInfinite && pomCyclesCompleted >= maxCycles;

                if (allDone) {
                    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                        new Notification(`🏆 Sessione completata!`, {
                            body: `${pomCount} pomodor${pomCount === 1 ? 'o' : 'i'} in ${pomCyclesCompleted} cicl${pomCyclesCompleted === 1 ? 'o' : 'i'}!`
                        });
                    }
                    pomPhase = 'work';
                    pomCyclesCompleted = 0;
                    totalSeconds = getPomWorkSec();
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
                totalSeconds = getPomWorkSec();
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

    // Infinite toggle
    pomInfiniteBtn.addEventListener('click', () => {
        pomIsInfinite = !pomIsInfinite;
        pomInfiniteBtn.classList.toggle('pom-config__infinite-btn--active', pomIsInfinite);
        pomInfiniteBtn.setAttribute('aria-pressed', String(pomIsInfinite));
        pomCyclesInput.disabled = pomIsInfinite;
        if (isPomodoroMode) updatePhaseLabel();
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
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('./sw.js')
            .catch(() => { /* SW non disponibile in questo ambiente */ });
    });
}
