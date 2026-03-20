/* =============================================
   SPIDER-MAN WEBSITE — SCRIPT.JS
   ============================================= */

// ─── NAVBAR SCROLL EFFECT ───────────────────
import { auth } from "./firebase-config.js";
import { API_URL } from "./config.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
console.log("JS CONNECTED 🔥");

const ADMIN_EMAILS = ["admin@spiderman.com", "admin@spidey.com"];

onAuthStateChanged(auth, (user) => {
  const loginLink = document.getElementById("navAuthLink");
  const shopLink = document.getElementById("navShopLink");
  const adminItem = document.getElementById("navAdminItem");
  
  const heroAuthBtn = document.getElementById("heroAuthBtn");
  const heroShopBtn = document.getElementById("startBtn");

  if (user) {
    if (loginLink) {
      loginLink.textContent = "Logout";
      loginLink.href = "#";
      loginLink.onclick = () => signOut(auth).then(() => window.location.reload());
    }
    if (shopLink) shopLink.href = "product.html";
    
    if (heroAuthBtn) {
      heroAuthBtn.innerHTML = "🚪 Logout";
      heroAuthBtn.href = "#";
      heroAuthBtn.onclick = () => signOut(auth).then(() => window.location.reload());
    }
    if (heroShopBtn) heroShopBtn.href = "product.html";

    // Show Admin Panel if applicable
    if (adminItem && ADMIN_EMAILS.includes(user.email)) {
      adminItem.style.display = "inline-block";
    }
  } else {
    // Not logged in
    if (loginLink) {
      loginLink.textContent = "Login";
      loginLink.href = "auth.html";
      loginLink.onclick = null;
    }
    if (shopLink) shopLink.href = "auth.html";
    if (heroAuthBtn) {
      heroAuthBtn.innerHTML = "🔐 Login";
      heroAuthBtn.href = "auth.html";
      heroAuthBtn.onclick = null;
    }
    if (heroShopBtn) heroShopBtn.href = "auth.html";
    if (adminItem) adminItem.style.display = "none";
  }
});

const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

// ─── MOBILE NAV TOGGLE ──────────────────────
const navToggle = document.getElementById('navToggle');
const navLinks  = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  const spans = navToggle.querySelectorAll('span');
  spans[0].style.transform = navLinks.classList.contains('open') ? 'rotate(45deg) translate(5px, 5px)' : '';
  spans[1].style.opacity   = navLinks.classList.contains('open') ? '0' : '1';
  spans[2].style.transform = navLinks.classList.contains('open') ? 'rotate(-45deg) translate(5px, -5px)' : '';
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    const spans = navToggle.querySelectorAll('span');
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  });
});

// ─── HERO PARTICLES ─────────────────────────
function createParticles() {
  const container = document.getElementById('particles');
  const colors    = ['#dc1e30', '#ff3347', '#4169e1', '#00aaff'];
  const count     = window.innerWidth < 768 ? 25 : 55;

  for (let i = 0; i < count; i++) {
    const p    = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    const left = Math.random() * 100;
    const dur  = Math.random() * 10 + 8;
    const del  = Math.random() * 10;
    const col  = colors[Math.floor(Math.random() * colors.length)];

    p.style.cssText = `
      left: ${left}%;
      width: ${size}px;
      height: ${size}px;
      background: ${col};
      animation-duration: ${dur}s;
      animation-delay: ${del}s;
      box-shadow: 0 0 ${size * 3}px ${col};
    `;
    container.appendChild(p);
  }
}
createParticles();

// ─── INTERSECTION OBSERVER — CARDS ──────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.getAttribute('data-delay') || 0);
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.glass-card').forEach(card => observer.observe(card));

// ─── COUNTER ANIMATION ──────────────────────
function animateCounter(el, target, duration = 1800) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = Math.floor(start);
  }, 16);
}

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-num').forEach(el => {
        const target = parseInt(el.getAttribute('data-target'));
        animateCounter(el, target);
      });
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });

const statsRow = document.querySelector('.stats-row');
if (statsRow) statObserver.observe(statsRow);

// ─── AUTH TAB SWITCHER ──────────────────────
function switchTab(tab) {
  const loginForm   = document.getElementById('loginForm');
  const signupForm  = document.getElementById('signupForm');
  const loginTab    = document.getElementById('loginTab');
  const signupTab   = document.getElementById('signupTab');

  if (tab === 'login') {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
  }
}

// ─── AUTH FORM HANDLER ──────────────────────
// 🔥 REAL AUTH FUNCTION
window.handleAuth = async function (event, type) {
  event.preventDefault();

  console.log("Login clicked 🔥");

  // 🔐 LOGIN
  if (type === "login") {
    const email = document.getElementById("loginEmail").value;
    const pass  = document.getElementById("loginPass").value;

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, pass);

      const idToken = await userCred.user.getIdToken();

      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idToken })
      });

      const data = await res.json();

      if (data.success) {
        showToast("🕷️ Login Success!");
        window.location.href = "product.html";
      } else {
        showToast("❌ Backend error");
      }

    } catch (err) {
      console.log(err);
      showToast("❌ " + err.message);
    }
  }

  // 🆕 SIGNUP
  if (type === "signup") {
    const email = document.getElementById("signupEmail").value;
    const pass  = document.getElementById("signupPass").value;

    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      showToast("🎉 Signup Success!");
    } catch (err) {
      showToast("❌ " + err.message);
    }
  }
};

// ─── TOAST NOTIFICATION ─────────────────────
function showToast(message, duration = 3500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ─── PARALLAX ON MOUSE MOVE (HERO) ──────────
const hero = document.querySelector('.hero');
hero.addEventListener('mousemove', (e) => {
  const { clientX, clientY } = e;
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  const dx = (clientX - cx) / cx;
  const dy = (clientY - cy) / cy;

  const content = document.querySelector('.hero-content');

  if (content) content.style.transform = `translate(${dx * 10}px, ${dy * 10}px)`;
});

hero.addEventListener('mouseleave', () => {
  const content = document.querySelector('.hero-content');
  if (content) content.style.transform = 'translate(0, 0)';
});

// ─── SMOOTH ACTIVE NAV HIGHLIGHT ────────────
const sections  = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => {
        a.style.color = '';
        a.style.textShadow = '';
      });
      const target = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (target) {
        target.style.color = '#dc1e30';
        target.style.textShadow = '0 0 10px rgba(220,30,48,0.8)';
      }
    }
  });
}, { threshold: 0.4, rootMargin: '-80px 0px 0px 0px' });

sections.forEach(s => sectionObserver.observe(s));

// ─── BUTTON RIPPLE EFFECT ────────────────────
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', function (e) {
    const ripple = document.createElement('span');
    const rect   = this.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px; height: ${size}px;
      left: ${x}px; top: ${y}px;
      background: rgba(255,255,255,0.25);
      border-radius: 50%;
      transform: scale(0);
      animation: rippleAnim 0.6s linear;
      pointer-events: none;
    `;
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  });
});

// Inject ripple keyframe dynamically
const style = document.createElement('style');
style.textContent = `@keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }`;
document.head.appendChild(style);

// ─── INIT LOG ───────────────────────────────
console.log('%c🕷️ Spider-Man Website Loaded!', 'color:#dc1e30; font-size:18px; font-weight:bold;');
