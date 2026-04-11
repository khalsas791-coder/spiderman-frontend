// admin.js — Professional Console Suite
import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { sampleProducts } from "./sample-products.js";

// ── CONFIG & STATE ──────────────────────────────────────────────
const ADMIN_EMAILS = ["admin@spiderman.com", "admin@spidey.com"];
let allProducts = [];
let allTransactions = [];

// ── AUTH & SECURITY ─────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  const guard = document.getElementById("authGuard");
  const denied = document.getElementById("accessDenied");

  if (!user) {
    guard.classList.add("hidden");
    denied.style.display = "flex";
    return;
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    guard.classList.add("hidden");
    denied.style.display = "flex";
    showToast("⛔ Access restricted.");
    setTimeout(() => { window.location.href = "index.html"; }, 2000);
    return;
  }

  guard.classList.add("hidden");
  document.getElementById("adminEmail").textContent = user.email;
  await loadProducts();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ── NAVIGATION ──────────────────────────────────────────────────
window.showSection = function (section) {
  const sections = ["products", "orders", "stats", "finance"];
  sections.forEach(s => {
    const el = document.getElementById(`section${cap(s)}`);
    const link = document.getElementById(`side${cap(s)}`);
    if (el) el.style.display = s === section ? "block" : "none";
    if (link) link.classList.toggle("active", s === section);
  });

  if (section === "orders") loadOrders();
  if (section === "stats") loadStats();
  if (section === "finance") loadFinance();
};

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── PRODUCTS ARSENAL ────────────────────────────────────────────
async function loadProducts() {
  const loading = document.getElementById("productsLoading");
  const grid = document.getElementById("productsGrid");
  
  loading.style.display = "flex";
  grid.innerHTML = "";

  try {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    document.getElementById("productCount").textContent = allProducts.length;
    loading.style.display = "none";

    grid.innerHTML = allProducts.map((p, i) => `
      <div class="product-card" style="animation-delay:${i * 0.05}s">
        <div class="pc-img">
          ${p.image ? `<img src="${p.image}" alt="${p.name}" onerror="this.src='placeholder.png'"/>` : '<i class="fas fa-spider"></i>'}
          <span class="pc-category">${p.category || 'Gear'}</span>
        </div>
        <div class="pc-body">
          <h3 class="pc-name">${p.name}</h3>
          <p class="pc-desc">${p.description || "Experimental Spidey technology."}</p>
          <div class="pc-footer">
            <span class="pc-price">$${parseFloat(p.price).toFixed(2)}</span>
            <span class="pc-stock">Stock: ${p.stock || 0}</span>
          </div>
        </div>
        <div class="pc-actions">
          <button class="btn-edit" onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i> Modify</button>
          <button class="btn-del" onclick="askDeleteProduct('${p.id}')"><i class="fas fa-trash"></i> Scrap</button>
        </div>
      </div>
    `).join("");

  } catch (err) {
    loading.style.display = "none";
    showToast("❌ System error loading arsenal.");
  }
}

// ── SYNC CATALOG ──
document.getElementById("btnSyncCatalog")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnSyncCatalog");
    if(!confirm("Push mission-ready sample gear to live arsenal?")) return;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
    
    try {
        for (const p of sampleProducts) {
             await addDoc(collection(db, "products"), {
                ...p,
                price: parseFloat(p.price),
                stock: 100,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
             });
        }
        showToast("✅ Deployed assets!");
        await loadProducts();
    } catch (err) {
        showToast("❌ Sync failed.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync"></i> Sync Catalog';
    }
});

// ── CRUD OPERATIONS ─────────────────────────────────────────────
window.openProductModal = () => {
  const card = document.getElementById("productFormCard");
  card.style.display = "block";
  document.getElementById("formTitle").textContent = "Register New Gear";
  document.getElementById("productForm").reset();
  document.getElementById("editingId").value = "";
  document.getElementById("imagePreviewContainer").style.display = "none";
  card.scrollIntoView({ behavior: "smooth" });
};

window.closeProductModal = () => {
  document.getElementById("productFormCard").style.display = "none";
};

window.submitProduct = async (e) => {
  e.preventDefault();
  const btn = document.getElementById("formSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Processing...";

  const editId = document.getElementById("editingId").value;
  const fileInput = document.getElementById("pImageFile");
  let imageUrl = document.getElementById("pImage").value;

  try {
    if (fileInput.files[0]) {
      const file = fileInput.files[0];
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      const uploadTask = await uploadBytesResumable(storageRef, file);
      imageUrl = await getDownloadURL(uploadTask.ref);
    }

    const data = {
      name: document.getElementById("pName").value.trim(),
      price: parseFloat(document.getElementById("pPrice").value),
      description: document.getElementById("pDesc").value.trim(),
      image: imageUrl,
      category: document.getElementById("pCategory").value,
      section: document.getElementById("pSection").value,
      stock: parseInt(document.getElementById("pStock").value),
      updatedAt: serverTimestamp()
    };

    if (editId) {
      await updateDoc(doc(db, "products", editId), data);
      showToast("✅ Arsenal updated.");
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "products"), data);
      showToast("🕷️ New gear deployed.");
    }

    closeProductModal();
    await loadProducts();
  } catch (err) {
    showToast("❌ Command failed.");
  } finally {
    btn.disabled = false;
    btn.textContent = editId ? "Update Gear" : "Register Gear";
  }
};

window.editProduct = (id) => {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  window.openProductModal();
  document.getElementById("formTitle").textContent = "Modify Asset";
  document.getElementById("editingId").value = id;
  document.getElementById("pName").value = p.name;
  document.getElementById("pPrice").value = p.price;
  document.getElementById("pDesc").value = p.description;
  document.getElementById("pImage").value = p.image || "";
  document.getElementById("pCategory").value = p.category;
  document.getElementById("pSection").value = p.section;
  document.getElementById("pStock").value = p.stock || 0;
  if (p.image) {
    document.getElementById("imagePreview").src = p.image;
    document.getElementById("imagePreviewContainer").style.display = "block";
  }
};

// ── DELETE FLOW ────────────────────────────────────────────────
let pendingDeleteId = null;
window.askDeleteProduct = (id) => {
  pendingDeleteId = id;
  document.getElementById("deleteModal").classList.add("show");
};

window.closeDeleteModal = () => {
  document.getElementById("deleteModal").classList.remove("show");
  pendingDeleteId = null;
};

document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  try {
    await deleteDoc(doc(db, "products", pendingDeleteId));
    showToast("🗑️ Asset decommissioned.");
    closeDeleteModal();
    await loadProducts();
  } catch (err) {
    showToast("❌ Error.");
  }
});

// ── MISSIONS (ORDERS) ──────────────────────────────────────────
async function loadOrders() {
  const loading = document.getElementById("ordersLoading");
  const list = document.getElementById("ordersList");
  loading.style.display = "flex";
  list.innerHTML = "";
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById("ordersCount").textContent = orders.length;
    loading.style.display = "none";
    list.innerHTML = orders.map(o => `
      <div class="order-card">
        <div class="order-top">
          <span class="order-id">#${o.orderId || o.id.slice(0, 8)}</span>
          <span class="order-status status-${o.status || 'confirmed'}">${o.status || 'Active'}</span>
        </div>
        <div class="order-details">
          <span><i class="fas fa-user"></i> ${o.userEmail || 'Alias'}</span>
          <span><i class="fas fa-tag"></i> $${parseFloat(o.total || 0).toFixed(2)}</span>
          <span><i class="fas fa-truck"></i> ${o.shipping?.city || 'Secret HQ'}</span>
          <span><i class="fas fa-calendar"></i> ${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Now'}</span>
        </div>
      </div>
    `).join("");
  } catch (err) {
    loading.style.display = "none";
    showToast("❌ Failed to sync missions.");
  }
}

// ── DASHBOARD STATS ─────────────────────────────────────────────
async function loadStats() {
  try {
    const [prodSnap, ordSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(collection(db, "orders"))
    ]);
    const orders = ordSnap.docs.map(d => d.data());
    const revenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const users = new Set(orders.map(o => o.userId)).size;
    animateNum("statProducts", prodSnap.size);
    animateNum("statOrders", orders.length);
    animateNum("statCustomers", users);
    animateNum("statRevenue", revenue, "$");
  } catch (err) {
    showToast("❌ Analytics unreachable.");
  }
}

function animateNum(id, target, prefix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const speed = target / 30;
  const timer = setInterval(() => {
    start += speed;
    if (start >= target) {
      el.textContent = prefix + (prefix === "$" ? target.toFixed(2) : target);
      clearInterval(timer);
    } else {
      el.textContent = prefix + (prefix === "$" ? start.toFixed(2) : Math.floor(start));
    }
  }, 30);
}

// ── FINANCE HUB ────────────────────────────────────────────────
async function loadFinance() {
  const loading = document.getElementById("financeLoading");
  const list = document.getElementById("financeList");
  loading.style.display = "block";
  list.innerHTML = "";
  try {
    const q = query(collection(db, "finance"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    allTransactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    loading.style.display = "none";
    let inc = 0, exp = 0;
    list.innerHTML = allTransactions.map(t => {
      const isInc = t.type === "income";
      const amt = parseFloat(t.amount || 0);
      if (isInc) inc += amt; else exp += amt;
      return `
        <tr class="${isInc ? 'row-income' : 'row-expense'}">
          <td>${t.title}</td>
          <td><i class="fas ${isInc ? 'fa-bolt' : 'fa-cog'}"></i> ${isInc ? 'Inflow' : 'Costs'}</td>
          <td class="f-amount-val">${isInc ? '+' : '-'}$${amt.toFixed(2)}</td>
          <td>${new Date(t.date).toLocaleDateString()}</td>
          <td><button class="btn-f-del" onclick="deleteFinance('${t.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>
      `;
    }).join("");
    animateNum("totalIncome", inc, "$");
    animateNum("totalExpense", exp, "$");
    animateNum("totalBalance", inc - exp, "$");
  } catch (err) {
    loading.style.display = "none";
    showToast("❌ Vault access denied.");
  }
}

window.deleteFinance = async (id) => {
  if (!confirm("Scrap this record?")) return;
  try {
    await deleteDoc(doc(db, "finance", id));
    showToast("🗑️ Record purged.");
    await loadFinance();
  } catch (err) {
    showToast("❌ Purge failed.");
  }
};

// ── UTILS ───────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

document.getElementById("pImageFile")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById("imagePreview").src = ev.target.result;
      document.getElementById("imagePreviewContainer").style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});
