// cart.js — Cart page: auth guard + localStorage cart + order summary
import { auth, db } from "./firebase-config.js";
import { API_URL } from "./config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ── AUTH GUARD ──────────────────────────────────────────────────
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  const guard = document.getElementById("authGuard");
  if (!user) { window.location.href = "auth.html"; return; }
  currentUser = user;
  guard.classList.add("hidden");
  const name = user.displayName || user.email.split("@")[0];
  document.getElementById("userBadge").textContent = `👤 ${name}`;
  renderCart();
});

// ── LOGOUT ──────────────────────────────────────────────────────
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ── CART DATA ───────────────────────────────────────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem("spideyCart")) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem("spideyCart", JSON.stringify(cart));
  updateBadge(cart);
}

function updateBadge(cart) {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById("cartBadge");
  if (badge) badge.textContent = count;
}

// ── CHANGE QUANTITY ─────────────────────────────────────────────
window.changeItemQty = function (id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, Math.min(20, item.qty + delta));
  saveCart(cart);
  renderCart();
};

// ── REMOVE ITEM ─────────────────────────────────────────────────
window.removeItem = function (id) {
  let cart = getCart();
  cart = cart.filter(i => i.id !== id);
  saveCart(cart);
  renderCart();
  showToast("🗑️ Item removed from cart");
};

// ── CLEAR CART ──────────────────────────────────────────────────
window.clearCart = function () {
  saveCart([]);
  renderCart();
  showToast("🧹 Cart cleared");
};

// ── RENDER ──────────────────────────────────────────────────────
function renderCart() {
  const cart       = getCart();
  const empty      = document.getElementById("cartEmpty");
  const list       = document.getElementById("cartItemsList");
  const summary    = document.getElementById("orderSummary");
  const clearBtn   = document.getElementById("clearAllBtn");
  const checkoutBtn = document.getElementById("checkoutBtn");

  updateBadge(cart);

  if (cart.length === 0) {
    empty.style.display     = "flex";
    list.innerHTML          = "";
    clearBtn.style.display  = "none";
    checkoutBtn.classList.add("disabled");

    // zero out summary
    document.getElementById("summarySubtotal").textContent = "$0.00";
    document.getElementById("summaryTax").textContent      = "$0.00";
    document.getElementById("summaryTotal").textContent    = "$0.00";
    return;
  }

  empty.style.display    = "none";
  clearBtn.style.display = "";
  checkoutBtn.classList.remove("disabled");

  // Build items HTML
  list.innerHTML = cart.map((item, idx) => `
    <div class="cart-item" style="animation-delay:${idx * 0.08}s">
      <div class="item-img">
        ${item.image 
          ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none';this.parentElement.textContent='🕷️'"/>` 
          : "🕷️"}
      </div>
      <div class="item-info">
        <h4>${item.name}</h4>
        <p class="item-price">$${item.price.toFixed(2)} each</p>
        <p class="item-desc">${item.description ? item.description.slice(0, 60) + "…" : "Spider-Man Collectible"}</p>
      </div>
      <div class="item-controls">
        <div class="qty-group">
          <button class="qty-btn" onclick="changeItemQty('${item.id}', -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeItemQty('${item.id}', 1)">+</button>
        </div>
        <span class="item-total">$${(item.price * item.qty).toFixed(2)}</span>
        <button class="remove-btn" onclick="removeItem('${item.id}')">✕ Remove</button>
      </div>
    </div>
  `).join("");

  // Summary calculations
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = subtotal * 0.08;
  const total    = subtotal + tax;

  document.getElementById("summarySubtotal").textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById("summaryTax").textContent      = `$${tax.toFixed(2)}`;
  document.getElementById("summaryTotal").textContent    = `$${total.toFixed(2)}`;
}

// ── TOAST ────────────────────────────────────────────────────────
function showToast(msg, dur = 3000) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), dur);
}

// ── INIT ─────────────────────────────────────────────────────────
updateBadge(getCart());
