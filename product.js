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
    renderRelatedGear(allProducts);

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
  const container = document.getElementById("shopContainer");
  if (!container) return;
  container.innerHTML = "";

  const sections = [
    { id: "Limited", title: "Limited Edition", subtitle: "Exclusives. Rarities. Legends.", premium: true },
    { id: "Special", title: "Special Collections", subtitle: "Premium quality for every fan.", premium: false }
  ];

  const categories = ["Hoodies", "Toys", "Masks"];

  sections.forEach(sec => {
    // 1. Filter products for this section (Default to Special if missing)
    const secProducts = products.filter(p => (p.section || "Special") === sec.id);
    if (!secProducts.length) return;

    // 2. Create Section Header
    const secHeader = document.createElement("div");
    secHeader.className = "shop-section-header";
    if (!sec.premium) secHeader.style.marginTop = "4rem";
    secHeader.innerHTML = `
      <h2 class="section-title">${sec.title.split(' ')[0]} <span class="accent">${sec.title.split(' ').slice(1).join(' ')}</span></h2>
      <p class="section-subtitle">${sec.subtitle}</p>
    `;
    container.appendChild(secHeader);

    // 3. Create Categories within Section
    categories.forEach(cat => {
      const catProducts = secProducts.filter(p => (p.category || "Masks") === cat);
      if (!catProducts.length) return;

      const catTitle = document.createElement("h3");
      catTitle.className = "category-group-title";
      catTitle.textContent = cat;
      container.appendChild(catTitle);

      const grid = document.createElement("div");
      grid.className = `products-grid ${sec.premium ? 'premium-grid' : ''}`;
      
      catProducts.forEach((p, idx) => {
        const card = document.createElement("div");
        card.className = `product-card ${sec.premium ? 'premium-card' : ''}`;
        card.style.animationDelay = `${idx * 0.08}s`;
        card.onclick = () => openDetail(p.id);
        card.innerHTML = `
          <div class="pc-image-wrap">
            <div class="pc-image">
              ${p.image
                ? `<img src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.parentElement.innerHTML='🕷️'"/>`
                : `<span class="pc-emoji">🕷️</span>`}
            </div>
            ${sec.premium ? `<span class="pc-badge-limited">💎 Limited</span>` : ""}
            ${p.modelUrl ? `<span class="pc-badge-3d">🥽 3D View</span>` : ""}
          </div>
          <div class="pc-body">
            <h3 class="pc-name">${p.name}</h3>
            <p class="pc-desc">${(p.description || "").slice(0, 80)}…</p>
            <div class="pc-footer">
              <span class="pc-price">$${parseFloat(p.price).toFixed(2)}</span>
              ${p.oldPrice ? `<span class="pc-old-price">$${p.oldPrice}</span>` : ""}
            </div>
            <button class="pc-add-btn" onclick="event.stopPropagation(); quickAdd('${p.id}', event)">
               🛒 Add to Cart
             </button>
          </div>
        `;
        grid.appendChild(card);
      });
      container.appendChild(grid);
    });
  });

  // ── 3D TILT EFFECT ──────────────────────────────────────────────
  const cards = document.querySelectorAll(".product-card");
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xRot = 20 * ((x - rect.width / 2) / rect.width);
      const yRot = -20 * ((y - rect.height / 2) / rect.height);
      card.style.transform = `perspective(1000px) rotateX(${yRot}deg) rotateY(${xRot}deg) scale3d(1.05, 1.05, 1.05)`;
      if(card.classList.contains('premium-card')) {
        card.style.boxShadow = "0 30px 60px rgba(0, 170, 255, 0.4), 0 0 20px rgba(0, 170, 255, 0.2)";
      } else {
        card.style.boxShadow = "0 20px 40px rgba(0,0,0,0.6), 0 0 15px rgba(220, 30, 48, 0.4)";
      }
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      card.style.boxShadow = "";
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

