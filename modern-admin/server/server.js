require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Admin = require('./models/Admin');
const Product = require('./models/Product');

const app = express();
const PORT = process.env.PORT || 5001;

// --- MULTER CONFIGURATION ---

// Ensure directories exist
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

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'image') {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed!'), false);
  } else if (file.fieldname === 'glb') {
    if (file.originalname.endsWith('.glb')) cb(null, true);
    else cb(new Error('Only GLB models allowed!'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
// Expose static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spiderman_admin')
  .then(() => console.log('✅ MongoDB Ready: System Online.'))
  .catch(err => {
    console.error('💥 Database Connection Failed:', err.message);
    process.exit(1);
  });

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

// Auth Login (Existing)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const adminUser = await Admin.findOne({ email });
    if (!adminUser) return res.status(400).json({ msg: 'Credentials rejected.' });
    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) return res.status(400).json({ msg: 'Credentials rejected.' });
    const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, admin: { email: adminUser.email, name: adminUser.name } });
  } catch (err) {
    console.error('Auth Error:', err);
    res.status(500).json({ msg: 'Server core failure' });
  }
});

// Add Product (Refactored for Multer)
app.post('/api/products', auth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'glb', maxCount: 1 }
]), async (req, res) => {
  console.log('📦 Add Product Request Received');
  console.log('Body:', req.body);
  console.log('Files:', req.files);

  try {
    if (!req.files || !req.files['image']) {
      return res.status(400).json({ msg: 'Product Image is mandatory.' });
    }

    const { name, description, price, category, status } = req.body;
    
    // Create base URLs for files
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/images/${req.files['image'][0].filename}`;
    const modelUrl = req.files['glb'] 
      ? `${baseUrl}/uploads/models/${req.files['glb'][0].filename}` 
      : null;

    const newProduct = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      imageUrl,
      modelUrl,
      status
    });

    const saved = await newProduct.save();
    console.log('✅ Product Registry Updated:', saved.name);
    res.status(201).json(saved);

  } catch (err) {
    console.error('❌ Registry Failure:', err.message);
    res.status(500).json({ msg: 'Failed to add gear to arsenal.', error: err.message });
  }
});

// Update Product
app.put('/api/products/:id', auth, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ msg: 'Update failed.' });
  }
});

// Delete Product
app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    const prod = await Product.findById(req.params.id);
    if (!prod) return res.status(404).json({ msg: 'Product not found' });

    // Optional: Clean up local files
    // ... delete logic here ...

    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Asset decommissioned.' });
  } catch (err) {
    res.status(500).json({ msg: 'Decommissioning failed.' });
  }
});

// Get Stats
app.get('/api/stats', auth, async (req, res) => {
  try {
    const count = await Product.countDocuments();
    const categories = await Product.distinct('category');
    const recent = await Product.find().sort({ createdAt: -1 }).limit(5);
    res.json({ totalProducts: count, totalCategories: categories.length, recentUploads: recent });
  } catch (err) {
    res.status(500).json({ msg: 'Stats sync error' });
  }
});

app.get('/api/products', auth, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ msg: 'Query failed' });
  }
});

app.listen(PORT, () => console.log(`🕷️ System active on port ${PORT}`));
