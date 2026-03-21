// product.js — Premium Shop Logic
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { sampleProducts } from "./sample-products.js";

// ── STATE ──
let allProducts = [];
let currentCategory = "All";
let currentUser = null;

// ── AUTH GUARD ──
onAuthStateChanged(auth, async (user) => {
  const guard = document.getElementById("authGuard");
  if (!user) { window.location.href = "auth.html"; return; }
  currentUser = user;
  if(guard) guard.classList.add("hidden");
  
  const name = user.displayName || user.email.split("@")[0];
  const badge = document.getElementById("userBadge");
  if(badge) badge.textContent = `Hero: ${name}`;
  
  const adminBtn = document.getElementById("navAdminBtn");
  if (adminBtn && ["admin@spiderman.com", "admin@spidey.com"].includes(user.email)) {
    adminBtn.style.display = "inline-block";
  }
  
  updateCartBadge();
  await loadProducts();
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ── LOAD DATA ──
async function loadProducts() {
  const loading = document.getElementById("productsLoading");
  try {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const firestoreProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Merge Firestore with Samples (Samples act as fallback/base)
    allProducts = firestoreProducts.length > 0 ? [...firestoreProducts, ...sampleProducts] : sampleProducts;
    
    // Ensure ratings exist for samples
    allProducts = allProducts.map(p => ({
        ...p,
        rating: p.rating || (Math.random() * 1.5 + 3.5).toFixed(1) // Random 3.5 - 5.0
    }));

    if (loading) loading.style.display = "none";
    applyFilters(); // Initial render
  } catch (err) {
    console.warn("Firestore fail, using samples:", err);
    allProducts = sampleProducts.map(p => ({ ...p, rating: (Math.random() * 1.5 + 3.5).toFixed(1) }));
    if (loading) loading.style.display = "none";
    applyFilters();
  }
}

// ── FILTERING & SORTING ──
window.filterCategory = (cat) => {
  currentCategory = cat;
  applyFilters();
};

window.updatePriceLabel = (val) => {
  const pVal = document.getElementById("priceVal");
  if (pVal) pVal.textContent = val;
  applyFilters();
};

window.resetFilters = () => {
    currentCategory = "All";
    const radio = document.querySelector('input[name="category"][value="All"]');
    if(radio) radio.checked = true;
    
    const range = document.getElementById("priceRange");
    if(range) { range.value = 1000; updatePriceLabel(1000); }
    
    const sort = document.getElementById("sortSelect");
    if(sort) sort.value = "newest";
    
    applyFilters();
};

window.applyFilters = () => {
  const sortSelect = document.getElementById("sortSelect");
  const priceRange = document.getElementById("priceRange");
  const shopContainer = document.getElementById("shopContainer");
  const emptyState = document.getElementById("emptyState");
  if (!shopContainer) return;

  const sort = sortSelect?.value || "newest";
  const maxPrice = parseFloat(priceRange?.value || 1000);
  
  let filtered = [...allProducts];
  
  // 1. Category
  if (currentCategory !== "All") {
    filtered = filtered.filter(p => p.category === currentCategory);
  }
  
  // 2. Price
  filtered = filtered.filter(p => p.price <= maxPrice);

  // 3. Sort
  if (sort === "price-low") filtered.sort((a,b) => a.price - b.price);
  else if (sort === "price-high") filtered.sort((a,b) => b.price - a.price);
  else if (sort === "rating") filtered.sort((a,b) => b.rating - a.rating);
  else if (sort === "newest") filtered.reverse();

  // Handle Empty State
  if (filtered.length === 0) {
    shopContainer.style.display = "none";
    if(emptyState) emptyState.style.display = "block";
    return;
  } else {
    shopContainer.style.display = "flex";
    if(emptyState) emptyState.style.display = "none";
  }

  renderGrid(filtered);
};

// ── CUSTOM GRID RENDERER ──
function renderGrid(products) {
  const container = document.getElementById("shopContainer");
  container.innerHTML = "";

  const sections = ["Limited Edition", "Special"];
  
  sections.forEach(secName => {
    const secItems = products.filter(p => p.section === secName);
    if (!secItems.length) return;

    const sectionDiv = document.createElement("div");
    sectionDiv.className = `grid-section ${secName.toLowerCase().replace(" ", "-")}`;
    
    sectionDiv.innerHTML = `
      <h2 class="grid-section-title">${secName === 'Limited Edition' ? '🔥 ' : '✨ '}${secName}</h2>
      <div class="products-grid"></div>
    `;
    
    const grid = sectionDiv.querySelector(".products-grid");
    
    secItems.forEach((p, index) => {
      const card = document.createElement("div");
      card.className = "product-card reveal-item";
      card.style.transitionDelay = `${index % 4 * 0.1}s`;
      
      const stars = "★".repeat(Math.floor(p.rating)) + "☆".repeat(5 - Math.floor(p.rating));
      
      card.innerHTML = `
        ${secName === "Limited Edition" ? '<span class="badge-premium">LIMITED</span>' : ''}
        <div class="pc-image-area">
          <img src="${p.image}" alt="${p.name}" onerror="this.src='./images/bg.png'">
          <div class="quick-view-overlay">
             <button class="btn-quick-view" onclick="openQuickView('${p.id}')">QUICK VIEW</button>
          </div>
        </div>
        <div class="pc-body">
          <span class="pc-cat">${p.category}</span>
          <h3 class="pc-name">${p.name}</h3>
          <div class="pc-rating">${stars} <span style="font-size:0.6rem; color:rgba(255,255,255,0.3)">(${p.rating})</span></div>
          <p class="pc-price">$${parseFloat(p.price).toFixed(2)}</p>
          <button class="pc-add-btn" onclick="handleAddToCart('${p.id}', event)">EQUIP GADGET</button>
        </div>
      `;
      grid.appendChild(card);
    });
    
    container.appendChild(sectionDiv);
  });

  // Reveal Animation with GSAP
  gsap.from(".reveal-item", {
    y: 30,
    opacity: 0,
    duration: 0.8,
    stagger: 0.05,
    ease: "power2.out",
    scrollTrigger: {
        trigger: ".shop-content",
        start: "top 80%"
    }
  });
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
    
    // Shoot web
    if (window.webShooter) window.webShooter.shoot(event.clientX, event.clientY);
    
    // Open panel
    toggleCartPanel(true);
};

// ── PANEL & MODAL UI ──
const cartPanel = document.getElementById("cartPanel");
const cartOverlay = document.getElementById("cartOverlay");
const cartTrigger = document.getElementById("cartTrigger");
const closeCart = document.getElementById("closeCart");

function toggleCartPanel(show) {
    cartPanel?.classList.toggle("active", show);
    cartOverlay?.classList.toggle("active", show);
}

cartTrigger?.addEventListener("click", () => {
    updateCartPanel();
    toggleCartPanel(true);
});
closeCart?.addEventListener("click", () => toggleCartPanel(false));
cartOverlay?.addEventListener("click", () => toggleCartPanel(false));

function updateCartPanel() {
    const container = document.getElementById("panelItems");
    const totalEl = document.getElementById("panelTotal");
    const cart = getCart();
    
    if(!container) return;
    
    if(cart.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:3rem; opacity:0.4;">Arsenal is empty</div>`;
        if(totalEl) totalEl.textContent = "$0.00";
        return;
    }
    
    let total = 0;
    container.innerHTML = cart.map(item => {
        total += item.price * item.qty;
        return `
            <div class="cart-panel-item" style="display:flex; gap:1rem; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:1rem;">
                <img src="${item.image}" style="width:60px; height:60px; object-fit:cover; border-radius:10px;">
                <div style="flex:1">
                    <h4 style="font-size:0.9rem; margin-bottom:0.2rem;">${item.name}</h4>
                    <p style="font-size:0.8rem; color:rgba(255,255,255,0.5)">$${item.price} × ${item.qty}</p>
                </div>
                <button onclick="removeFromCart('${item.id}')" style="background:none; border:none; color:var(--red); cursor:pointer;">✕</button>
            </div>
        `;
    }).join("");
    
    if(totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

window.removeFromCart = (id) => {
    let cart = getCart();
    cart = cart.filter(i => i.id !== id);
    saveCart(cart);
};

// ── QUICK VIEW ──
window.openQuickView = (id) => {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById("qvImage").src = p.image;
    document.getElementById("qvName").textContent = p.name;
    document.getElementById("qvPrice").textContent = `$${p.price}`;
    document.getElementById("qvDesc").textContent = p.description || "The ultimate Spider-Man gadget. Built with Stark Industries technology and multiversal durability.";
    document.getElementById("qvBadge").textContent = p.section;
    
    const stars = "★".repeat(Math.floor(p.rating)) + "☆".repeat(5 - Math.floor(p.rating));
    document.getElementById("qvRating").innerHTML = `${stars} (${p.rating})`;
    
    const addBtn = document.getElementById("qvAddBtn");
    addBtn.onclick = (e) => handleAddToCart(p.id, e);
    
    document.getElementById("quickView").classList.add("active");
};

document.getElementById("closeQuickView")?.addEventListener("click", () => {
    document.getElementById("quickView").classList.remove("active");
});

// Toast Helper
function showToast(msg) {
    const t = document.getElementById("toast");
    if(t) { t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3000); }
}
