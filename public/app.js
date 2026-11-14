const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('techkart_cart') || '[]'),
  user: JSON.parse(localStorage.getItem('techkart_user') || 'null'),
  authMode: 'login'
};

const productGrid = document.getElementById('productGrid');
const resultCount = document.getElementById('resultCount');
const cartCount = document.getElementById('cartCount');
const userStatusBox = document.getElementById('userStatusBox');
const authBtn = document.getElementById('authBtn');

function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function syncHeaderUI() {
  const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  cartCount.textContent = totalQty;

  if (state.user) {
    userStatusBox.textContent = `Logged in as ${state.user.name}`;
    authBtn.textContent = 'Logout';
  } else {
    userStatusBox.textContent = 'Viewing as Guest';
    authBtn.textContent = 'Login / Sign Up';
  }
}

function saveCart() {
  localStorage.setItem('techkart_cart', JSON.stringify(state.cart));
  syncHeaderUI();
}

async function fetchProducts() {
  const search = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categoryFilter').value;

  const params = new URLSearchParams();
  if (category && category !== 'All') params.append('category', category);
  if (search) params.append('search', search);

  const res = await fetch(`/api/products?${params.toString()}`);
  state.products = await res.json();
  renderProducts();
}

function renderProducts() {
  resultCount.textContent = `${state.products.length} items found`;

  if (state.products.length === 0) {
    productGrid.innerHTML = `<p class="muted-text">No matching products found.</p>`;
    return;
  }

  productGrid.innerHTML = state.products.map(p => `
    <article class="product-card">
      <img src="${p.image}" alt="${p.name}" />
      <div class="card-body">
        <div class="card-meta">
          <span>${p.category}</span>
          <span>★ ${p.rating} (${p.stock} in stock)</span>
        </div>
        <h4 class="card-title">${p.name}</h4>
        <p class="card-desc">${p.description}</p>
        <div class="card-footer">
          <span class="price-tag">${formatINR(p.price)}</span>
          <div class="card-btns">
            <button class="btn-secondary" onclick="openProductDetails('${p.id}')">Details</button>
            <button class="btn-primary" onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''}>
              ${p.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>
        </div>
      </div>
    </article>
  `).join('');
}

window.openProductDetails = async function(productId) {
  const res = await fetch(`/api/products/${productId}`);
  if (!res.ok) return;
  const p = await res.json();

  const detailsContent = document.getElementById('detailsContent');
  detailsContent.innerHTML = `
    <img src="${p.image}" alt="${p.name}" style="width:100%; height:240px; object-fit:cover; border-radius:8px; margin-bottom:14px;" />
    <span class="tag">${p.category}</span>
    <h3 style="margin-bottom:8px;">${p.name}</h3>
    <p style="color:#475569; margin-bottom:14px;">${p.description}</p>
    <p style="margin-bottom:16px;"><strong>Availability:</strong> ${p.stock} units ready to dispatch</p>
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span class="price-tag">${formatINR(p.price)}</span>
      <button class="btn-primary" onclick="addToCart('${p.id}'); closeModal('detailsModal');">Add to Cart</button>
    </div>
  `;
  openModal('detailsModal');
};

window.addToCart = function(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  const existing = state.cart.find(item => item.productId === productId);
  if (existing) {
    if (existing.qty < product.stock) {
      existing.qty += 1;
    } else {
      alert(`Maximum available stock (${product.stock}) reached.`);
    }
  } else {
    state.cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty: 1
    });
  }
  saveCart();
};

window.updateCartQty = function(productId, delta) {
  const idx = state.cart.findIndex(i => i.productId === productId);
  if (idx === -1) return;

  state.cart[idx].qty += delta;
  if (state.cart[idx].qty <= 0) {
    state.cart.splice(idx, 1);
  }
  saveCart();
  renderCartModal();
};

function renderCartModal() {
  const listEl = document.getElementById('cartItemsList');
  const summaryBox = document.getElementById('cartSummaryBox');
  const totalEl = document.getElementById('cartTotalValue');

  if (state.cart.length === 0) {
    listEl.innerHTML = `<p class="muted-text" style="padding:14px 0;">Your shopping cart is empty.</p>`;
    summaryBox.classList.add('hidden');
    return;
  }

  summaryBox.classList.remove('hidden');
  let grandTotal = 0;

  listEl.innerHTML = state.cart.map(item => {
    const sub = item.price * item.qty;
    grandTotal += sub;
    return `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong>
          <div class="muted-text">${formatINR(item.price)} x ${item.qty} = ${formatINR(sub)}</div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="updateCartQty('${item.productId}', -1)">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" onclick="updateCartQty('${item.productId}', 1)">+</button>
        </div>
      </div>
    `;
  }).join('');

  totalEl.textContent = formatINR(grandTotal);
}

document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.user) {
    closeModal('cartModal');
    openModal('authModal');
    return;
  }

  const shippingAddress = document.getElementById('shippingAddress').value;
  const paymentMethod = document.getElementById('paymentMethod').value;

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: state.user.id,
      customerName: state.user.name,
      shippingAddress,
      paymentMethod,
      items: state.cart
    })
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.message || 'Could not place order');
    return;
  }

  state.cart = [];
  saveCart();
  document.getElementById('shippingAddress').value = '';
  closeModal('cartModal');
  fetchProducts();
  alert(`Order ${data.order.orderId} confirmed!`);
});

// Authentication Modal & Form handling
function setAuthMode(mode) {
  state.authMode = mode;
  document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('tabRegister').classList.toggle('active', mode === 'register');
  document.getElementById('nameFieldGroup').classList.toggle('hidden', mode === 'login');
  document.getElementById('authSubmitBtn').textContent = mode === 'login' ? 'Login' : 'Create Account';
  document.getElementById('authFeedback').textContent = '';
}

document.getElementById('tabLogin').addEventListener('click', () => setAuthMode('login'));
document.getElementById('tabRegister').addEventListener('click', () => setAuthMode('register'));

document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('authName').value;
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const feedback = document.getElementById('authFeedback');

  const endpoint = state.authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    feedback.textContent = data.message || 'Authentication failed';
    return;
  }

  state.user = data.user;
  localStorage.setItem('techkart_user', JSON.stringify(state.user));
  syncHeaderUI();
  closeModal('authModal');
});

authBtn.addEventListener('click', () => {
  if (state.user) {
    state.user = null;
    localStorage.removeItem('techkart_user');
    syncHeaderUI();
  } else {
    setAuthMode('login');
    openModal('authModal');
  }
});

document.getElementById('cartBtn').addEventListener('click', () => {
  renderCartModal();
  openModal('cartModal');
});

document.getElementById('ordersBtn').addEventListener('click', async () => {
  if (!state.user) {
    setAuthMode('login');
    openModal('authModal');
    return;
  }

  const res = await fetch(`/api/orders/${state.user.id}`);
  const orders = await res.json();
  const listEl = document.getElementById('ordersList');

  if (orders.length === 0) {
    listEl.innerHTML = `<p class="muted-text" style="margin-top:10px;">You haven't placed any orders yet.</p>`;
  } else {
    listEl.innerHTML = orders.map(o => `
      <div class="order-box">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <strong>${o.orderId}</strong>
          <span class="tag" style="margin:0;">${o.status}</span>
        </div>
        <div class="muted-text" style="margin-bottom:6px;">
          Placed on ${new Date(o.placedAt).toLocaleString()} • ${o.paymentMethod}
        </div>
        <ul style="padding-left:18px; font-size:0.88rem; margin-bottom:8px;">
          ${o.items.map(i => `<li>${i.name} (x${i.qty}) — ${formatINR(i.subtotal)}</li>`).join('')}
        </ul>
        <div style="font-size:0.85rem; color:#475569;">Deliver to: ${o.shippingAddress}</div>
        <div style="text-align:right; font-weight:700; margin-top:6px;">Total: ${formatINR(o.totalAmount)}</div>
      </div>
    `).join('');
  }
  openModal('ordersModal');
});

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

window.closeModal = function(id) {
  document.getElementById(id).classList.add('hidden');
};

document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

document.getElementById('searchInput').addEventListener('input', fetchProducts);
document.getElementById('categoryFilter').addEventListener('change', fetchProducts);

syncHeaderUI();
fetchProducts();
