require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const Product = require('./models/Product');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spiderman_admin')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- AUTH ROUTES ---

// Initial Seed for Admin (Simplified for MVP)
app.post('/api/auth/seed', async (req, res) => {
  try {
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) return res.status(400).json({ msg: 'Admin already exists' });
    
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    const newAdmin = new Admin({
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      name: 'Spider Admin'
    });
    await newAdmin.save();
    res.json({ msg: 'Admin account seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const adminUser = await Admin.findOne({ email });
    if (!adminUser) return res.status(400).json({ msg: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, admin: { email: adminUser.email, name: adminUser.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware for protected routes
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// --- PRODUCT ROUTES ---

// Get all products
app.get('/api/products', auth, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add product
app.post('/api/products', auth, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const saved = await newProduct.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
app.put('/api/products/:id', auth, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics: Record View
app.put('/api/products/:id/view', async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { $inc: { 'analytics.views': 1 } });
    res.json({ msg: 'View recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard Stats
app.get('/api/stats', auth, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const categories = await Product.distinct('category');
    const recentUploads = await Product.find().sort({ createdAt: -1 }).limit(5);
    res.json({ totalProducts, totalCategories: categories.length, recentUploads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
