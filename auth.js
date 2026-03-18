// auth.js — Autenticazione Firebase + persistenza Firestore
import { initializeApp }                from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
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

// ── Modal helpers ─────────────────────────────────────────────
function openModal() {
    authModal.hidden = false;
    clearErrors();
    loginEmailInput.focus();
}

function closeModal() {
    authModal.hidden = true;
}

function clearErrors() {
    loginErrorEl.textContent = '';
    regErrorEl.textContent   = '';
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
        } else {
            await setDoc(ref, { totalPomodoros: 0, createdAt: serverTimestamp() });
            authCountEl.textContent = '0';
        }
    } catch {
        authCountEl.textContent = '—';
    }
}

// ── Firestore: salva un pomodoro (chiamato da script.js) ──────
window.savePomodoro = async function savePomodoro() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(ref, {
            totalPomodoros: increment(1),
            lastSession:    serverTimestamp(),
        }, { merge: true });
        authCountEl.textContent = (parseInt(authCountEl.textContent, 10) || 0) + 1;
    } catch {
        // Salvataggio non disponibile (es. offline): il contatore locale rimane invariato
    }
};

// ── Auth state observer ───────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (user) {
        authOpenBtn.hidden = true;
        authUserEl.hidden  = false;
        authEmailEl.textContent = user.email;
        await loadUserStats(user.uid);
        closeModal();
    } else {
        authOpenBtn.hidden = false;
        authUserEl.hidden  = true;
        authEmailEl.textContent = '';
        authCountEl.textContent = '0';
    }
});

// ── Login ─────────────────────────────────────────────────────
loginSubmitBtn.addEventListener('click', async () => {
    const email    = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    loginErrorEl.textContent = '';

    if (!email || !password) {
        loginErrorEl.textContent = 'Inserisci email e password.';
        return;
    }

    loginSubmitBtn.disabled = true;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        loginErrorEl.textContent = friendlyError(err.code);
    } finally {
        loginSubmitBtn.disabled = false;
    }
});

// ── Registrazione ─────────────────────────────────────────────
regSubmitBtn.addEventListener('click', async () => {
    const email    = regEmailInput.value.trim();
    const password = regPasswordInput.value;
    regErrorEl.textContent = '';

    if (!email || !password) {
        regErrorEl.textContent = 'Inserisci email e password.';
        return;
    }

    regSubmitBtn.disabled = true;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
        regErrorEl.textContent = friendlyError(err.code);
    } finally {
        regSubmitBtn.disabled = false;
    }
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
        'auth/user-not-found':         'Nessun account trovato con questa email.',
        'auth/wrong-password':         'Password errata.',
        'auth/email-already-in-use':   'Email già in uso. Prova ad accedere.',
        'auth/weak-password':          'Password troppo breve (min. 6 caratteri).',
        'auth/invalid-email':          'Indirizzo email non valido.',
        'auth/too-many-requests':      'Troppi tentativi. Riprova tra qualche minuto.',
        'auth/invalid-credential':     'Credenziali non valide. Controlla email e password.',
        'auth/network-request-failed': 'Errore di rete. Controlla la connessione.',
    })[code] ?? 'Si è verificato un errore. Riprova.';
}
