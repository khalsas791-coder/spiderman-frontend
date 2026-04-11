// checkout.js — Checkout: auth guard, order form, payment simulation, Firestore order save
import { auth, db } from "./firebase-config.js";
import { API_URL } from "./config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── AUTH ────────────────────────────────────────────────────────
let currentUser = null;
let idToken     = null;

onAuthStateChanged(auth, async (user) => {
  const guard = document.getElementById("authGuard");
  if (!user) { window.location.href = "auth.html"; return; }
  currentUser = user;
  idToken = await user.getIdToken();
  guard.classList.add("hidden");
  const name = user.displayName || user.email.split("@")[0];
  document.getElementById("userBadge").textContent = `👤 ${name}`;
  
  const adminBtn = document.getElementById("navAdminBtn");
  if (adminBtn && ["admin@spiderman.com", "admin@spidey.com"].includes(user.email)) {
    adminBtn.style.display = "inline-block";
  }
  // Pre-fill email
  const emailEl = document.getElementById("email");
  if (emailEl && user.email) emailEl.value = user.email;
  // Pre-fill name
  if (user.displayName) {
    const parts = user.displayName.split(" ");
    const fn = document.getElementById("firstName");
    const ln = document.getElementById("lastName");
    if (fn) fn.value = parts[0] || "";
    if (ln) ln.value = parts.slice(1).join(" ") || "";
  }
  renderReview();
});

// ── CART ─────────────────────────────────────────────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem("spideyCart")) || []; }
  catch { return []; }
}

function renderReview() {
  const cart  = getCart();
  const items = document.getElementById("reviewItems");

  if (!cart.length) {
    if (items) items.innerHTML = '<p class="review-empty">No items in cart</p>';
    return;
  }

  items.innerHTML = cart.map(item => `
    <div class="review-item">
      <div class="ri-img">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none';this.parentElement.textContent='🕷️'"/>`
          : "🕷️"}
      </div>
      <div class="ri-info">
        <p class="ri-name">${item.name}</p>
        <p class="ri-qty">Qty: ${item.qty}</p>
      </div>
      <span class="ri-price">$${(item.price * item.qty).toFixed(2)}</span>
    </div>
  `).join("");

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = subtotal * 0.08;
  const total    = subtotal + tax;

  document.getElementById("rSubtotal").textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById("rTax").textContent      = `$${tax.toFixed(2)}`;
  document.getElementById("rTotal").textContent    = `$${total.toFixed(2)}`;
}

// ── PAYMENT METHOD SWITCHER ──────────────────────────────────────
document.querySelectorAll(".method-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".method-card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");
    const radio = card.querySelector("input[type=radio]");
    if (radio) radio.checked = true;
    const val = radio ? radio.value : "card";
    switchPaymentPanel(val);
  });
});

function switchPaymentPanel(method) {
  document.getElementById("cardDetails").style.display = method === "card"  ? "" : "none";
  document.getElementById("upiDetails").style.display  = method === "upi"   ? "" : "none";
  document.getElementById("codInfo").style.display     = method === "cod"   ? "" : "none";
}

// ── CARD FORMATTING ──────────────────────────────────────────────
const cardNumInput = document.getElementById("cardNumber");
if (cardNumInput) {
  cardNumInput.addEventListener("input", (e) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 16);
    e.target.value = val.match(/.{1,4}/g)?.join(" ") || val;
  });
}
const cardExpInput = document.getElementById("cardExpiry");
if (cardExpInput) {
  cardExpInput.addEventListener("input", (e) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (val.length >= 3) val = val.slice(0, 2) + "/" + val.slice(2);
    e.target.value = val;
  });
}

// ── UPI APP SELECTOR ────────────────────────────────────────────
let selectedUpiApp = "";
window.selectUpi = function (btn, app) {
  document.querySelectorAll(".upi-app-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedUpiApp = app;
};

// ── PROMO CODE ──────────────────────────────────────────────────
const PROMO_CODES = { "SPIDEY10": 10, "HERO20": 20, "MARVEL15": 15 };
let promoDiscount = 0;

window.applyPromo = function () {
  const code = (document.getElementById("promoInput")?.value || "").trim().toUpperCase();
  const msg  = document.getElementById("promoMsg");
  if (PROMO_CODES[code]) {
    promoDiscount = PROMO_CODES[code];
    msg.textContent = `✅ Code applied! ${promoDiscount}% discount added.`;
    msg.className   = "promo-msg ok";
    showToast(`🕸️ Promo applied: ${promoDiscount}% off!`);
    renderReview();
  } else {
    promoDiscount = 0;
    msg.textContent = `❌ Invalid promo code.`;
    msg.className   = "promo-msg err";
  }
};

// ── VALIDATION ───────────────────────────────────────────────────
function validate() {
  const fields = {
    firstName: "First Name",
    lastName:  "Last Name",
    email:     "Email",
    phone:     "Phone Number",
    address:   "Address",
    city:      "City",
    pincode:   "Pincode"
  };
  for (const [id, label] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      showToast(`❌ ${label} is required.`);
      el?.focus();
      return false;
    }
  }
  const cart = getCart();
  if (!cart.length) { showToast("🛒 Your cart is empty!"); return false; }
  return true;
}

// ── PLACE ORDER ──────────────────────────────────────────────────
window.placeOrder = async function () {
  if (!validate()) return;

  const btn      = document.getElementById("placeOrderBtn");
  const content  = btn.querySelector(".btn-content");
  const spinner  = document.getElementById("orderSpinner");
  content.classList.add("hidden");
  spinner.classList.remove("hidden");
  btn.disabled = true;

  const cart = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = subtotal * 0.08;
  const discount = (subtotal * promoDiscount) / 100;
  const total    = subtotal + tax - discount;

  const payMethod = document.querySelector("input[name='payMethod']:checked")?.value || "card";

  const orderData = {
    userId:        currentUser?.uid || "guest",
    userEmail:     document.getElementById("email").value.trim(),
    shipping: {
      firstName: document.getElementById("firstName").value.trim(),
      lastName:  document.getElementById("lastName").value.trim(),
      phone:     document.getElementById("phone").value.trim(),
      address:   document.getElementById("address").value.trim(),
      city:      document.getElementById("city").value.trim(),
      state:     document.getElementById("state").value.trim(),
      pincode:   document.getElementById("pincode").value.trim()
    },
    products:      cart,
    subtotal,
    tax,
    discount,
    total,
    paymentMethod: payMethod,
    upiApp:        payMethod === "upi" ? selectedUpiApp : null,
    status:        "confirmed",
    createdAt:     new Date().toISOString()
  };

    // If paid, continue to place the order
  } else if (payMethod === "card") {
    // Check card payment simulation
    const isPaid = await processCardPayment(total);
    if (!isPaid) {
      content.classList.remove("hidden");
      spinner.classList.add("hidden");
      btn.disabled = false;
      return;
    }
  } else {
    // COD: Just a small delay for "confirming"
    await new Promise(r => setTimeout(r, 1200));
  }


  let orderId = "SPD-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  // Try backend first
  try {
    const resp = await fetch(`${API_URL}/api/orders`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body:    JSON.stringify({ cart, total, ...orderData })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success) orderId = data.orderId;
    }
  } catch {
    // Fallback: save direct to Firestore
    try {
      const ref = await addDoc(collection(db, "orders"), { ...orderData, orderId });
      orderId = orderId;
    } catch (e) { console.warn("Firestore order save failed:", e); }
  }

  // Clear cart
  localStorage.removeItem("spideyCart");

  // Show success
  showSuccess(orderId, orderData);

  content.classList.remove("hidden");
  spinner.classList.add("hidden");
  btn.disabled = false;
};

function showSuccess(orderId, order) {
  document.getElementById("successOrderId").textContent = orderId;
  document.getElementById("successDetails").innerHTML = `
    <div>📦 <strong>Items:</strong> ${order.products.length} product(s)</div>
    <div>💰 <strong>Total:</strong> $${order.total.toFixed(2)}</div>
    <div>💳 <strong>Payment:</strong> ${payLabel(order.paymentMethod)}</div>
    <div>📍 <strong>Deliver to:</strong> ${order.shipping.address}, ${order.shipping.city}</div>
  `;
  document.getElementById("successOverlay").classList.add("show");
}

function payLabel(m) {
  return { card: "Credit/Debit Card", upi: "UPI", cod: "Cash on Delivery" }[m] || m;
}

window.goHome = function () {
  window.location.href = "product.html";
};

window.closeFailModal = function () {
  document.getElementById("failOverlay").classList.remove("show");
};

function showFailure(reason) {
  document.getElementById("failReason").textContent = reason || "Transaction Declined";
  document.getElementById("failOverlay").classList.add("show");
}


// ── UPI PAYMENT PROCESSING ─────────────────────────────────────────
async function processUpiPayment(amount, name) {
  try {
    const res = await fetch(`${API_URL}/api/payment/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ amount, name })
    });
    const data = await res.json();
    
    if (!data.success) {
      showToast(`❌ Failed to initiate UPI: ${data.error || "Unknown error"}`, 5000);
      return false;
    }

    // Display the overlay
    document.getElementById("upiQrImg").src = data.qrBase64;
    document.getElementById("upiAmount").textContent = `₹${data.amount}`;
    document.getElementById("upiDeepLink").href = data.upiUri;
    
    const overlay = document.getElementById("upiOverlay");
    overlay.classList.add("show");
    
    const statusText = document.getElementById("upiStatusText");
    statusText.textContent = "⏳ Waiting for payment confirmation...";
    
    // Poll for status
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(async () => {
        // If the user closed the modal (cancelled)
        if (!overlay.classList.contains("show")) {
          clearInterval(interval);
          resolve(false);
          return;
        }
        
        try {
          const stRes = await fetch(`${API_URL}/api/payment/status/${data.transactionId}`);
          const stData = await stRes.json();
          
          if (stData.success) {
            if (stData.status === "SUCCESS") {
              clearInterval(interval);
              statusText.textContent = "✅ Payment Successful! Placing order...";
              statusText.style.color = "#00e676";
              setTimeout(() => {
                overlay.classList.remove("show");
                resolve(true);
              }, 1200);
            } else if (stData.status === "FAILED") {
              clearInterval(interval);
              statusText.textContent = "❌ Payment Failed.";
              statusText.style.color = "#ff3347";
              setTimeout(() => resolve(false), 2000);
            }
          }
        } catch (e) {
          console.warn("Polling error:", e);
        }
        
        attempts++;
        if (attempts > 120) { // Timeout after 120 checks (6 minutes)
          clearInterval(interval);
          statusText.textContent = "❌ Payment Timeout.";
          setTimeout(() => resolve(false), 2000);
        }
      }, 3000);
    });

  } catch (err) {
    console.error("UPI error:", err);
    showToast("❌ Connection error while initiating UPI.");
    return false;
  }
}

// ── CARD PAYMENT SIMULATION ──────────────────────────────────────
async function processCardPayment(amount) {
  showToast("💳 Connecting to bank...");
  
  // Update order label for card check
  const spinner = document.getElementById("orderSpinner");
  const originalText = spinner.textContent;
  spinner.textContent = "🛡️ Verifying Card...";

  try {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 3000));
    
    // Simulate random failure (1 in 5 chance)
    const cardNum = document.getElementById("cardNumber")?.value.replace(/\s/g, "") || "";
    
    // Secret "fail" card number for testing: 0000000000000000
    if (cardNum === "0000000000000000" || Math.random() < 0.2) {
      showFailure("Card declined by issuer. Please use another card.");
      return false;
    }

    showToast("✅ Card Authorized!");
    return true;
  } catch (err) {
    showFailure("Payment system unavailable. Try again later.");
    return false;
  } finally {
    spinner.textContent = originalText;
  }
}


// ── TOAST ────────────────────────────────────────────────────────
function showToast(msg, dur = 3200) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), dur);
}
