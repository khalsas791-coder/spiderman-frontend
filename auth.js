// auth.js — Cinematic Spider-Man Auth Experience
import { auth } from "./firebase-config.js";
import { API_URL } from "./config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Check already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Already in? Maybe landing page pose then redirect
    // window.location.href = "product.html";
  }
});

document.addEventListener('DOMContentLoaded', () => {
    // ══ INITIAL ANIMATION ══
    const authBox = document.getElementById('authBox');
    setTimeout(() => {
        authBox.classList.add('visible');
        spawnRandomParticles();
        startBackgroundMovements();
        // Entry zoom
        gsap.from('.layer', { scale: 1.3, duration: 2.5, ease: 'power2.out' });
    }, 300);

    // ══ INPUT FOCUS EFFECTS ══
    const inputs = document.querySelectorAll('.input-wrapper input');
    // Hover/Focus glow handled by CSS

    // ══ LOGIN LOGIC ══
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        await handleAuthAction('login', email, password);
    });

    // ══ SIGNUP LOGIC ══
    const signupForm = document.getElementById('signupForm');
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters.', 'error');
            return;
        }

        await handleAuthAction('signup', email, password, name);
    });
});

// ══ MAIN AUTH HANDLER ══
async function handleAuthAction(type, email, password, name = "") {
    const webLoader = document.getElementById('webLoader');
    const authAlert = document.getElementById('authAlert');
    const authBox = document.getElementById('authBox');

    // 1. Loading State
    webLoader.style.display = 'flex';
    authAlert.style.display = 'none';

    try {
        let cred;
        if(type === 'login') {
            cred = await signInWithEmailAndPassword(auth, email, password);
        } else {
            cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: name });
        }

        // 2. Successful Landing Sequence
        webLoader.style.display = 'none';
        triggerImpactEffect();
        triggerSilhouetteSwing();
        
        showAlert(type === 'login' ? 'Welcome back, Hero!' : 'The Fight for the City Begins!', 'success');
        
        // Zoom screen in
        gsap.to('.layer', { scale: 1.6, duration: 2.5, ease: 'power2.inOut' });
        gsap.to('#authBox', { opacity: 0, scale: 0.9, duration: 1, ease: 'power2.inOut' });

        setTimeout(() => {
            window.location.href = "product.html";
        }, 1800);

    } catch (err) {
        webLoader.style.display = 'none';
        triggerErrorEffect();
        showAlert(friendlyError(err.code), 'error');
    }
}

// ══ TAB SYSTEM ══
window.showTab = function(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tabLogin').classList.toggle('active', isLogin);
    document.getElementById('tabSignup').classList.toggle('active', !isLogin);
    document.getElementById('loginForm').classList.toggle('active', isLogin);
    document.getElementById('signupForm').classList.toggle('active', !isLogin);
    document.getElementById('authAlert').style.display = 'none';
};

// ══ CINEMATIC HELPERS ══
function triggerImpactEffect() {
    const flash = document.getElementById('flashOverlay');
    
    // 1. Flash
    flash.style.opacity = '1';
    setTimeout(() => flash.style.opacity = '0', 200);

    // 2. Red Energy Wave
    const wave = document.createElement('div');
    wave.style.cssText = `
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 10px; height: 10px;
        background: radial-gradient(circle, var(--red-l), transparent);
        border-radius: 50%; pointer-events: none; z-index: 105;
    `;
    document.body.appendChild(wave);
    gsap.to(wave, { width: '400vw', height: '400vw', opacity: 0, duration: 1.2, ease: 'power2.out', onComplete: () => wave.remove() });

    // 3. Shake impact
    const authBox = document.getElementById('authBox');
    gsap.to(authBox, { duration: 0.1, x: 10, repeat: 5, yoyo: true });
}

function triggerSilhouetteSwing() {
    const silhouette = document.getElementById('swingSilhouette');
    gsap.to(silhouette, {
        duration: 1.8,
        left: '120vw',
        opacity: 0.4,
        ease: 'power1.inOut',
        onStart: () => { silhouette.style.opacity = '0.6'; }
    });
}

function triggerErrorEffect() {
    const authBox = document.getElementById('authBox');
    authBox.classList.add('glitch-shake');
    setTimeout(() => authBox.classList.remove('glitch-shake'), 400);

    // Red pulse in bg
    document.body.style.boxShadow = "inset 0 0 100px rgba(220, 30, 48, 0.4)";
    setTimeout(() => document.body.style.boxShadow = "none", 1000);
}

function showAlert(msg, type) {
    const alert = document.getElementById('authAlert');
    alert.textContent = msg;
    alert.className = `auth-alert ${type}`;
    alert.style.display = 'block';
}

function startBackgroundMovements() {
    const parallaxBg = document.getElementById('parallaxBg');
    document.addEventListener('mousemove', (e) => {
        const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
        const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;
        
        gsap.to('.layer-city-near', { x: xPercent * 15, y: yPercent * 10, duration: 1.5 });
        gsap.to('.layer-city-mid', { x: xPercent * 8, y: yPercent * 6, duration: 1.5 });
        gsap.to('.layer-city-far', { x: xPercent * 4, y: yPercent * 3, duration: 1.5 });
    });

    // Occasional Swinger
    setInterval(() => {
        const swinger = document.getElementById('spideySwinger');
        gsap.set(swinger, { left: '-150px', top: '10%' });
        gsap.to(swinger, { duration: 3, left: '120vw', ease: 'none' });
    }, 15000);
}

function spawnRandomParticles() {
    const container = document.getElementById('particles');
    for(let i=0; i<30; i++) {
        const p = document.createElement('div');
        const size = Math.random() * 3 + 1;
        p.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${Math.random() > 0.5 ? 'var(--blue-l)' : 'var(--red-l)'};
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.5 + 0.2};
            filter: blur(1px);
            pointer-events: none;
        `;
        container.appendChild(p);
        
        gsap.to(p, {
            y: "-=50",
            duration: Math.random() * 5 + 5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: Math.random() * 5
        });
    }
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found": "No Hero found by this identity.",
    "auth/wrong-password": "Incorrect Access Code.",
    "auth/email-already-in-use": "Identity already taken in this Universe.",
    "auth/weak-password": "Code must be at least 6 characters.",
    "auth/invalid-email": "Invalid Radio Signal.",
    "auth/too-many-requests": "Too much static. Try later.",
    "auth/network-request-failed": "Signal Lost. Check Connection.",
    "auth/invalid-credential": "Access Denied by Stark Security.",
  };
  return map[code] || "Multiverse Glitch. Try again.";
}
