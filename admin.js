// admin.js — Admin Panel: auth guard, product CRUD, orders, dashboard stats
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── ADMIN CONFIG ────────────────────────────────────────────────
const ADMIN_EMAILS = ["admin@spiderman.com", "admin@spidey.com"];

// ── AUTH GUARD ──────────────────────────────────────────────────
let currentAdmin = null;

onAuthStateChanged(auth, async (user) => {
  const guard  = document.getElementById("authGuard");
  const denied = document.getElementById("accessDenied");

  if (!user) {
    guard.classList.add("hidden");
    denied.style.display = "flex";
    return;
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    guard.classList.add("hidden");
    denied.style.display = "flex";
    showToast("⛔ Admin access required.");
    setTimeout(() => { window.location.href = "index.html"; }, 2000);
    return;
  }

  currentAdmin = user;
  guard.classList.add("hidden");
  document.getElementById("adminEmail").textContent = user.email;

  // Load initial data
  await loadProducts();
});

// ── LOGOUT ──────────────────────────────────────────────────────
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ── SECTION NAVIGATION ──────────────────────────────────────────
window.showSection = function (section) {
  ["products", "orders", "stats"].forEach(s => {
    document.getElementById(`section${cap(s)}`).style.display = s === section ? "" : "none";
    document.getElementById(`side${cap(s)}`).classList.toggle("active", s === section);
  });
  if (section === "orders") loadOrders();
  if (section === "stats")  loadStats();
};

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ════════════════════════════════════════════════
//  PRODUCTS CRUD
// ════════════════════════════════════════════════

let allProducts = [];

async function loadProducts() {
  const loading = document.getElementById("productsLoading");
  const grid    = document.getElementById("productsGrid");
  const empty   = document.getElementById("productsEmpty");

  loading.classList.remove("hidden");
  grid.innerHTML = "";
  empty.style.display = "none";

  try {
    const q    = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    document.getElementById("productCount").textContent = allProducts.length;
    loading.classList.add("hidden");

    if (!allProducts.length) {
      empty.style.display = "flex";
      return;
    }

    grid.innerHTML = allProducts.map((p, i) => productCardHTML(p, i)).join("");

  } catch (err) {
    loading.classList.add("hidden");
    showToast("❌ Failed to load products: " + err.message);
    console.error(err);
  }
}

function productCardHTML(p, delay = 0) {
  return `
    <div class="product-card" style="animation-delay:${delay * 0.06}s">
      <div class="pc-img">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.parentElement.textContent='🕷️'"/>`
          : "🕷️"}
      </div>
      <div class="pc-body">
        <p class="pc-category">${p.category || "Marvel Collectibles"} <span class="pc-section-badge ${p.section === 'Limited' ? 'badge-limited' : 'badge-special'}">${p.section || 'Special'}</span></p>
        <h3 class="pc-name">${p.name}</h3>
        <p class="pc-desc">${p.description || ""}</p>
        <div class="pc-footer">
          <span class="pc-price">$${parseFloat(p.price).toFixed(2)}</span>
          <span class="pc-stock">Stock: ${p.stock || "∞"}</span>
        </div>
      </div>
      <div class="pc-actions">
        <button class="btn-edit" onclick="editProduct('${p.id}')">✏️ Edit</button>
        <button class="btn-del"  onclick="askDeleteProduct('${p.id}', '${p.name.replace(/'/g,"\\'")}')">🗑️ Delete</button>
      </div>
    </div>
  `;
}

// ── FORM OPEN / CLOSE ────────────────────────────────────────────
window.openProductModal = function () {
  document.getElementById("productFormCard").style.display = "";
  document.getElementById("formTitle").textContent = "Add New Product";
  document.getElementById("formBtnText").textContent = "💾 Save Product";
  document.getElementById("productForm").reset();
  document.getElementById("editingId").value = "";
  document.getElementById("productFormCard").scrollIntoView({ behavior: "smooth", block: "start" });
};

window.closeProductModal = function () {
  document.getElementById("productFormCard").style.display = "none";
  document.getElementById("productForm").reset();
};

// ── SUBMIT (ADD / EDIT) ──────────────────────────────────────────
window.submitProduct = async function (e) {
  e.preventDefault();
  const btn  = document.getElementById("formSubmitBtn");
  const text = document.getElementById("formBtnText");
  btn.disabled = true;
  text.textContent = "Saving…";

  const editId = document.getElementById("editingId").value;
  const data = {
    name:        document.getElementById("pName").value.trim(),
    price:       parseFloat(document.getElementById("pPrice").value),
    description: document.getElementById("pDesc").value.trim(),
    image:       document.getElementById("pImage").value.trim(),
    category:    document.getElementById("pCategory").value.trim() || "Masks",
    section:     document.getElementById("pSection").value || "Special",
    stock:       parseInt(document.getElementById("pStock").value) || 0,
    modelUrl:    document.getElementById("pModelUrl").value.trim() || null,
    updatedAt:   serverTimestamp()
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "products", editId), data);
      showToast("✅ Product updated successfully!");
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "products"), data);
      showToast("🕷️ Product added successfully!");
    }
    closeProductModal();
    await loadProducts();
  } catch (err) {
    showToast("❌ Error: " + err.message);
  } finally {
    btn.disabled = false;
    text.textContent = editId ? "💾 Update Product" : "💾 Save Product";
  }
};

// ── EDIT ─────────────────────────────────────────────────────────
window.editProduct = function (id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  document.getElementById("productFormCard").style.display = "";
  document.getElementById("formTitle").textContent = "Edit Product";
  document.getElementById("formBtnText").textContent = "💾 Update Product";
  document.getElementById("editingId").value = id;

  document.getElementById("pName").value     = p.name || "";
  document.getElementById("pPrice").value    = p.price || "";
  document.getElementById("pDesc").value     = p.description || "";
  document.getElementById("pImage").value    = p.image || "";
  
  // Set category dropdown gracefully
  const catSelect = document.getElementById("pCategory");
  if (p.category && Array.from(catSelect.options).some(opt => opt.value === p.category)) {
    catSelect.value = p.category;
  } else {
    catSelect.value = ""; // Force them to pick a new valid category
  }

  document.getElementById("pStock").value    = p.stock || "";
  document.getElementById("pModelUrl").value = p.modelUrl || "";
  
  if (p.section) {
    document.getElementById("pSection").value = p.section;
  } else {
    document.getElementById("pSection").value = "Special";
  }

  document.getElementById("productFormCard").scrollIntoView({ behavior: "smooth", block: "start" });
};

// ── DELETE ────────────────────────────────────────────────────────
let pendingDeleteId = null;

window.askDeleteProduct = function (id, name) {
  pendingDeleteId = id;
  document.getElementById("deleteModal").classList.add("show");
};

window.closeDeleteModal = function () {
  document.getElementById("deleteModal").classList.remove("show");
  pendingDeleteId = null;
};

document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  try {
    await deleteDoc(doc(db, "products", pendingDeleteId));
    closeDeleteModal();
    showToast("🗑️ Product deleted.");
    await loadProducts();
  } catch (err) {
    showToast("❌ Delete failed: " + err.message);
  }
});

// ════════════════════════════════════════════════
//  ORDERS
// ════════════════════════════════════════════════
async function loadOrders() {
  const loading = document.getElementById("ordersLoading");
  const list    = document.getElementById("ordersList");
  const empty   = document.getElementById("ordersEmpty");

  loading.classList.remove("hidden");
  list.innerHTML = "";
  empty.style.display = "none";

  try {
    const q    = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    document.getElementById("ordersCount").textContent = orders.length;
    loading.classList.add("hidden");

    if (!orders.length) { empty.style.display = "flex"; return; }

    list.innerHTML = orders.map((o, i) => `
      <div class="order-card" style="animation-delay:${i*0.04}s">
        <div class="order-top">
          <span class="order-id">${o.orderId || o.id}</span>
          <span class="order-status status-${o.status || 'confirmed'}">${o.status || 'Confirmed'}</span>
        </div>
        <div class="order-details">
          <span>👤 <strong>${o.userEmail || o.userId || 'Guest'}</strong></span>
          <span>💰 <strong>$${parseFloat(o.total || 0).toFixed(2)}</strong></span>
          <span>💳 <strong>${payLabel(o.paymentMethod)}</strong></span>
          <span>📦 <strong>${(o.products || o.cart || []).length} item(s)</strong></span>
          <span>📍 <strong>${o.shipping?.city || o.address || '–'}</strong></span>
          <span>🕐 <strong>${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '–'}</strong></span>
        </div>
      </div>
    `).join("");

  } catch (err) {
    loading.classList.add("hidden");
    showToast("❌ Failed to load orders: " + err.message);
  }
}

function payLabel(m) {
  return { card: "💳 Card", upi: "📱 UPI", cod: "💵 COD" }[m] || (m || "—");
}

// ════════════════════════════════════════════════
//  DASHBOARD STATS
// ════════════════════════════════════════════════
async function loadStats() {
  try {
    const [prodSnap, ordSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(collection(db, "orders"))
    ]);

    const orders   = ordSnap.docs.map(d => d.data());
    const revenue  = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const uniqUsers = new Set(orders.map(o => o.userId)).size;

    animateNum("statProducts", prodSnap.size);
    animateNum("statOrders",   orders.length);
    animateNum("statCustomers", uniqUsers);
    animateNum("statRevenue", revenue, "$");

  } catch (err) {
    showToast("❌ Dashboard load failed.");
  }
}

function animateNum(id, target, prefix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  const isFloat = prefix === "$";
  let start = 0;
  const step = target / 40;
  const t = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = prefix + (isFloat ? start.toFixed(2) : Math.floor(start));
    if (start >= target) clearInterval(t);
  }, 30);
}

// ── TOAST ─────────────────────────────────────────────────────────
function showToast(msg, dur = 3500) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), dur);
}
