// product.js — Spider-Man Premium Shop Logic v3.0
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { sampleProducts } from "./sample-products.js";

// ── STATE ──
let allProducts = [];
let currentCategory = "All";
let currentUser = null;

// ── SHOW SAMPLE PRODUCTS IMMEDIATELY (no waiting for auth/firestore) ──
allProducts = sampleProducts.map(p => ({
  ...p,
  rating: p.rating || (Math.random() * 1.5 + 3.5).toFixed(1)
}));
document.getElementById("productsLoading").style.display = "none";
applyFilters();

// ── AUTH CHECK (non-blocking) ──
onAuthStateChanged(auth, async (user) => {
  const guard = document.getElementById("authGuard");

  if (!user) {
    // Not logged in — still show products but hide guard
    if (guard) guard.classList.add("hidden");
    const badge = document.getElementById("userBadge");
    if (badge) badge.textContent = "Guest";
    return;
  }

  currentUser = user;
  if (guard) guard.classList.add("hidden");

  const name = user.displayName || user.email.split("@")[0];
  const badge = document.getElementById("userBadge");
  if (badge) badge.textContent = `Hero: ${name}`;

  const adminBtn = document.getElementById("navAdminBtn");
  if (adminBtn && ["admin@spiderman.com", "admin@spidey.com"].includes(user.email)) {
    adminBtn.style.display = "inline-block";
  }

  updateCartBadge();

  // Now try to load Firestore products on top of samples
  await loadFirestoreProducts();
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ── LOAD FIRESTORE PRODUCTS (merges with samples) ──
async function loadFirestoreProducts() {
  try {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const firestoreProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (firestoreProducts.length > 0) {
      // Merge: Firestore products first, then samples as fallback
      const firestoreIds = new Set(firestoreProducts.map(p => p.id));
      const uniqueSamples = sampleProducts.filter(p => !firestoreIds.has(p.id));
      allProducts = [...firestoreProducts, ...uniqueSamples].map(p => ({
        ...p,
        rating: p.rating || (Math.random() * 1.5 + 3.5).toFixed(1)
      }));
      applyFilters();
    }
  } catch (err) {
    console.warn("Firestore unavailable, using sample products:", err);
  }
}

// ── FILTERING & SORTING ──
window.filterCategory = (cat) => {
  currentCategory = cat;
  applyFilters();
};

window.updatePriceLabel = (val) => {
  const pVal = document.getElementById("priceVal");
  if (pVal) pVal.textContent = Number(val).toLocaleString("en-IN");
  applyFilters();
};

window.resetFilters = () => {
  currentCategory = "All";
  const radio = document.querySelector('input[name="category"][value="All"]');
  if (radio) radio.checked = true;

  const range = document.getElementById("priceRange");
  if (range) { range.value = 100000; updatePriceLabel(100000); }

  const sort = document.getElementById("sortSelect");
  if (sort) sort.value = "newest";

  applyFilters();
};

window.applyFilters = applyFilters;
function applyFilters() {
  const sortSelect = document.getElementById("sortSelect");
  const priceRange = document.getElementById("priceRange");
  const shopContainer = document.getElementById("shopContainer");
  const emptyState = document.getElementById("emptyState");
  if (!shopContainer) return;

  const sort = sortSelect?.value || "newest";
  const maxPrice = parseFloat(priceRange?.value || 100000);

  let filtered = [...allProducts];

  // 1. Category filter
  if (currentCategory !== "All") {
    filtered = filtered.filter(p => p.category === currentCategory);
  }

  // 2. Price filter (products use USD prices, convert: 1$ ≈ 83₹)
  filtered = filtered.filter(p => (p.price * 83) <= maxPrice);

  // 3. Sort
  if (sort === "price-low")  filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
  else if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);
  else filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Handle empty state
  if (filtered.length === 0) {
    shopContainer.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  } else {
    shopContainer.style.display = "flex";
    if (emptyState) emptyState.style.display = "none";
  }

  renderGrid(filtered);
}

// ── RENDER PRODUCT GRID ──
function renderGrid(products) {
  const container = document.getElementById("shopContainer");
  container.innerHTML = "";

  const sections = [
    { key: "Toys",    emoji: "🕷️", label: "Toys & Collectibles" },
    { key: "Hoodies", emoji: "🔥", label: "Hoodies & Apparel" },
    { key: "Masks",   emoji: "🎭", label: "Masks & Cosplay" },
  ];

  sections.forEach(({ key, emoji, label }) => {
    const secItems = products.filter(p => p.category === key);
    if (!secItems.length) return;

    const sectionDiv = document.createElement("div");
    sectionDiv.className = `grid-section ${key.toLowerCase()}`;

    sectionDiv.innerHTML = `
      <span class="cat-label">${emoji} Collection</span>
      <h2 class="grid-section-title">${label}</h2>
      <div class="products-grid"></div>
    `;

    const grid = sectionDiv.querySelector(".products-grid");

    secItems.forEach((p, index) => {
      const card = document.createElement("div");
      card.className = "product-card reveal-item";
      card.style.transitionDelay = `${index % 4 * 0.1}s`;

      const stars = "★".repeat(Math.floor(p.rating)) + "☆".repeat(5 - Math.floor(p.rating));
      const priceINR = `₹${(p.price * 83).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      const safeName = encodeURIComponent((p.name || "Spider Merch").replace(/'/g, ""));
      const imgSrc = (p.image && p.image.trim()) ? p.image : `https://placehold.co/600x600/020205/dc1e30?text=${safeName}`;

      card.innerHTML = `
        ${p.section ? `<span class="badge-premium">${p.section}</span>` : ""}
        <div class="pc-image-area">
          <img src="${imgSrc}" alt="${p.name}" loading="lazy"
            onerror="this.onerror=null; this.src='https://placehold.co/600x600/020205/dc1e30?text=${safeName}'">
          <div class="quick-view-overlay">
            <button class="btn-quick-view" onclick="openQuickView('${p.id}')">QUICK VIEW</button>
          </div>
        </div>
        <div class="pc-body">
          <span class="pc-cat">${p.category}</span>
          <h3 class="pc-name">${p.name}</h3>
          <div class="pc-rating">${stars} <span style="font-size:0.65rem; color:rgba(255,255,255,0.3)">(${p.rating})</span></div>
          <p class="pc-price">${priceINR}</p>
          <button class="pc-add-btn" onclick="handleAddToCart('${p.id}', event)">🛒 ADD TO CART</button>
        </div>
      `;

      grid.appendChild(card);
    });

    container.appendChild(sectionDiv);
  });

  // Trigger GSAP reveal animation
  if (typeof gsap !== "undefined") {
    gsap.from(".reveal-item", {
      y: 40,
      opacity: 0,
      duration: 0.5,
      stagger: 0.07,
      ease: "power2.out"
    });
  }
}

// ── CART LOGIC ──
function getCart() { return JSON.parse(localStorage.getItem("spideyCart")) || []; }
function saveCart(cart) {
  localStorage.setItem("spideyCart", JSON.stringify(cart));
  updateCartBadge();
  updateCartPanel();
}

function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  const count = getCart().reduce((s, i) => s + i.qty, 0);
  if (badge) badge.textContent = count;
}

window.handleAddToCart = (id, event) => {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  const cart = getCart();
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...p, qty: 1 });
  }
  saveCart(cart);

  // Shoot web animation
  if (window.webShooter) window.webShooter.shoot(event.clientX, event.clientY);

  showToast(`🕷️ ${p.name} added to cart!`);
  toggleCartPanel(true);
};

// ── CART PANEL ──
const cartPanel    = document.getElementById("cartPanel");
const cartOverlay  = document.getElementById("cartOverlay");
const cartTrigger  = document.getElementById("cartTrigger");
const closeCart    = document.getElementById("closeCart");

function toggleCartPanel(show) {
  cartPanel?.classList.toggle("active", show);
  cartOverlay?.classList.toggle("active", show);
}

cartTrigger?.addEventListener("click", () => { updateCartPanel(); toggleCartPanel(true); });
closeCart?.addEventListener("click", () => toggleCartPanel(false));
cartOverlay?.addEventListener("click", () => toggleCartPanel(false));

function updateCartPanel() {
  const container = document.getElementById("panelItems");
  const totalEl   = document.getElementById("panelTotal");
  const cart = getCart();

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:3rem; opacity:0.4; font-family:'Outfit',sans-serif;">Cart is empty 🕸️</div>`;
    if (totalEl) totalEl.textContent = "₹0.00";
    return;
  }

  let total = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * 83 * item.qty;
    total += itemTotal;
    return `
      <div class="cart-panel-item" style="display:flex; gap:1rem; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding:1rem 0;">
        <img src="${item.image}" style="width:60px; height:60px; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,0.08);">
        <div style="flex:1">
          <h4 style="font-size:0.9rem; margin-bottom:0.2rem; font-weight:700;">${item.name}</h4>
          <p style="font-size:0.8rem; color:rgba(255,255,255,0.5)">₹${(item.price * 83).toLocaleString("en-IN")} × ${item.qty}</p>
        </div>
        <button onclick="removeFromCart('${item.id}')" style="background:none; border:none; color:#ff3347; cursor:pointer; font-size:1.1rem;">✕</button>
      </div>
    `;
  }).join("");

  if (totalEl) totalEl.textContent = `₹${total.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

window.removeFromCart = (id) => {
  let cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
};

// ── QUICK VIEW MODAL ──
window.openQuickView = (id) => {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  const qvImg = document.getElementById("qvImage");
  qvImg.src = p.image;
  qvImg.onerror = function () {
    this.onerror = null;
    this.src = `https://placehold.co/600x600/020205/dc1e30?text=${encodeURIComponent(p.name.replace(/'/g, ""))}`;
  };

  document.getElementById("qvName").textContent  = p.name;
  document.getElementById("qvPrice").textContent = `₹${(p.price * 83).toLocaleString("en-IN")}`;
  document.getElementById("qvDesc").textContent  = p.description || "The ultimate Spider-Man collectible.";
  document.getElementById("qvBadge").textContent = p.section || "Exclusive";

  const stars = "★".repeat(Math.floor(p.rating)) + "☆".repeat(5 - Math.floor(p.rating));
  document.getElementById("qvRating").innerHTML = `${stars} (${p.rating})`;

  const addBtn = document.getElementById("qvAddBtn");
  addBtn.onclick = (e) => { handleAddToCart(p.id, e); document.getElementById("quickView").classList.remove("active"); };

  document.getElementById("quickView").classList.add("active");
};

document.getElementById("closeQuickView")?.addEventListener("click", () => {
  document.getElementById("quickView").classList.remove("active");
});

// ── BACKGROUND PARTICLES ──
function spawnParticles() {
  const container = document.querySelector(".shop-page");
  if (!container) return;
  const colors = ["#dc1e30", "#00aaff"];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div");
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      position:fixed; border-radius:50%;
      width:${size}px; height:${size}px;
      background:${colors[i % 2]}; left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      box-shadow: 0 0 ${size * 3}px ${colors[i % 2]};
      opacity: 0.15; z-index: -1; pointer-events: none;
      animation: float-bg ${Math.random() * 15 + 10}s linear infinite;
    `;
    container.appendChild(p);
  }
}
const pStyle = document.createElement("style");
pStyle.textContent = `@keyframes float-bg { 0% { opacity:0; transform: translateY(0) scale(1); } 50% { opacity:0.3; } 100% { opacity:0; transform: translateY(-300px) scale(1.5); } }`;
document.head.appendChild(pStyle);
spawnParticles();
updateCartBadge();

// ── TOAST ──
function showToast(msg) {
  const t = document.getElementById("toast");
  if (t) { t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3000); }
}
