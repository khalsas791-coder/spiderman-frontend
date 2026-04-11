require('dotenv').config();
const express = require('express');
const { Sequelize } = require('sequelize');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5001;

// --- SQLITE DATABASE INITIALIZATION ---
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'), // Your VS Code accessible DB file
  logging: false
});

// Import Models
const Admin = require('./models/Admin')(sequelize);
const Product = require('./models/Product')(sequelize);

// Initialize DB structure
sequelize.sync()
  .then(() => console.log('✅ SQLite Connection Initialized: database.sqlite is online.'))
  .catch(err => console.error('❌ Database Sync Failure:', err));

// --- MULTER CONFIGURATION ---
const uploadDirs = ['uploads/images', 'uploads/models'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'image') cb(null, 'uploads/images');
    else if (file.fieldname === 'glb') cb(null, 'uploads/models');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- AUTH MIDDLEWARE ---
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, access denied.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid authorization token.' });
  }
};

// --- ROUTES ---

// Initial Seed for Admin in SQLite
app.post('/api/auth/seed', async (req, res) => {
  try {
    const existing = await Admin.findOne({ where: { email: process.env.ADMIN_EMAIL } });
    if (existing) return res.status(400).json({ msg: 'Admin already registered in SQL.' });
    
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await Admin.create({
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      name: 'SQL Spider Admin'
    });
    res.json({ msg: 'Admin seeded in SQLite database.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const adminUser = await Admin.findOne({ where: { email } });
    if (!adminUser) return res.status(400).json({ msg: 'Credentials rejected.' });
    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) return res.status(400).json({ msg: 'Credentials rejected.' });
    const token = jwt.sign({ id: adminUser.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, admin: { email: adminUser.email, name: adminUser.name } });
  } catch (err) {
    res.status(500).json({ msg: 'Server SQL failure' });
  }
});

// GET all products
app.get('/api/products', auth, async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD product (Handling Multipart Form data)
app.post('/api/products', auth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'glb', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files['image']) return res.status(400).json({ msg: 'Image required.' });
    
    const { name, description, price, category, status } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/images/${req.files['image'][0].filename}`;
    const modelUrl = req.files['glb'] ? `${baseUrl}/uploads/models/${req.files['glb'][0].filename}` : null;

    const newProduct = await Product.create({
      name, description, price: parseFloat(price), category, status, imageUrl, modelUrl
    });
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to deploy to SQLite arsenal.', error: err.message });
  }
});

// DELETE product
app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    const result = await Product.destroy({ where: { id: req.params.id } });
    if (result === 0) return res.status(404).json({ msg: 'Gear not found in SQL.' });
    res.json({ msg: 'Asset decommissioned from SQL.' });
  } catch (err) {
    res.status(500).json({ msg: 'SQL drop failed.' });
  }
});

// STATS
app.get('/api/stats', auth, async (req, res) => {
  try {
    const count = await Product.count();
    const categories = await Product.findAll({ attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('category')), 'category']] });
    const recent = await Product.findAll({ order: [['createdAt', 'DESC']], limit: 5 });
    res.json({ totalProducts: count, totalCategories: categories.length, recentUploads: recent });
  } catch (err) {
    res.status(500).json({ msg: 'Stats query error' });
  }
});

app.listen(PORT, () => console.log(`🕷️ SQLite Engine running on port ${PORT}`));
