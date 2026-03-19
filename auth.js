// auth.js — Autenticazione Firebase + persistenza Firestore
import { initializeApp }                from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    sendEmailVerification,
    GoogleAuthProvider,
    signInWithPopup,
} from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    arrayUnion,
    increment,
    serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey:            'AIzaSyDdZyRJQZg4i5kkW1MFWWvGbYRwQRSzisQ',
    authDomain:        'futuristic-pomodoro-timer.firebaseapp.com',
    projectId:         'futuristic-pomodoro-timer',
    storageBucket:     'futuristic-pomodoro-timer.firebasestorage.app',
    messagingSenderId: '164082682724',
    appId:             '1:164082682724:web:10a7c347addeb7566fc871',
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── DOM references ────────────────────────────────────────────
const authOpenBtn   = document.getElementById('auth-open-btn');
const authModal     = document.getElementById('auth-modal');
const authBackdrop  = document.getElementById('auth-backdrop');
const authCloseBtn  = document.getElementById('auth-close-btn');
const authUserEl    = document.getElementById('auth-user');
const authEmailEl   = document.getElementById('auth-email');
const authCountEl   = document.getElementById('auth-total-count');
const authLogoutBtn = document.getElementById('auth-logout-btn');

const tabLogin      = document.getElementById('tab-login');
const tabRegister   = document.getElementById('tab-register');
const panelLogin    = document.getElementById('panel-login');
const panelRegister = document.getElementById('panel-register');

const loginEmailInput    = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorEl       = document.getElementById('login-error');
const loginSubmitBtn     = document.getElementById('login-submit');

const regEmailInput    = document.getElementById('reg-email');
const regPasswordInput = document.getElementById('reg-password');
const regErrorEl       = document.getElementById('reg-error');
const regSubmitBtn     = document.getElementById('reg-submit');

// Nuovi ref per hint per campo e barra forza password
const loginEmailHintEl    = document.getElementById('login-email-hint');
const loginPasswordHintEl = document.getElementById('login-password-hint');
const regEmailHintEl      = document.getElementById('reg-email-hint');
const regPasswordHintEl   = document.getElementById('reg-password-hint');
const regStrengthBar      = document.getElementById('reg-strength-bar');

// Ref per reset password e verifica email
const forgotPasswordBtn  = document.getElementById('forgot-password-btn');
const verifyNoticeEl     = document.getElementById('verify-notice');
const resendVerifyBtn    = document.getElementById('resend-verify-btn');
const dismissVerifyBtn   = document.getElementById('dismiss-verify-btn');

// Ref bottoni Google
const googleLoginBtn    = document.getElementById('google-login-btn');
const googleRegisterBtn = document.getElementById('google-register-btn');

const googleProvider = new GoogleAuthProvider();

// Ref profile panel + streak badge
const profilePanel       = document.getElementById('profile-panel');
const profileBackdrop    = document.getElementById('profile-backdrop');
const profileCloseBtn    = document.getElementById('profile-close-btn');
const profileAvatar      = document.getElementById('profile-avatar');
const profileDisplayName = document.getElementById('profile-display-name');
const profileEmailSmall  = document.getElementById('profile-email-small');
const profileStreakVal   = document.getElementById('profile-streak-val');
const profileTotalVal    = document.getElementById('profile-total-val');
const profileTodayVal    = document.getElementById('profile-today-val');
const profileLogoutBtn   = document.getElementById('profile-logout-btn');
const authStreakCount    = document.getElementById('auth-streak-count');
const authMiniAvatar     = document.getElementById('auth-mini-avatar');

// ── Auth snack notification ──────────────────────────────
const authSnackEl   = document.getElementById('auth-snack');
const authSnackIcon = document.getElementById('auth-snack-icon');
const authSnackText = document.getElementById('auth-snack-text');

let snackTimer = null;

function showVerifyNotice() {
    if (verifyNoticeEl) verifyNoticeEl.hidden = false;
}

function hideVerifyNotice() {
    if (verifyNoticeEl) verifyNoticeEl.hidden = true;
}

// ── Streak & stats helpers ─────────────────────────────────────
const HISTORY_KEY_LOCAL = 'pom_history';

function calcStreak() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY_LOCAL) || '[]');
    if (!history.length) return 0;
    const daySet = new Set(history.map(e => {
        const d = new Date(e.ts);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }));
    let streak = 0;
    const cur = new Date();
    const todayKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    // Se oggi non ha ancora pomodori, lo streak parte da ieri
    if (!daySet.has(todayKey)) cur.setDate(cur.getDate() - 1);
    while (true) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        if (!daySet.has(key)) break;
        streak++;
        cur.setDate(cur.getDate() - 1);
    }
    return streak;
}

function calcToday() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY_LOCAL) || '[]');
    const now = new Date();
    return history.filter(e => {
        const d = new Date(e.ts);
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth()    === now.getMonth()    &&
               d.getDate()     === now.getDate();
    }).length;
}

function updateStreakBadge() {
    const s = calcStreak();
    if (authStreakCount) authStreakCount.textContent = s;
}
window.updateStreakBadge = updateStreakBadge;

// ── Profile Panel ──────────────────────────────────────────────
function openProfilePanel(user) {
    const streak     = calcStreak();
    const todayCount = calcToday();
    const total      = parseInt(authCountEl.textContent, 10) || 0;
    const displayName = user.displayName || user.email?.split('@')[0] || 'Utente';
    profileAvatar.textContent      = displayName.charAt(0).toUpperCase();
    profileDisplayName.textContent = user.displayName || user.email?.split('@')[0] || 'Utente';
    profileEmailSmall.textContent  = user.email || '';
    profileStreakVal.textContent    = streak;
    profileTotalVal.textContent    = total;
    profileTodayVal.textContent    = todayCount;
    profilePanel.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeProfilePanel() {
    profilePanel.hidden = true;
    document.body.style.overflow = '';
}

function showAuthSnack(message, type = 'success') {
    const iconMap = {
        success: 'fa-circle-check',
        error:   'fa-circle-xmark',
        info:    'fa-circle-info',
        warning: 'fa-triangle-exclamation',
    };
    authSnackEl.className   = `auth-snack auth-snack--${type} auth-snack--visible`;
    authSnackIcon.className = `auth-snack__icon fa-solid ${iconMap[type] ?? 'fa-circle-check'}`;
    authSnackText.textContent = message;
    if (snackTimer) clearTimeout(snackTimer);
    snackTimer = setTimeout(() => authSnackEl.classList.remove('auth-snack--visible'), 3500);
}

// ── Validation helpers ────────────────────────────────
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(pass) {
    let score = 0;
    if (pass.length >= 6)           score++;
    if (pass.length >= 10)          score++;
    if (/[A-Z]/.test(pass))         score++;
    if (/[0-9]/.test(pass))         score++;
    if (/[^A-Za-z0-9]/.test(pass))  score++;
    return score; // 0‑5
}

function setFieldState(input, hint, state, message = '') {
    input.classList.remove('auth-modal__input--error', 'auth-modal__input--valid');
    if (hint) {
        hint.textContent = message;
        hint.className   = 'auth-modal__field-hint';
    }
    if (state === 'error') {
        input.classList.add('auth-modal__input--error');
        if (hint) hint.classList.add('auth-modal__field-hint--error');
    } else if (state === 'valid') {
        input.classList.add('auth-modal__input--valid');
        if (hint) hint.classList.add('auth-modal__field-hint--ok');
    }
}

function updateStrengthBar(password) {
    if (!regStrengthBar) return;
    if (!password) {
        regStrengthBar.style.width = '0';
        regStrengthBar.className   = 'auth-modal__strength-bar';
        return;
    }
    const strength = getPasswordStrength(password);
    const pct = Math.max(20, Math.round((strength / 5) * 100));
    regStrengthBar.style.width = `${pct}%`;
    regStrengthBar.className   = 'auth-modal__strength-bar';
    if (strength <= 1)      regStrengthBar.classList.add('auth-modal__strength-bar--weak');
    else if (strength <= 3) regStrengthBar.classList.add('auth-modal__strength-bar--medium');
    else                    regStrengthBar.classList.add('auth-modal__strength-bar--strong');
}

function setBtnLoading(btn, loading, idleHTML) {
    btn.disabled  = loading;
    btn.innerHTML = loading
        ? '<i class="fa-solid fa-spinner fa-spin"></i> ATTENDERE...'
        : idleHTML;
}

// ── Modal helpers ───────────────────────────────────────
function openModal() {
    authModal.hidden = false;
    clearAll();
    loginEmailInput.focus();
}

function closeModal() {
    authModal.hidden = true;
}

function clearErrors() {
    loginErrorEl.textContent = '';
    regErrorEl.textContent   = '';
}
function clearAll() {
    // Svuota campi
    loginEmailInput.value    = '';
    loginPasswordInput.value = '';
    regEmailInput.value      = '';
    regPasswordInput.value   = '';
    // Svuota messaggi di errore
    clearErrors();
    // Svuota hint
    [loginEmailHintEl, loginPasswordHintEl, regEmailHintEl, regPasswordHintEl].forEach(el => {
        if (!el) return;
        el.textContent = '';
        el.className   = 'auth-modal__field-hint';
    });
    // Rimuovi classi di validazione
    [loginEmailInput, loginPasswordInput, regEmailInput, regPasswordInput].forEach(el =>
        el.classList.remove('auth-modal__input--error', 'auth-modal__input--valid')
    );
    // Reset barra forza password
    updateStrengthBar('');
    // Torna al tab login
    tabLogin.classList.add('auth-modal__tab--active');
    tabRegister.classList.remove('auth-modal__tab--active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.setAttribute('aria-selected', 'false');
    panelLogin.hidden    = false;
    panelRegister.hidden = true;
}
// Esposto per script.js: blocca le shortcut tastiera quando il modal è aperto
window.isAuthModalOpen = () => !authModal.hidden;

// ── Tab switching ─────────────────────────────────────────────
tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('auth-modal__tab--active');
    tabRegister.classList.remove('auth-modal__tab--active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.setAttribute('aria-selected', 'false');
    panelLogin.hidden   = false;
    panelRegister.hidden = true;
    loginEmailInput.focus();
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('auth-modal__tab--active');
    tabLogin.classList.remove('auth-modal__tab--active');
    tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.setAttribute('aria-selected', 'false');
    panelRegister.hidden = false;
    panelLogin.hidden    = true;
    regEmailInput.focus();
});

// ── Open / Close ──────────────────────────────────────────────
authOpenBtn.addEventListener('click', openModal);
authCloseBtn.addEventListener('click', closeModal);
authBackdrop.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !authModal.hidden) closeModal();
});

// ── Firestore: carica statistiche utente ──────────────────────
async function loadUserStats(uid) {
    try {
        const ref  = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            authCountEl.textContent = snap.data().totalPomodoros ?? 0;
            // Ripristina obiettivo giornaliero personalizzato
            const savedGoal = snap.data().dailyGoal;
            if (savedGoal) {
                localStorage.setItem('daily_goal', savedGoal);
                window.updateDailyGoalDisplay?.();
            }
        } else {
            await setDoc(ref, { totalPomodoros: 0, createdAt: serverTimestamp() });
            authCountEl.textContent = '0';
        }
    } catch (e) {
        console.error('[loadUserStats] Firestore error:', e?.message ?? e);
        authCountEl.textContent = '—';
    }
}

// ── Firestore: salva un pomodoro (chiamato da script.js) ──────
// La cronologia viene salvata come array nel documento utente (non subcollection).
//
// REGOLE FIRESTORE NECESSARIE (Firebase Console → Firestore → Regole):
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /users/{userId} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//     }
//   }
//
// Se le regole usano request.resource.data.keys().hasOnly([...]) aggiungere 'history' alla lista.
window.savePomodoro = async function savePomodoro(durSec) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const ref = doc(db, 'users', user.uid);
        // Usa Date.now() per il timestamp nell'array (serverTimestamp() non è supportato dentro arrayUnion)
        await setDoc(ref, {
            totalPomodoros: increment(1),
            lastSession:    serverTimestamp(),
            history:        arrayUnion({ ts: Date.now(), dur: durSec || 1500 }),
        }, { merge: true });
        authCountEl.textContent = (parseInt(authCountEl.textContent, 10) || 0) + 1;
    } catch (e) {
        console.error('[savePomodoro] Firestore error:', e?.message ?? e);
        // Salvataggio non disponibile (es. offline o rules): il contatore locale rimane invariato
    }
};

// ── Firestore: sincronizza cronologia al login ─────────────────
// Legge il campo 'history' dal documento utente e fa merge con localStorage.
async function syncHistory(uid) {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        const cloudHistory = snap.data()?.history ?? [];
        if (!cloudHistory.length) return;

        const HISTORY_KEY = 'pom_history';
        const HISTORY_MAX = 500;
        const local = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

        // Deduplicazione per timestamp arrotondato al secondo
        const localTsSet = new Set(local.map(e => Math.round(e.ts / 1000)));
        cloudHistory.forEach(entry => {
            if (!entry.ts) return;
            const sec = Math.round(entry.ts / 1000);
            if (!localTsSet.has(sec)) {
                local.push({ ts: entry.ts });
                localTsSet.add(sec);
            }
        });

        local.sort((a, b) => a.ts - b.ts);
        if (local.length > HISTORY_MAX) local.splice(0, local.length - HISTORY_MAX);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(local));

        // Aggiorna visibilità pulsante STORICO in script.js
        window.updateHistoryBtnVisibility?.();
        // Aggiorna obiettivo giornaliero dopo sync
        window.updateDailyGoalDisplay?.();
    } catch (e) {
        console.error('[syncHistory] Firestore error:', e?.message ?? e);
        // Sync non disponibile (offline): si usa solo la versione locale
    }
}

// ── Firestore: svuota cronologia (chiamato da script.js) ──────
window.clearFirestoreHistory = async function clearFirestoreHistory() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'users', user.uid), { history: [] }, { merge: true });
    } catch (e) {
        console.error('[clearFirestoreHistory] Firestore error:', e?.message ?? e);
        // Pulizia non disponibile (offline): solo locale sarà cancellato
    }
};
// ── Firestore: salva obiettivo giornaliero (chiamato da script.js) ──
window.saveDailyGoalToFirestore = async function(goal) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'users', user.uid), { dailyGoal: goal }, { merge: true });
    } catch (e) {
        console.error('[saveDailyGoalToFirestore] Firestore error:', e?.message ?? e);
    }
};
// ── Flags per notifiche auth ───────────────────────────
let justRegistered   = false;
let isFirstAuthCheck = true;

// ── Auth state observer ───────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (user) {
        authOpenBtn.hidden = true;
        authUserEl.hidden  = false;
        // Mostra nome (Google) o email (email/password)
        authEmailEl.textContent = user.displayName || user.email || '';
        if (authMiniAvatar) authMiniAvatar.textContent = (user.displayName || user.email || '?').charAt(0).toUpperCase();
        await loadUserStats(user.uid);
        // Sincronizza cronologia da Firestore → localStorage
        await syncHistory(user.uid);
        // Aggiorna badge streak in auth-bar (legge da localStorage populato da syncHistory)
        updateStreakBadge();
        // Google garantisce sempre emailVerified = true; nascondi il banner
        if (!user.emailVerified) {
            showVerifyNotice();
        } else {
            hideVerifyNotice();
        }
        // Mostra snack solo su login/registrazione attivi, non su ripristino sessione
        if (!isFirstAuthCheck) {
            const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
            if (justRegistered) {
                showAuthSnack('Account creato! Controlla la tua email per verificare l\'account 📧', 'success');
            } else if (isGoogle) {
                showAuthSnack(`Bentornato, ${user.displayName?.split(' ')[0] ?? 'utente'}! 👋`, 'success');
            } else if (!user.emailVerified) {
                showAuthSnack('Accesso effettuato — verifica la tua email per attivare l\'account', 'warning');
            } else {
                showAuthSnack('Accesso effettuato!', 'success');
            }
        }
        justRegistered   = false;
        isFirstAuthCheck = false;
        closeModal();
    } else {
        hideVerifyNotice();
        if (!isFirstAuthCheck) {
            showAuthSnack('Disconnesso con successo', 'info');
        }
        isFirstAuthCheck = false;
        authOpenBtn.hidden = false;
        authUserEl.hidden  = true;
        authEmailEl.textContent = '';
        if (authMiniAvatar) authMiniAvatar.textContent = '?';
        authCountEl.textContent = '0';
    }
});

// ── Login ─────────────────────────────────────────────────────
// Validazione real-time – login email
loginEmailInput.addEventListener('input', () => {
    loginEmailInput.classList.remove('auth-modal__input--error', 'auth-modal__input--valid');
    if (loginEmailHintEl) { loginEmailHintEl.textContent = ''; loginEmailHintEl.className = 'auth-modal__field-hint'; }
    loginErrorEl.textContent = '';
});
loginEmailInput.addEventListener('blur', () => {
    const val = loginEmailInput.value.trim();
    if (val && !isValidEmail(val)) {
        setFieldState(loginEmailInput, loginEmailHintEl, 'error', 'Formato email non valido');
    } else if (val) {
        setFieldState(loginEmailInput, loginEmailHintEl, 'valid', '');
    }
});

// Validazione real-time – login password
loginPasswordInput.addEventListener('input', () => {
    loginPasswordInput.classList.remove('auth-modal__input--error', 'auth-modal__input--valid');
    if (loginPasswordHintEl) { loginPasswordHintEl.textContent = ''; loginPasswordHintEl.className = 'auth-modal__field-hint'; }
    loginErrorEl.textContent = '';
});

// Validazione real-time – registrazione email
regEmailInput.addEventListener('input', () => {
    const val = regEmailInput.value.trim();
    if (!val) {
        setFieldState(regEmailInput, regEmailHintEl, 'idle', '');
    } else if (!isValidEmail(val)) {
        setFieldState(regEmailInput, regEmailHintEl, 'error', 'Formato non valido');
    } else {
        setFieldState(regEmailInput, regEmailHintEl, 'valid', '');
    }
    regErrorEl.textContent = '';
});
regEmailInput.addEventListener('blur', () => {
    const val = regEmailInput.value.trim();
    if (val && !isValidEmail(val)) {
        setFieldState(regEmailInput, regEmailHintEl, 'error', 'Inserisci un indirizzo email valido');
    }
});

// Validazione real-time – registrazione password
regPasswordInput.addEventListener('input', () => {
    const val = regPasswordInput.value;
    updateStrengthBar(val);
    if (!val) {
        setFieldState(regPasswordInput, regPasswordHintEl, 'idle', '');
    } else if (val.length < 6) {
        setFieldState(regPasswordInput, regPasswordHintEl, 'error', `${val.length}/6 caratteri minimi`);
    } else {
        const labels = ['', '', 'Discreta', 'Buona', 'Ottima', 'Eccellente'];
        setFieldState(regPasswordInput, regPasswordHintEl, 'valid', labels[getPasswordStrength(val)] ?? '');
    }
    regErrorEl.textContent = '';
});

const LOGIN_BTN_HTML    = '<i class="fa-solid fa-right-to-bracket"></i> ACCEDI';
const FORGOT_BTN_HTML   = '<i class="fa-solid fa-key"></i> PASSWORD DIMENTICATA?';

// ── Reset password ────────────────────────────────────────────
forgotPasswordBtn.addEventListener('click', async () => {
    const email = loginEmailInput.value.trim();
    if (!email) {
        setFieldState(loginEmailInput, loginEmailHintEl, 'error', 'Inserisci la tua email per ricevere il link di reset');
        loginEmailInput.focus();
        return;
    }
    if (!isValidEmail(email)) {
        setFieldState(loginEmailInput, loginEmailHintEl, 'error', 'Formato email non valido');
        loginEmailInput.focus();
        return;
    }
    setBtnLoading(forgotPasswordBtn, true, FORGOT_BTN_HTML);
    try {
        await sendPasswordResetEmail(auth, email);
        showAuthSnack('Email di reset inviata! Controlla la casella 📬', 'success');
        loginErrorEl.textContent = '';
        setFieldState(loginEmailInput, loginEmailHintEl, 'valid', '');
    } catch (err) {
        const msg = friendlyError(err.code);
        loginErrorEl.textContent = msg;
        showAuthSnack(msg, 'error');
    } finally {
        setBtnLoading(forgotPasswordBtn, false, FORGOT_BTN_HTML);
    }
});

loginSubmitBtn.addEventListener('click', async () => {
    const email    = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    loginErrorEl.textContent = '';

    let hasError = false;
    if (!email) {
        setFieldState(loginEmailInput, loginEmailHintEl, 'error', 'Campo obbligatorio');
        hasError = true;
    } else if (!isValidEmail(email)) {
        setFieldState(loginEmailInput, loginEmailHintEl, 'error', 'Email non valida');
        hasError = true;
    }
    if (!password) {
        setFieldState(loginPasswordInput, loginPasswordHintEl, 'error', 'Campo obbligatorio');
        hasError = true;
    }
    if (hasError) {
        panelLogin.classList.add('auth-modal__body--shake');
        setTimeout(() => panelLogin.classList.remove('auth-modal__body--shake'), 450);
        return;
    }

    setBtnLoading(loginSubmitBtn, true, LOGIN_BTN_HTML);
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        const msg = friendlyError(err.code);
        loginErrorEl.textContent = msg;
        showAuthSnack(msg, 'error');
        panelLogin.classList.add('auth-modal__body--shake');
        setTimeout(() => panelLogin.classList.remove('auth-modal__body--shake'), 450);
    } finally {
        setBtnLoading(loginSubmitBtn, false, LOGIN_BTN_HTML);
    }
});

// ── Registrazione ─────────────────────────────────────────────
const REG_BTN_HTML = '<i class="fa-solid fa-user-plus"></i> CREA ACCOUNT';

regSubmitBtn.addEventListener('click', async () => {
    const email    = regEmailInput.value.trim();
    const password = regPasswordInput.value;
    regErrorEl.textContent = '';

    let hasError = false;
    if (!email) {
        setFieldState(regEmailInput, regEmailHintEl, 'error', 'Campo obbligatorio');
        hasError = true;
    } else if (!isValidEmail(email)) {
        setFieldState(regEmailInput, regEmailHintEl, 'error', 'Email non valida');
        hasError = true;
    }
    if (!password) {
        setFieldState(regPasswordInput, regPasswordHintEl, 'error', 'Campo obbligatorio');
        hasError = true;
    } else if (password.length < 6) {
        setFieldState(regPasswordInput, regPasswordHintEl, 'error', 'Minimo 6 caratteri');
        hasError = true;
    }
    if (hasError) {
        panelRegister.classList.add('auth-modal__body--shake');
        setTimeout(() => panelRegister.classList.remove('auth-modal__body--shake'), 450);
        return;
    }

    justRegistered = true;
    setBtnLoading(regSubmitBtn, true, REG_BTN_HTML);
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Invia email di verifica (non bloccante se fallisce, es. offline)
        sendEmailVerification(cred.user).catch(e =>
            console.error('[sendEmailVerification]', e?.message ?? e)
        );
    } catch (err) {
        justRegistered = false;
        const msg = friendlyError(err.code);
        regErrorEl.textContent = msg;
        showAuthSnack(msg, 'error');
        panelRegister.classList.add('auth-modal__body--shake');
        setTimeout(() => panelRegister.classList.remove('auth-modal__body--shake'), 450);
    } finally {
        setBtnLoading(regSubmitBtn, false, REG_BTN_HTML);
    }
});

// ── Rinvia email di verifica ─────────────────────────────────
resendVerifyBtn?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await sendEmailVerification(user);
        showAuthSnack('Email di verifica inviata! Controlla la casella 📬', 'success');
    } catch (err) {
        showAuthSnack(friendlyError(err.code), 'error');
    }
});

dismissVerifyBtn?.addEventListener('click', hideVerifyNotice);

// ── Login con Google ──────────────────────────────────────────
async function handleGoogleSignIn() {
    try {
        await signInWithPopup(auth, googleProvider);
        // onAuthStateChanged gestisce tutto il resto (snack, sync, ecc.)
    } catch (err) {
        // L'utente ha chiuso il popup: non mostrare errore
        if (err.code === 'auth/popup-closed-by-user' ||
            err.code === 'auth/cancelled-popup-request') return;
        const msg = friendlyError(err.code);
        showAuthSnack(msg, 'error');
    }
}

googleLoginBtn?.addEventListener('click', handleGoogleSignIn);
googleRegisterBtn?.addEventListener('click', handleGoogleSignIn);

// ── Profile Panel event listeners ─────────────────────────────
document.getElementById('auth-profile-btn')?.addEventListener('click', () => {
    const user = auth.currentUser;
    if (user) openProfilePanel(user);
});
profileCloseBtn?.addEventListener('click', closeProfilePanel);
profileBackdrop?.addEventListener('click', closeProfilePanel);
profileLogoutBtn?.addEventListener('click', () => { closeProfilePanel(); signOut(auth); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && profilePanel && !profilePanel.hidden) closeProfilePanel();
});

// ── Logout ────────────────────────────────────────────────────
authLogoutBtn.addEventListener('click', () => signOut(auth));

// ── Invio con tasto Enter ─────────────────────────────────────
[loginEmailInput, loginPasswordInput].forEach(el =>
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginSubmitBtn.click(); })
);
[regEmailInput, regPasswordInput].forEach(el =>
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') regSubmitBtn.click(); })
);

// ── Messaggi di errore localizzati ────────────────────────────
function friendlyError(code) {
    return ({
        'auth/user-not-found':           'Nessun account trovato con questa email.',
        'auth/wrong-password':           'Password errata.',
        'auth/email-already-in-use':     'Email già in uso. Prova ad accedere.',
        'auth/weak-password':            'Password troppo breve (min. 6 caratteri).',
        'auth/invalid-email':            'Indirizzo email non valido.',
        'auth/too-many-requests':        'Troppi tentativi. Riprova tra qualche minuto.',
        'auth/invalid-credential':       'Credenziali non valide. Controlla email e password.',
        'auth/network-request-failed':   'Errore di rete. Controlla la connessione.',
        'auth/missing-email':                'Inserisci un indirizzo email.',
        'auth/requires-recent-login':        'Operazione scaduta. Esegui logout e accedi di nuovo.',
        'auth/popup-blocked':                'Il popup è stato bloccato dal browser. Consenti i popup per questo sito.',
        'auth/account-exists-with-different-credential': 'Esiste già un account con questa email. Accedi con email e password.',
    })[code] ?? 'Si è verificato un errore. Riprova.';
}
