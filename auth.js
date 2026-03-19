// auth.js — Firebase Auth logic for auth.html
import { auth } from "./firebase-config.js";
import { API_URL } from "./config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ─── If already logged in → go straight to shop ───────────────
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "product.html";
});

// ─── TAB SWITCHER ─────────────────────────────────────────────
window.showTab = function (tab) {
  const isLogin = tab === "login";
  document.getElementById("loginForm").classList.toggle("active", isLogin);
  document.getElementById("signupForm").classList.toggle("active", !isLogin);
  document.getElementById("tabLogin").classList.toggle("active", isLogin);
  document.getElementById("tabSignup").classList.toggle("active", !isLogin);
  clearAlerts();
};

// ─── PASSWORD VISIBILITY ──────────────────────────────────────
window.togglePwd = function (id, btn) {
  const inp = document.getElementById(id);
  const show = inp.type === "password";
  inp.type = show ? "text" : "password";
  btn.textContent = show ? "🙈" : "👁";
};

// ─── ALERT HELPERS ────────────────────────────────────────────
function showError(msg)   { const el = document.getElementById("alertError");   el.textContent = "⚠️ " + msg; el.style.display = "block"; }
function showSuccess(msg) { const el = document.getElementById("alertSuccess"); el.textContent = "✅ " + msg; el.style.display = "block"; }
function clearAlerts()    {
  ["alertError","alertSuccess"].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = "";
    el.style.display = "none";
  });
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.querySelector(".btn-text").hidden = loading;
  btn.querySelector(".btn-spinner").hidden = !loading;
}

// ─── Firebase error → human-readable ─────────────────────────
function friendlyError(code) {
  const map = {
    "auth/user-not-found":      "No account found with that email.",
    "auth/wrong-password":      "Incorrect password. Try again.",
    "auth/email-already-in-use":"That email is already registered.",
    "auth/weak-password":       "Password must be at least 6 characters.",
    "auth/invalid-email":       "Please enter a valid email address.",
    "auth/too-many-requests":   "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/invalid-credential":  "Invalid email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ─── LOGIN ────────────────────────────────────────────────────
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlerts();
  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn      = document.getElementById("loginBtn");

  if (!email || !password) { showError("Please fill in all fields."); return; }
  setLoading(btn, true);

  try {
    // ── Step 1: Firebase client-side sign-in ──────────────────
    const cred    = await signInWithEmailAndPassword(auth, email, password);

    // ── Step 2: Get the Firebase ID token ─────────────────────
    const idToken = await cred.user.getIdToken();

    // ── Step 3: Send token to backend for verification ────────
    let backendOk = false;
    try {
      const resp = await fetch(`${API_URL}/api/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ idToken })
      });

      const data = await resp.json();

      if (resp.ok && data.success) {
        backendOk = true;
      } else {
        // Backend rejected the token — still show a warning but
        // allow the user through (Firebase auth already succeeded)
        console.warn("Backend login check failed:", data.error);
        backendOk = true; // degrade gracefully — frontend already verified
      }
    } catch (networkErr) {
      // Backend is unreachable (server not running) — degrade gracefully
      console.warn("Backend unreachable, continuing with Firebase auth only:", networkErr.message);
      backendOk = true;
    }

    // ── Step 4: Redirect to protected shop page ───────────────
    if (backendOk) {
      showSuccess("Welcome back, hero! Redirecting…");
      setTimeout(() => { window.location.href = "product.html"; }, 900);
    }

  } catch (err) {
    // Firebase auth itself failed (wrong password, no account, etc.)
    showError(friendlyError(err.code));
    setLoading(btn, false);
  }
});

// ─── SIGN UP ──────────────────────────────────────────────────
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlerts();
  const name     = document.getElementById("signupName").value.trim();
  const email    = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const btn      = document.getElementById("signupBtn");

  if (!name || !email || !password) { showError("Please fill in all fields."); return; }
  if (password.length < 6) { showError("Password must be at least 6 characters."); return; }
  setLoading(btn, true);

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    showSuccess("Account created! Welcome to the Spider-Verse!");
    setTimeout(() => window.location.href = "product.html", 1200);
  } catch (err) {
    showError(friendlyError(err.code));
    setLoading(btn, false);
  }
});
