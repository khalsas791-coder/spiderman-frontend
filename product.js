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
function saveCart(cart)  {
  localStorage.setItem("spideyCart", JSON.stringify(cart));
  updateCartBadge();
  updateMiniCart();
}

function updateCartBadge() {
  const cart  = getCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById("cartCount");
  if (badge) {
    badge.textContent = count;
    badge.classList.add("bounce-in");
    setTimeout(() => badge.classList.remove("bounce-in"), 500);
  }
}

// ── MINI CART LOGIC ─────────────────────────────────────────────
window.showMiniCart = function() {
  const mc = document.getElementById("miniCart");
  if(mc) mc.classList.add("show");
  updateMiniCart();
};
window.hideMiniCart = function() {
  const mc = document.getElementById("miniCart");
  if(mc) mc.classList.remove("show");
};

function updateMiniCart() {
  const cart = getCart();
  const container = document.getElementById("miniCartItems");
  if(!container) return;

  if(!cart.length) {
    container.innerHTML = `<p style="text-align:center; font-size:0.8rem; color:rgba(255,255,255,0.4); padding:1rem;">Your arsenal is empty.</p>`;
    return;
  }

  container.innerHTML = cart.slice(-3).reverse().map(i => `
    <div class="mini-cart-item">
      <img src="${i.image || 'https://via.placeholder.com/40'}" onerror="this.src='https://via.placeholder.com/40'" alt="${i.name}">
      <div class="mci-info">
        <p class="mci-name">${i.name}</p>
        <p class="mci-price">${i.qty} × $${i.price.toFixed(2)}</p>
      </div>
    </div>
  `).join('');
}


function addToCart(product, qty = 1, event = null) {
  const cart     = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty      = Math.min(20, existing.qty + qty);
    existing.lineTotal = existing.qty * existing.price;
  } else {
    cart.push({ ...product, qty, lineTotal: qty * product.price });
  }
  saveCart(cart);

  // Trigger web shooting animation if event is provided
  if (event && window.webShooter) {
    window.webShooter.shoot(event.clientX, event.clientY);
  }
}


// ── LOAD PRODUCTS FROM FIRESTORE ────────────────────────────────
let allProducts = [];

async function loadProducts() {
  const loading = document.getElementById("productsLoading");
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
    renderRelatedGear(allProducts);

  } catch (err) {
    console.error("Load products failed:", err);
    if (loading) loading.style.display = "none";
    if (empty) empty.style.display = "flex";
  }
}

// ── FILTERING LOGIC ─────────────────────────────────────────────
let currentCategory = "All";

window.filterCategory = (cat) => {
  currentCategory = cat;
  document.querySelectorAll(".cat-nav-btn").forEach(b => {
    b.classList.toggle("active", b.textContent.includes(cat) || (cat === "All" && b.textContent === "All"));
  });
  applyFilters();
};

window.updatePriceLabel = (val) => {
  const pVal = document.getElementById("priceVal");
  if (pVal) pVal.textContent = val;
  applyFilters();
};

window.applyFilters = () => {
  const sortSelect = document.getElementById("sortSelect");
  const priceRange = document.getElementById("priceRange");
  if (!sortSelect || !priceRange) return;

  const sort = sortSelect.value;
  const maxPrice = parseFloat(priceRange.value);
  
  let filtered = [...allProducts];
  if (currentCategory !== "All") {
    filtered = filtered.filter(p => p.category === currentCategory);
  }
  filtered = filtered.filter(p => p.price <= maxPrice);

  if (sort === "price-low") filtered.sort((a,b) => a.price - b.price);
  else if (sort === "price-high") filtered.sort((a,b) => b.price - a.price);
  else if (sort === "rating") filtered.sort((a,b) => (b.rating || 0) - (a.rating || 0));
  
  renderProducts(filtered);
};

// ── CATEGORY RENDERER ───────────────────────────────────────────
function renderProducts(products) {
  const container = document.getElementById("shopContainer");
  if (!container) return;
  container.innerHTML = "";

  const cats = currentCategory === "All" ? ["Masks", "Hoodies", "Toys"] : [currentCategory];

  cats.forEach(cat => {
    const catProducts = products.filter(p => p.category === cat);
    if (!catProducts.length) return;

    const section = document.createElement("section");
    section.className = "category-section fade-in-up";
    section.innerHTML = `
      <div class="shop-section-header">
        <h2 class="section-title">${cat} <span class="accent">Collection</span></h2>
      </div>
      <div class="products-grid ${cat === 'Toys' ? 'toys-grid' : ''}" id="grid-${cat}"></div>
    `;
    container.appendChild(section);

    const grid = section.querySelector(".products-grid");
    catProducts.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = `product-card category-${cat.toLowerCase()}`;
      card.style.animationDelay = `${idx * 0.1}s`;
      
      let specializedUI = "";
      if (cat === "Masks" && p.modelUrl) {
        specializedUI = `<div class="pc-badge-3d">🎭 3D View</div>`;
      } else if (cat === "Hoodies" && p.sizes) {
        specializedUI = `<div class="pc-sizes">${p.sizes.map(s => `<span>${s}</span>`).join('')}</div>`;
      } else if (p.discount) {
        specializedUI = `<div class="pc-badge-discount">${p.discount}</div>`;
      }

      card.innerHTML = `
        <div class="pc-image-wrap" onclick="openDetail('${p.id}')">
          <div class="pc-image">
             ${(cat === "Masks" && p.modelUrl) 
                ? `<model-viewer src="${p.modelUrl}" auto-rotate camera-controls shadow-intensity="1" class="card-mv"></model-viewer>`
                : `<img src="${p.image}" alt="${p.name}" loading="lazy">`}
          </div>
          ${specializedUI}
        </div>
        <div class="pc-body">
          <h3 class="pc-name">${p.name}</h3>
          <div class="pc-meta">
            <span class="pc-rating">⭐ ${p.rating || '4.5'}</span>
            <span class="pc-price">$${parseFloat(p.price).toFixed(2)}</span>
          </div>
          <button class="pc-add-btn" onclick="quickAdd('${p.id}', event)">
            ${cat === "Masks" ? "🕸️ Add to Arsenal" : "🛒 Add to Cart"}
          </button>
        </div>
      `;
      grid.appendChild(card);

      // Add 3D Tilt Effect
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xRot = 15 * ((x - rect.width / 2) / rect.width);
        const yRot = -15 * ((y - rect.height / 2) / rect.height);
        card.style.transform = `perspective(1000px) rotateX(${yRot}deg) rotateY(${xRot}deg) scale3d(1.02, 1.02, 1.02)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      });
    });
  });
}


// ── QUICK ADD (from card) ────────────────────────────────────────
window.quickAdd = function (id, event) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  addToCart(p, 1, event);
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

// ── RENDER RELATED GEAR ─────────────────────────────────────────
function renderRelatedGear(products) {
  const grid = document.getElementById("relatedGearGrid");
  if (!grid) return;

  // Filter to show a few items
  const related = products.slice(0, 4);
  grid.innerHTML = related.map(p => `
    <div class="product-card" onclick="openDetail('${p.id}')">
      <div class="pc-image-wrap">
        <div class="pc-image">
          ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<span class="pc-emoji">🕷️</span>`}
        </div>
      </div>
      <div class="pc-body">
        <h3 class="pc-name">${p.name}</h3>
        <p class="pc-price">$${parseFloat(p.price).toFixed(2)}</p>
      </div>
    </div>
  `).join('');
}

// ── INIT ─────────────────────────────────────────────────────────
updateCartBadge();
updateMiniCart();
// Note: loadProducts calls renderRelatedGear after fetching

