const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'data', 'store_db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// default product catalog if store_db.json doesn't exist yet
const initialProducts = [
  {
    id: "prod_101",
    name: "Keychron K2 Wireless Mechanical Keyboard",
    category: "Peripherals",
    price: 6499,
    stock: 14,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=700&q=80",
    description: "75% layout tactile mechanical keyboard with hot-swappable brown switches, RGB backlight, and Mac/Windows keycaps."
  },
  {
    id: "prod_102",
    name: "Digitek Dual-Channel Wireless Lavalier Mic",
    category: "Audio",
    price: 2799,
    stock: 22,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=700&q=80",
    description: "Plug-and-play wireless collar microphone with active ENC noise cancellation and 30m range for content creators."
  },
  {
    id: "prod_103",
    name: "Aluminium Ergonomic Laptop Stand",
    category: "Accessories",
    price: 1299,
    stock: 35,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=700&q=80",
    description: "Heavy-duty anodized aluminium riser compatible with 13-inch to 16-inch laptops. Keeps airflow open during long coding sessions."
  },
  {
    id: "prod_104",
    name: "Sony WH-CH720N Noise Cancelling Headphones",
    category: "Audio",
    price: 8990,
    stock: 9,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80",
    description: "Lightweight over-ear wireless headphones with V1 processor, 35-hour battery life, and multipoint Bluetooth pairing."
  },
  {
    id: "prod_105",
    name: "Logitech MX Master 3S Productivity Mouse",
    category: "Peripherals",
    price: 7995,
    stock: 11,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=700&q=80",
    description: "8000 DPI optical sensor with quiet clicks, MagSpeed electromagnetic scroll wheel, and thumb scroll for horizontal timelines."
  },
  {
    id: "prod_106",
    name: "7-in-1 USB-C Hub for MacBook & Type-C Laptops",
    category: "Accessories",
    price: 1899,
    stock: 28,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=700&q=80",
    description: "Includes 4K HDMI output, 100W PD pass-through charging, SD/TF card slots, and three USB 3.0 ports."
  }
];

function loadDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = {
      products: initialProducts,
      users: [],
      orders: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function hashPassword(rawPassword) {
  return crypto.createHash('sha256').update(rawPassword + '_codealpha_salt').digest('hex');
}

// Get all products (supports category & search query filters)
app.get('/api/products', (req, res) => {
  const db = loadDb();
  const { category, search } = req.query;
  let list = db.products;

  if (category && category !== 'All') {
    list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }
  res.json(list);
});

// Single product details endpoint
app.get('/api/products/:id', (req, res) => {
  const db = loadDb();
  const item = db.products.find(p => p.id === req.params.id);
  if (!item) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.json(item);
});

// User registration
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const db = loadDb();
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDb(db);

  res.status(201).json({
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

// User login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const db = loadDb();
  const user = db.users.find(
    u => u.email.toLowerCase() === email.toLowerCase().trim() && u.passwordHash === hashPassword(password)
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// Create order & update inventory stock
app.post('/api/orders', (req, res) => {
  const { userId, customerName, shippingAddress, paymentMethod, items } = req.body;

  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Cart cannot be empty and user must be logged in' });
  }
  if (!shippingAddress || !shippingAddress.trim()) {
    return res.status(400).json({ message: 'Please provide a delivery address' });
  }

  const db = loadDb();
  let orderTotal = 0;
  const purchasedItems = [];

  for (const cartItem of items) {
    const product = db.products.find(p => p.id === cartItem.productId);
    if (!product) {
      return res.status(404).json({ message: `Product ${cartItem.productId} no longer exists` });
    }
    if (product.stock < cartItem.qty) {
      return res.status(400).json({ message: `Only ${product.stock} units left for ${product.name}` });
    }

    product.stock -= cartItem.qty;
    const subtotal = product.price * cartItem.qty;
    orderTotal += subtotal;

    purchasedItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty: cartItem.qty,
      subtotal
    });
  }

  const newOrder = {
    orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
    userId,
    customerName: customerName || 'Customer',
    shippingAddress: shippingAddress.trim(),
    paymentMethod: paymentMethod || 'Cash on Delivery (COD)',
    items: purchasedItems,
    totalAmount: orderTotal,
    status: 'Confirmed',
    placedAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);
  saveDb(db);

  res.status(201).json({
    message: 'Order placed successfully!',
    order: newOrder
  });
});

// Fetch orders for logged-in user
app.get('/api/orders/:userId', (req, res) => {
  const db = loadDb();
  const userOrders = db.orders.filter(o => o.userId === req.params.userId);
  res.json(userOrders);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
