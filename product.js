// product.js — Shop page: auth guard + Firestore products + localStorage cart + modal
import { auth, db } from "./firebase-config.js";
import { API_URL } from "./config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── AUTH GUARD ──────────────────────────────────────────────────
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  const guard = document.getElementById("authGuard");
  if (!user) { window.location.href = "auth.html"; return; }
  currentUser = user;
  guard.classList.add("hidden");
  const name = user.displayName || user.email.split("@")[0];
  document.getElementById("userBadge").textContent = `👤 ${name}`;
  
  const adminBtn = document.getElementById("navAdminBtn");
  if (adminBtn && ["admin@spiderman.com", "admin@spidey.com"].includes(user.email)) {
    adminBtn.style.display = "inline-block";
  }
  updateCartBadge();
  await loadProducts();
});

// ── LOGOUT ──────────────────────────────────────────────────────
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ── CART HELPERS (localStorage) ─────────────────────────────────
function getCart()       { try { return JSON.parse(localStorage.getItem("spideyCart")) || []; } catch { return []; } }
function saveCart(cart)  { localStorage.setItem("spideyCart", JSON.stringify(cart)); updateCartBadge(); }

function updateCartBadge() {
  const cart  = getCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById("cartCount");
  if (badge) badge.textContent = count;
}

function addToCart(product, qty = 1) {
  const cart     = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty      = Math.min(20, existing.qty + qty);
    existing.lineTotal = existing.qty * existing.price;
  } else {
    cart.push({ ...product, qty, lineTotal: qty * product.price });
  }
  saveCart(cart);
}

// ── LOAD PRODUCTS FROM FIRESTORE ────────────────────────────────
let allProducts = [];

async function loadProducts() {
  const loading = document.getElementById("productsLoading");
  const grid    = document.getElementById("productsGrid");
  const empty   = document.getElementById("productsEmpty");

  try {
    // Try Firestore first
    const q    = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // If Firestore empty, try backend API
    if (!allProducts.length) {
      const resp = await fetch(`${API_URL}/api/products`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) allProducts = data.products;
      }
    }

    if (loading) loading.style.display = "none";

    if (!allProducts.length) {
      if (empty) empty.style.display = "flex";
      return;
    }

    renderProducts(allProducts);

  } catch (err) {
    console.warn("Firestore load failed, trying backend:", err.message);
    try {
      const resp = await fetch(`${API_URL}/api/products`);
      const data = await resp.json();
      if (data.success && data.products?.length) {
        allProducts = data.products;
        if (loading) loading.style.display = "none";
        renderProducts(allProducts);
      } else {
        throw new Error("No products");
      }
    } catch {
      if (loading) loading.style.display = "none";
      if (empty) empty.style.display = "flex";
    }
  }
}

function renderProducts(products) {
  const limitedGrid = document.getElementById("limitedGrid");
  const specialGrid = document.getElementById("specialGrid");
  
  if (limitedGrid) limitedGrid.innerHTML = "";
  if (specialGrid) specialGrid.innerHTML = "";

  products.forEach((p, i) => {
    const isLimited = p.section === "Limited";
    const grid = isLimited ? limitedGrid : specialGrid;
    if (!grid) return;

    const catEmoji = { "Hoodies": "👕", "Toys": "🧸", "Masks": "🎭" }[p.category] || "🕸️";

    const card = document.createElement("div");
    card.className = `product-card ${isLimited ? 'premium-card' : ''}`;
    card.style.animationDelay = `${i * 0.08}s`;
    card.onclick = () => openDetail(p.id);

    card.innerHTML = `
      <div class="pc-image-wrap">
        <div class="pc-image">
          ${p.image
            ? `<img src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.parentElement.innerHTML='🕷️'"/>`
            : `<span class="pc-emoji">🕷️</span>`}
        </div>
        ${isLimited ? `<span class="pc-badge-limited">💎 Limited Edition</span>` : ""}
        ${p.modelUrl ? `<span class="pc-badge-3d">🥽 3D View</span>` : ""}
      </div>
      <div class="pc-body">
        <div class="pc-cat-row">
          <span class="pc-cat-emoji">${catEmoji}</span>
          <p class="pc-cat">${p.category || "Marvel Collectibles"}</p>
        </div>
        <h3 class="pc-name">${p.name}</h3>
        <p class="pc-desc">${(p.description || "").slice(0, 80)}…</p>
        <div class="pc-footer">
          <span class="pc-price">$${parseFloat(p.price).toFixed(2)}</span>
          ${p.oldPrice ? `<span class="pc-old-price">$${p.oldPrice}</span>` : ""}
        </div>
        <button class="pc-add-btn" onclick="event.stopPropagation(); quickAdd('${p.id}')">
          🛒 Add to Cart
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  // ── 3D TILT EFFECT ──────────────────────────────────────────────
  const cards = document.querySelectorAll(".product-card");
  cards.forEach(card => {
    card.style.transition = "transform 0.1s ease-out, box-shadow 0.1s ease-out";
    card.style.transformStyle = "preserve-3d";
    
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const multiplier = 20;
      const xRotation = multiplier * ((x - rect.width / 2) / rect.width);
      const yRotation = -1 * multiplier * ((y - rect.height / 2) / rect.height);
      
      card.style.transform = `perspective(1000px) rotateX(${yRotation}deg) rotateY(${xRotation}deg) scale3d(1.05, 1.05, 1.05)`;
      card.style.boxShadow = "0 20px 40px rgba(0,0,0,0.6), 0 0 15px rgba(255, 51, 71, 0.4)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transition = "transform 0.5s ease-out, box-shadow 0.5s ease-out";
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      card.style.boxShadow = "";
      setTimeout(() => {
        card.style.transition = "transform 0.1s ease-out, box-shadow 0.1s ease-out";
      }, 500);
    });
  });
}

// ── QUICK ADD (from card) ────────────────────────────────────────
window.quickAdd = function (id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  addToCart(p, 1);
  showToast(`🕸️ ${p.name} added to cart!`);
};

// ── DETAIL MODAL ─────────────────────────────────────────────────
let modalProduct = null;
let modalQty     = 1;

window.openDetail = function (id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  modalProduct = p;
  modalQty     = 1;

  document.getElementById("qtyVal").textContent = 1;
  document.getElementById("pdetailCat").textContent   = p.category || "Marvel Collectibles";
  document.getElementById("pdetailName").textContent  = p.name;
  document.getElementById("pdetailPrice").textContent = `$${parseFloat(p.price).toFixed(2)}`;
  document.getElementById("pdetailDesc").textContent  = p.description || "";

  const oldEl = document.getElementById("pdetailOldPrice");
  if (p.oldPrice) { oldEl.textContent = `$${p.oldPrice}`; oldEl.style.display = ""; }
  else             { oldEl.style.display = "none"; }

  const imgWrap   = document.getElementById("pdetailImgWrap");
  const modelWrap = document.getElementById("pdetailModelWrap");
  const img       = document.getElementById("pdetailImg");

  if (p.modelUrl) {
    imgWrap.style.display   = "none";
    modelWrap.style.display = "";
    const mv = document.getElementById("pdetailModel");
    mv.setAttribute("src", p.modelUrl);
    mv.setAttribute("alt", p.name);
  } else {
    imgWrap.style.display   = "";
    modelWrap.style.display = "none";
    img.src = p.image || "";
    img.alt = p.name;
  }

  const btn = document.getElementById("addToCartBtn");
  btn.innerHTML = "🛒 Add to Cart";

  document.getElementById("pdetailOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
};

window.closeDetail = function () {
  document.getElementById("pdetailOverlay").classList.remove("open");
  document.body.style.overflow = "";
  modalProduct = null;
  modalQty     = 1;
};

// Close on overlay click
document.getElementById("pdetailOverlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeDetail();
});

window.changeQty = function (delta) {
  modalQty = Math.max(1, Math.min(20, modalQty + delta));
  document.getElementById("qtyVal").textContent = modalQty;
};

window.addToCartFromModal = function () {
  if (!modalProduct) return;
  addToCart(modalProduct, modalQty);
  showToast(`🕸️ ${modalQty}× ${modalProduct.name} added to cart!`);
  const btn = document.getElementById("addToCartBtn");
  btn.innerHTML = "✅ Added!";
  setTimeout(() => { btn.innerHTML = "🛒 Add to Cart"; }, 1800);
};

window.buyNowFromModal = function () {
  if (!modalProduct) return;
  addToCart(modalProduct, modalQty);
  window.location.href = "cart.html";
};

// ── NAVBAR SCROLL ────────────────────────────────────────────────
window.addEventListener("scroll", () => {
  document.getElementById("navbar").style.background =
    window.scrollY > 60 ? "rgba(6,8,16,.95)" : "rgba(6,8,16,.8)";
}, { passive: true });

// ── HERO PARTICLES ───────────────────────────────────────────────
function spawnParticles() {
  const c = document.getElementById("heroParticles");
  if (!c) return;
  const colors = ["#dc1e30","#ff3347","#4169e1","#00aaff"];
  for (let i = 0; i < 35; i++) {
    const p = document.createElement("div");
    const sz = Math.random() * 4 + 2;
    p.style.cssText = `
      position:absolute;border-radius:50%;
      width:${sz}px;height:${sz}px;
      background:${colors[i%4]};left:${Math.random()*100}%;
      box-shadow:0 0 ${sz*3}px ${colors[i%4]};
      animation:floatP ${Math.random()*10+8}s ${Math.random()*10}s linear infinite;opacity:0;
    `;
    c.appendChild(p);
  }
  const ks = document.createElement("style");
  ks.textContent = `@keyframes floatP{0%{transform:translateY(100vh) scale(0);opacity:0}10%{opacity:1}90%{opacity:.6}100%{transform:translateY(-10vh) scale(1.5);opacity:0}}`;
  document.head.appendChild(ks);
}
spawnParticles();

// ── TOAST ────────────────────────────────────────────────────────
function showToast(msg, dur = 3000) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), dur);
}

// ── INIT ─────────────────────────────────────────────────────────
updateCartBadge();
