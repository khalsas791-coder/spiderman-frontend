// admin.js — Admin Panel: auth guard, product CRUD, orders, dashboard stats
import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { sampleProducts } from "./sample-products.js";

// ── FINANCE CONFIG ──────────────────────────────────────────────
let financeChartInstance = null;
let allTransactions = [];


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
  ["products", "orders", "stats", "finance"].forEach(s => {
    document.getElementById(`section${cap(s)}`).style.display = s === section ? "" : "none";
    document.getElementById(`side${cap(s)}`).classList.toggle("active", s === section);
  });
  if (section === "orders") loadOrders();
  if (section === "stats")  loadStats();
  if (section === "finance") loadFinance();
};


function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ════════════════════════════════════════════════
//  PRODUCTS CRUD
// ════════════════════════════════════════════════

// ── SYNC CATALOG ────────────────────────────────────────────────
document.getElementById("btnSyncCatalog")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnSyncCatalog");
    if(!confirm("Are you sure you want to upload all premium sample products to your live Firebase database?")) return;
    
    btn.disabled = true;
    btn.textContent = "Syncing to Firebase...";
    
    try {
        let added = 0;
        for (const p of sampleProducts) {
             const data = {
                name: p.name,
                price: parseFloat(p.price),
                description: p.description,
                image: p.image,
                category: p.category,
                section: p.section,
                stock: 100,
                rating: p.rating || 5.0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
             };
             await addDoc(collection(db, "products"), data);
             added++;
        }
        showToast(`✅ Successfully synced ${added} products!`);
        await loadProducts();
    } catch (err) {
        showToast("❌ Sync failed: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "↺ Sync Catalog to Firebase";
    }
});

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
  
  // reset image preview and input required
  document.getElementById("pImage").value = "";
  document.getElementById("pImageFile").required = true;
  document.getElementById("imagePreviewContainer").style.display = "none";
  document.getElementById("imagePreview").src = "";
  document.getElementById("uploadSpinner").style.display = "none";

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
  const fileInput = document.getElementById("pImageFile");
  const spinner = document.getElementById("uploadSpinner");
  
  btn.disabled = true;
  text.textContent = "Saving…";

  const editId = document.getElementById("editingId").value;
  let imageUrl = document.getElementById("pImage").value;

  const file = fileInput.files[0];

  try {
    if (file) {
      spinner.style.display = "flex";
      const uniqueName = Date.now() + "_" + file.name;
      const storageRef = ref(storage, 'products/' + uniqueName);
      
      const uploadTask = await uploadBytesResumable(storageRef, file);
      imageUrl = await getDownloadURL(uploadTask.ref);
      document.getElementById("pImage").value = imageUrl;
      spinner.style.display = "none";
    }

    if (!imageUrl) {
      throw new Error("Product image is required.");
    }

    const data = {
      name:        document.getElementById("pName").value.trim(),
      price:       parseFloat(document.getElementById("pPrice").value),
      description: document.getElementById("pDesc").value.trim(),
      image:       imageUrl,
      category:    document.getElementById("pCategory").value.trim() || "Masks",
      section:     document.getElementById("pSection").value || "Special",
      stock:       parseInt(document.getElementById("pStock").value) || 0,
      modelUrl:    document.getElementById("pModelUrl").value.trim() || null,
      updatedAt:   serverTimestamp()
    };
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
  
  // Set up edit image preview and remove required constraint
  document.getElementById("pImageFile").required = false;
  document.getElementById("uploadSpinner").style.display = "none";
  if (p.image) {
    document.getElementById("imagePreview").src = p.image;
    document.getElementById("imagePreviewContainer").style.display = "block";
  } else {
    document.getElementById("imagePreview").src = "";
    document.getElementById("imagePreviewContainer").style.display = "none";
  }
  
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

// ── FILE UPLOAD PREVIEW ──────────────────────────────────────────
document.getElementById("pImageFile")?.addEventListener("change", function(e) {
  const file = e.target.files[0];
  const previewContainer = document.getElementById("imagePreviewContainer");
  const previewImage = document.getElementById("imagePreview");
  
  if (file) {
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      showToast("❌ Invalid file type. Please upload JPG or PNG.");
      this.value = "";
      previewContainer.style.display = "none";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("❌ File size must be under 5MB.");
      this.value = "";
      previewContainer.style.display = "none";
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImage.src = e.target.result;
      previewContainer.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    previewContainer.style.display = "none";
  }
});

// ── GLB FILE UPLOAD (drag-and-drop + click) ──────────────────────
let glbObjectUrl = null;

const glbDropZone = document.getElementById("glbDropZone");
const glbFileInput = document.getElementById("pGlbFile");

// Drag events
glbDropZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  glbDropZone.classList.add("drag-over");
});
glbDropZone?.addEventListener("dragleave", () => glbDropZone.classList.remove("drag-over"));
glbDropZone?.addEventListener("drop", (e) => {
  e.preventDefault();
  glbDropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleGlbFile(file);
});

// Click-to-browse
glbFileInput?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handleGlbFile(file);
});

function handleGlbFile(file) {
  const errEl      = document.getElementById("glbError");
  const infoEl     = document.getElementById("glbFileInfo");
  const fileNameEl = document.getElementById("glbFileName");
  const previewWrap = document.getElementById("glbPreviewWrap");
  const loadingEl  = document.getElementById("glbLoading");
  const viewer     = document.getElementById("glbModelViewer");

  // Validate — accept .glb extension or matching MIME
  const isGlb = file.name.toLowerCase().endsWith(".glb") || file.type === "model/gltf-binary";
  if (!isGlb) {
    if (errEl) errEl.style.display = "block";
    if (infoEl) infoEl.style.display = "none";
    if (previewWrap) previewWrap.style.display = "none";
    return;
  }

  // Valid — hide error
  if (errEl) errEl.style.display = "none";

  // Show filename
  if (fileNameEl) fileNameEl.textContent = file.name;
  if (infoEl) infoEl.style.display = "flex";

  // Revoke previous
  if (glbObjectUrl) URL.revokeObjectURL(glbObjectUrl);
  glbObjectUrl = URL.createObjectURL(file);

  // Show preview area + spinner
  if (previewWrap) previewWrap.style.display = "block";
  if (loadingEl)   loadingEl.style.display   = "flex";
  if (viewer)      viewer.style.display      = "none";

  // Load in model-viewer
  if (viewer) {
    viewer.src = glbObjectUrl;
    viewer.addEventListener("load", () => {
      if (loadingEl) loadingEl.style.display = "none";
      viewer.style.display = "block";
    }, { once: true });
    viewer.addEventListener("error", () => {
      if (loadingEl) loadingEl.style.display = "none";
      showToast("❌ Failed to render .glb — file may be corrupted.");
    }, { once: true });
  }

  // Store in hidden input for reference
  const modelUrlInput = document.getElementById("pModelUrl");
  if (modelUrlInput) modelUrlInput.value = file.name; // store name as reference
}

window.removeGlbFile = function () {
  const infoEl      = document.getElementById("glbFileInfo");
  const previewWrap = document.getElementById("glbPreviewWrap");
  const viewer      = document.getElementById("glbModelViewer");
  const errEl       = document.getElementById("glbError");
  const modelUrlInput = document.getElementById("pModelUrl");

  if (glbObjectUrl) { URL.revokeObjectURL(glbObjectUrl); glbObjectUrl = null; }
  if (glbFileInput) glbFileInput.value = "";
  if (infoEl) infoEl.style.display = "none";
  if (previewWrap) previewWrap.style.display = "none";
  if (errEl) errEl.style.display = "none";
  if (viewer) viewer.src = "";
  if (modelUrlInput) modelUrlInput.value = "";
};

// ══════════════════════════════════════════════════
//  FINANCE HUB LOGIC
// ══════════════════════════════════════════════════

window.openFinanceModal = () => {
  document.getElementById("financeFormCard").style.display = "block";
  document.getElementById("fDate").valueAsDate = new Date();
  document.getElementById("financeFormCard").scrollIntoView({ behavior: "smooth" });
};

window.closeFinanceModal = () => {
  document.getElementById("financeFormCard").style.display = "none";
  document.getElementById("financeForm").reset();
};

async function loadFinance() {
  const loading = document.getElementById("financeLoading");
  const list    = document.getElementById("financeList");
  const empty   = document.getElementById("financeEmpty");

  loading.style.display = "block";
  list.innerHTML = "";
  empty.style.display = "none";

  try {
    const q = query(collection(db, "finance"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    allTransactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    loading.style.display = "none";

    if (!allTransactions.length) {
      empty.style.display = "block";
      updateFinanceStats(0, 0, 0);
      renderFinanceChart(0, 0);
      return;
    }

    let income = 0;
    let expense = 0;

    list.innerHTML = allTransactions.map(t => {
      const isInc = t.type === "income";
      const amt = parseFloat(t.amount || 0);
      if (isInc) income += amt; else expense += amt;

      return `
        <tr class="${isInc ? 'row-income' : 'row-expense'}">
          <td>${t.title}</td>
          <td>${isInc ? '🕷️ Mission' : '⚙️ Gear'}</td>
          <td class="f-amount-val">${isInc ? '+' : '-'}$${amt.toFixed(2)}</td>
          <td>${new Date(t.date).toLocaleDateString()}</td>
          <td>
            <button class="btn-f-del" onclick="deleteFinance('${t.id}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join("");

    updateFinanceStats(income, expense, income - expense);
    renderFinanceChart(income, expense);

  } catch (err) {
    loading.style.display = "none";
    showToast("❌ Finance load failed: " + err.message);
  }
}

function updateFinanceStats(inc, exp, bal) {
  animateNum("totalIncome", inc, "$");
  animateNum("totalExpense", exp, "$");
  animateNum("totalBalance", bal, "$");
  
  // Custom color for balance
  const balEl = document.getElementById("totalBalance");
  if (balEl) balEl.style.color = bal >= 0 ? "var(--green)" : "var(--red-light)";
}

window.submitFinance = async (e) => {
  e.preventDefault();
  const btn = document.getElementById("fSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Recording...";

  const data = {
    title: document.getElementById("fTitle").value.trim(),
    amount: parseFloat(document.getElementById("fAmount").value),
    type: document.getElementById("fType").value,
    date: document.getElementById("fDate").value
  };

  try {
    await addDoc(collection(db, "finance"), data);
    showToast("🕸️ Transaction recorded!");
    closeFinanceModal();
    await loadFinance();
  } catch (err) {
    showToast("❌ Save failed: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Record";
  }
};

window.deleteFinance = async (id) => {
  if (!confirm("Are you sure you want to delete this record?")) return;
  try {
    await deleteDoc(doc(db, "finance", id));
    showToast("🗑️ Record deleted.");
    await loadFinance();
  } catch (err) {
    showToast("❌ Delete failed: " + err.message);
  }
};

function renderFinanceChart(income, expense) {
  const ctx = document.getElementById('financeChart');
  if (!ctx) return;

  if (financeChartInstance) {
    financeChartInstance.destroy();
  }

  financeChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Missions Earned', 'Gear Spending'],
      datasets: [{
        data: [income, expense],
        backgroundColor: ['#00aaff', '#dc1e30'],
        borderColor: ['#060810', '#060810'],
        borderWidth: 2,
        hoverOffset: 15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#f0f0f0', font: { family: 'Outfit', size: 12 } }
        }
      },
      cutout: '70%',
      animation: { animateScale: true, animateRotate: true }
    }
  });
}


