// product.js — Spider-Man Shop Logic v4.0 (prices native ₹, no conversion)
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { sampleProducts } from "./sample-products.js";

// ── STATE ──
let allProducts = [];
let currentCategory = "All";

// ── INIT — show products immediately from samples ──
function init() {
  allProducts = sampleProducts.map(p => ({
    ...p,
    rating: p.rating || parseFloat((Math.random() * 1.5 + 3.5).toFixed(1))
  }));
  document.getElementById("productsLoading").style.display = "none";
  applyFilters();
}
init();

// ── AUTH (non-blocking — products already shown above) ──
onAuthStateChanged(auth, async (user) => {
  const guard = document.getElementById("authGuard");
  if (guard) guard.classList.add("hidden");

  if (user) {
    const name  = user.displayName || user.email.split("@")[0];
    const badge = document.getElementById("userBadge");
    if (badge) badge.textContent = `Hero: ${name}`;

    const adminBtn = document.getElementById("navAdminBtn");
    if (adminBtn && ["admin@spiderman.com", "admin@spidey.com"].includes(user.email)) {
      adminBtn.style.display = "inline-block";
    }
    // Silently merge Firestore products on top
    await loadFirestoreProducts();
  } else {
    const badge = document.getElementById("userBadge");
    if (badge) badge.textContent = "Guest";
  }

  updateCartBadge();
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ── BACKEND MERGE (Prioritize API) ──
async function loadFirestoreProducts() {
  try {
    const resp = await fetch(`${API_URL}/api/products`);
    if (!resp.ok) throw new Error("API failed");
    const firestoreProds = await resp.json();

    if (firestoreProds.length > 0) {
      const fsIds = new Set(firestoreProds.map(p => p.id));
      const extras = sampleProducts.filter(p => !fsIds.has(p.id));
      allProducts = [...firestoreProds, ...extras].map(p => ({
        ...p,
        rating: p.rating || parseFloat((Math.random() * 1.5 + 3.5).toFixed(1))
      }));
      applyFilters();
    }
  } catch (err) {
    console.warn("Backend API unavailable — using direct Firebase or samples:", err);
    // Fallback to direct Firebase
    try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const fsProds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (fsProds.length > 0) {
          allProducts = [...fsProds, ...sampleProducts].filter((v,i,a)=>a.findIndex(t=>(t.id===v.id))===i);
          applyFilters();
      }
    } catch (e) {
      console.error("All data sources failed:", e);
    }
  }
}

// ── FILTER CONTROLS ──
window.filterCategory = (cat) => {
  currentCategory = cat;
  applyFilters();
};

window.updatePriceLabel = (val) => {
  const el = document.getElementById("priceVal");
  if (el) el.textContent = Number(val).toLocaleString("en-IN");
  applyFilters();
};

window.resetFilters = () => {
  currentCategory = "All";
  const radio = document.querySelector('input[name="category"][value="All"]');
  if (radio) radio.checked = true;
  const range = document.getElementById("priceRange");
  if (range) { range.value = 10000; updatePriceLabel(10000); }
  const sort = document.getElementById("sortSelect");
  if (sort) sort.value = "newest";
  applyFilters();
};

// ── APPLY FILTERS & SORT ──
window.applyFilters = applyFilters;
function applyFilters() {
  const sortSel  = document.getElementById("sortSelect");
  const priceRng = document.getElementById("priceRange");
  const container = document.getElementById("shopContainer");
  const emptyEl   = document.getElementById("emptyState");
  if (!container) return;

  const sort     = sortSel?.value || "newest";
  const maxPrice = parseFloat(priceRng?.value || 10000);

  let filtered = [...allProducts];

  // Category
  if (currentCategory !== "All") {
    filtered = filtered.filter(p => p.category === currentCategory);
  }

  // Price (₹ native — no conversion)
  filtered = filtered.filter(p => parseFloat(p.price) <= maxPrice);

  // Sort
  if (sort === "price-low")  filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
  else if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);
  // "newest" — keep original order

  if (!filtered.length) {
    container.style.display = "none";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  container.style.display = "flex";
  if (emptyEl) emptyEl.style.display = "none";

  renderGrid(filtered);
}

// ── RENDER GRID BY CATEGORY ──
function renderGrid(products) {
  const container = document.getElementById("shopContainer");
  container.innerHTML = "";

  const sections = [
    { key: "Masks",   emoji: "🎭", label: "Masks & Cosplay" },
    { key: "Hoodies", emoji: "🔥", label: "Hoodies & Apparel" },
    { key: "Toys",    emoji: "🕷️", label: "Toys & Collectibles" },
  ];

  sections.forEach(({ key, emoji, label }) => {
    const items = products.filter(p => p.category === key);
    if (!items.length) return;

    const sec = document.createElement("div");
    sec.className = `grid-section ${key.toLowerCase()}`;
    sec.innerHTML = `
      <span class="cat-label">${emoji} Collection</span>
      <h2 class="grid-section-title">${label}</h2>
      <div class="products-grid" id="grid-${key.toLowerCase()}"></div>
    `;
    container.appendChild(sec);

    const grid = sec.querySelector(`#grid-${key.toLowerCase()}`);

    items.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "product-card reveal-item";
      card.style.animationDelay = `${i * 0.12}s`;

      const stars   = "★".repeat(Math.floor(p.rating)) + "☆".repeat(5 - Math.floor(p.rating));
      const priceStr = `₹${parseFloat(p.price).toLocaleString("en-IN")}`;
      const safeName = encodeURIComponent((p.name || "Spider-Man").replace(/'/g, ""));
      const imgSrc   = (p.image && p.image.trim()) ? p.image
                     : `https://placehold.co/600x400/060010/dc1e30?text=${safeName}`;

      card.innerHTML = `
        ${p.section ? `<span class="badge-premium">${p.section}</span>` : ""}
        <div class="pc-image-area">
          <img src="${imgSrc}" alt="${p.name}" loading="lazy"
            onerror="this.onerror=null;this.src='https://placehold.co/600x400/060010/dc1e30?text=${safeName}'">
          <div class="quick-view-overlay">
            <button class="btn-quick-view" onclick="openQuickView('${p.id}')">QUICK VIEW</button>
          </div>
        </div>
        <div class="pc-body">
          <span class="pc-cat">${p.category}</span>
          <h3 class="pc-name" title="${p.name}">${p.name}</h3>
          <div class="pc-rating">${stars}
            <span style="font-size:0.65rem;color:rgba(255,255,255,0.3)">(${p.rating})</span>
          </div>
          <p class="pc-price">${priceStr}</p>
          <button class="pc-add-btn" onclick="handleAddToCart('${p.id}', event)">🛒 ADD TO CART</button>
        </div>
      `;
      grid.appendChild(card);
    });
  });

    // Scroll animations are handled by scroll-animations.js (MutationObserver fires automatically)
}

// ── CART ──
function getCart() { return JSON.parse(localStorage.getItem("spideyCart") || "[]"); }
function saveCart(c) { localStorage.setItem("spideyCart", JSON.stringify(c)); updateCartBadge(); updateCartPanel(); }

function updateCartBadge() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = getCart().reduce((s, i) => s + i.qty, 0);
}

window.handleAddToCart = (id, event) => {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const cart = getCart();
  const ex = cart.find(i => i.id === id);
  if (ex) ex.qty++; else cart.push({ ...p, qty: 1 });
  saveCart(cart);
  if (window.webShooter) window.webShooter.shoot(event.clientX, event.clientY);
  showToast(`🕷️ ${p.name} added!`);
  toggleCartPanel(true);
};

const cartPanel   = document.getElementById("cartPanel");
const cartOverlay = document.getElementById("cartOverlay");
const cartTrigger = document.getElementById("cartTrigger");
const closeCart   = document.getElementById("closeCart");

function toggleCartPanel(show) {
  cartPanel?.classList.toggle("active", show);
  cartOverlay?.classList.toggle("active", show);
}
cartTrigger?.addEventListener("click", () => { updateCartPanel(); toggleCartPanel(true); });
closeCart?.addEventListener("click", () => toggleCartPanel(false));
cartOverlay?.addEventListener("click", () => toggleCartPanel(false));

function updateCartPanel() {
  const cont  = document.getElementById("panelItems");
  const total = document.getElementById("panelTotal");
  const cart  = getCart();
  if (!cont) return;
  if (!cart.length) {
    cont.innerHTML = `<div style="text-align:center;padding:3rem;opacity:.4;font-family:'Outfit',sans-serif">Cart is empty 🕸️</div>`;
    if (total) total.textContent = "₹0";
    return;
  }
  let t = 0;
  cont.innerHTML = cart.map(item => {
    t += item.price * item.qty;
    return `
      <div style="display:flex;gap:1rem;align-items:center;border-bottom:1px solid rgba(255,255,255,0.06);padding:.9rem 0">
        <img src="${item.image}" style="width:58px;height:58px;object-fit:cover;border-radius:10px;border:1px solid rgba(220,30,48,.2)">
        <div style="flex:1">
          <h4 style="font-size:.88rem;font-weight:700;margin-bottom:.15rem">${item.name}</h4>
          <p style="font-size:.78rem;color:rgba(255,255,255,.45)">₹${parseFloat(item.price).toLocaleString("en-IN")} × ${item.qty}</p>
        </div>
        <button onclick="removeFromCart('${item.id}')" style="background:none;border:none;color:#ff3347;cursor:pointer;font-size:1rem">✕</button>
      </div>`;
  }).join("");
  if (total) total.textContent = `₹${t.toLocaleString("en-IN")}`;
}

window.removeFromCart = (id) => { saveCart(getCart().filter(i => i.id !== id)); };

// ── QUICK VIEW ──
window.openQuickView = (id) => {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const img = document.getElementById("qvImage");
  img.src = p.image;
  img.onerror = () => { img.src = `https://placehold.co/600x400/060010/dc1e30?text=${encodeURIComponent(p.name)}`; };
  document.getElementById("qvName").textContent  = p.name;
  document.getElementById("qvPrice").textContent = `₹${parseFloat(p.price).toLocaleString("en-IN")}`;
  document.getElementById("qvDesc").textContent  = p.description || "Premium Spider-Man collectible.";
  document.getElementById("qvBadge").textContent = p.section || "Exclusive";
  const s = "★".repeat(Math.floor(p.rating)) + "☆".repeat(5 - Math.floor(p.rating));
  document.getElementById("qvRating").innerHTML  = `${s} (${p.rating})`;
  document.getElementById("qvAddBtn").onclick    = (e) => { handleAddToCart(p.id, e); document.getElementById("quickView").classList.remove("active"); };
  document.getElementById("quickView").classList.add("active");
};
document.getElementById("closeQuickView")?.addEventListener("click", () => {
  document.getElementById("quickView").classList.remove("active");
});

// ── BACKGROUND PARTICLES ──
(() => {
  const style = document.createElement("style");
  style.textContent = `@keyframes float-bg{0%{opacity:0;transform:translateY(0) scale(1)}50%{opacity:.35}100%{opacity:0;transform:translateY(-280px) scale(1.4)}}`;
  document.head.appendChild(style);
  const cont = document.querySelector(".shop-page");
  if (!cont) return;
  ["#dc1e30","#0078ff"].forEach((col, ci) => {
    for (let i = 0; i < 10; i++) {
      const d = document.createElement("div");
      const sz = Math.random() * 4 + 2;
      d.style.cssText = `position:fixed;border-radius:50%;width:${sz}px;height:${sz}px;background:${col};left:${Math.random()*100}%;top:${Math.random()*100}%;box-shadow:0 0 ${sz*3}px ${col};opacity:.15;z-index:0;pointer-events:none;animation:float-bg ${Math.random()*12+8}s linear ${Math.random()*8}s infinite`;
      cont.appendChild(d);
    }
  });
})();

updateCartBadge();

// ── TOAST ──
function showToast(msg) {
  const t = document.getElementById("toast");
  if (t) { t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3000); }
}

// ── PREFETCHING ──
window.prefetchPage = function(url) {
  if (window.prefetchedUrls && window.prefetchedUrls.has(url)) return;
  if (!window.prefetchedUrls) window.prefetchedUrls = new Set();
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
  window.prefetchedUrls.add(url);
  console.log(`🚀 Prefetched: ${url}`);
};

