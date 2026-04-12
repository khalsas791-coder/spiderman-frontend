require('dotenv').config();
const express = require('express');
const { Sequelize } = require('sequelize');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// FIREBASE IMPORTS
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

const app = express();
const PORT = process.env.PORT || 5001;

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: process.env.FB_API_KEY,
  authDomain: process.env.FB_AUTH_DOMAIN,
  projectId: process.env.FB_PROJECT_ID,
  storageBucket: process.env.FB_STORAGE_BUCKET,
  messagingSenderId: process.env.FB_MESSAGING_SENDER_ID,
  appId: process.env.FB_APP_ID,
  measurementId: process.env.FB_MEASUREMENT_ID
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const storage = getStorage(fbApp);

// --- SQLITE DATABASE INITIALIZATION (LOCAL LOG) ---
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

const Admin = require('./models/Admin')(sequelize);
const Product = require('./models/Product')(sequelize);

sequelize.sync().then(() => console.log('✅ SQLite Backup Engine: Ready.'));

// --- MULTER ---
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// --- MIDDLEWARE ---
app.use(cors({
    origin: [/https:\/\/.*\.vercel\.app$/, "http://localhost:5173", "http://localhost:5000", "http://localhost:5001"],
    credentials: true
}));
app.use(express.json());

// Serving Frontend static files
app.use(express.static(path.join(__dirname, '../client/dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- HELPERS ---
const mapCategory = (cat) => {
    const map = { 'Hoodie': 'Hoodies', 'Mask': 'Masks', 'Toy': 'Toys' };
    return map[cat] || cat;
};

const uploadToFirebase = async (file, folder) => {
    if (!file) return null;
    const fileName = `${Date.now()}-${file.originalname}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file.buffer);
    return await getDownloadURL(snapshot.ref);
};

// --- AUTH MIDDLEWARE ---
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) { res.status(401).json({ msg: 'Invalid token' }); }
};

// --- ROUTES ---

// Auth
app.post('/api/auth/seed', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'spidey_admin_2024', 10);
        await Admin.upsert({ email: process.env.ADMIN_EMAIL || 'admin@spiderman.com', password: hashedPassword, name: 'Spider Admin' });
        res.json({ msg: 'Admin seeded.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const adminUser = await Admin.findOne({ where: { email } });
        if (!adminUser || !await bcrypt.compare(password, adminUser.password)) return res.status(400).json({ msg: 'Rejected.' });
        const token = jwt.sign({ id: adminUser.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, admin: { email: adminUser.email, name: adminUser.name } });
    } catch (err) { res.status(500).json({ msg: 'Login failure' }); }
});

// GET
app.get('/api/products', auth, async (req, res) => {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        res.json(products);
    } catch (err) {
        const sqlProducts = await Product.findAll({ order: [['createdAt', 'DESC']] });
        res.json(sqlProducts);
    }
});

// ADD
app.post('/api/products', auth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'glb', maxCount: 1 }]), async (req, res) => {
    try {
        const { name, description, price, category, status } = req.body;
        const imageUrl = await uploadToFirebase(req.files['image']?.[0], 'products/images');
        const modelUrl = await uploadToFirebase(req.files['glb']?.[0], 'products/models');
        if (!imageUrl) return res.status(400).json({ msg: 'Image required.' });

        const productData = {
            name, description, price: parseFloat(price), category: mapCategory(category),
            image: imageUrl, imageUrl, modelUrl, status, // DUAL IMAGE FIELD SYNC
            rating: 4.5, createdAt: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, "products"), productData);
        await Product.create({ ...productData, id: docRef.id, createdAt: new Date() });
        res.status(201).json({ id: docRef.id, ...productData });
    } catch (err) {
        res.status(500).json({ msg: 'Deployment failure.', error: err.message });
    }
});

// UPDATE
app.put('/api/products/:id', auth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'glb', maxCount: 1 }]), async (req, res) => {
    try {
        const { name, description, price, category, status } = req.body;
        const productId = req.params.id;
        
        // Fetch existing gear to keep old images if none uploaded
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) return res.status(404).json({ msg: 'Gear not found.' });
        const existingData = productSnap.data();

        // Check for new files
        const newImageUrl = await uploadToFirebase(req.files['image']?.[0], 'products/images');
        const newModelUrl = await uploadToFirebase(req.files['glb']?.[0], 'products/models');

        const updatedData = {
            name, description, price: parseFloat(price), 
            category: mapCategory(category), status,
            image: newImageUrl || existingData.image || existingData.imageUrl,
            imageUrl: newImageUrl || existingData.imageUrl || existingData.image,
            modelUrl: newModelUrl || existingData.modelUrl,
            updatedAt: Timestamp.now()
        };

        await updateDoc(productRef, updatedData);
        await Product.update(updatedData, { where: { id: productId } });

        res.json({ id: productId, ...updatedData });
    } catch (err) {
        res.status(500).json({ msg: 'Modification failure.', error: err.message });
    }
});

// DELETE
app.delete('/api/products/:id', auth, async (req, res) => {
    try {
        await deleteDoc(doc(db, "products", req.params.id));
        await Product.destroy({ where: { id: req.params.id } });
        res.json({ msg: 'Decommissioned.' });
    } catch (err) { res.status(500).json({ msg: 'Drop failed.' }); }
});

// STATS
app.get('/api/stats', auth, async (req, res) => {
    try {
        const snap = await getDocs(collection(db, "products"));
        const recent = await Product.findAll({ order: [['createdAt', 'DESC']], limit: 5 });
        res.json({ totalProducts: snap.size, totalCategories: 3, recentUploads: recent });
// Check Order Status
app.get('/api/order-status/:orderId', async (req, res) => {
    try {
        const orderRef = doc(db, "orders", req.params.orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return res.status(404).json({ msg: 'Order not found' });
        res.json({ status: orderSnap.data().status });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verify Payment (Mock Implementation for now as per Option B)
app.post('/api/verify-payment', async (req, res) => {
    const { orderId, transactionId } = req.body;
    try {
        const orderRef = doc(db, "orders", orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return res.status(404).json({ msg: 'Order not found' });
        
        // In a real scenario, we would verify with PhonePe API here
        // For now, we simulate a successful verification
        await updateDoc(orderRef, { status: 'SUCCESS', transactionId, updatedAt: Timestamp.now() });
        res.json({ success: true, msg: 'Payment verified.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => console.log(`🚀 Arsenal Engine Active on port ${PORT}`));
