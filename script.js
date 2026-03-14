document.addEventListener('DOMContentLoaded', () => {
    // State
    let totalSeconds = 300; // Default 5 min
    let currentSeconds = totalSeconds;
    let timerId = null;
    let isRunning = false;
    let hasInteracted = false;

    // Elements
    const timeDisplay = document.getElementById('time-display');
    const presetBtns = document.querySelectorAll('.preset-btn');
    const toggleBtn = document.getElementById('toggle-btn');
    const toggleText = document.getElementById('toggle-text');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const toast = document.getElementById('toast');

    // Init
    updateDisplay();

    // Sound Synthesis (Web Audio API)
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playSynthBeep(freq, type, duration, vol=0.1) {
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
            toggleBtn.classList.remove('paused');
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
        // Sound
        playAlarm();

        // Browser Notification
        if (Notification.permission === 'granted') {
            new Notification("Timer Completato!", {
                body: "Il conto alla rovescia è terminato.",
                icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⏰</text></svg>"
            });
        }

        // In-app Toast
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 5000);
    }

    // Permissions
    function requestPermissions() {
        if (!hasInteracted) {
            hasInteracted = true;
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            // Notification perm
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }
        }
    }

    // Event Listeners: Presets
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            requestPermissions();
            playClick();
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

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
        presetBtns.forEach(b => b.classList.remove('active'));
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
        playPause(); // Sound for reset
        resetTimer();
    });
});
