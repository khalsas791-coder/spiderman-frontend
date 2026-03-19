# 🕷️ Spider-Man E-Commerce Website

A full-stack Spider-Man themed e-commerce website with Firebase authentication, Firestore database, 3D model viewer, and a cinema-grade UI.

## 📁 Project Structure

```
spiderman/
├── 🎨 FRONTEND (Deploy to Vercel)
│   ├── index.html          → Home page (hero, about, auth)
│   ├── auth.html           → Login & Signup page
│   ├── product.html        → Shop page (browse products)
│   ├── cart.html            → Shopping cart
│   ├── checkout.html        → Checkout (address, payment)
│   ├── admin.html           → Admin panel (add/edit/delete products)
│   ├── config.js            → 🌐 API URL configuration
│   ├── firebase-config.js   → Firebase client config
│   ├── script.js            → Home page logic
│   ├── auth.js              → Auth page logic
│   ├── product.js           → Shop page logic
│   ├── cart.js              → Cart page logic
│   ├── checkout.js          → Checkout logic
│   ├── admin.js             → Admin panel logic
│   ├── style.css            → Home page styles
│   ├── auth.css             → Auth page styles
│   ├── product.css          → Shop page styles
│   ├── cart.css             → Cart page styles
│   ├── checkout.css         → Checkout styles
│   ├── admin.css            → Admin panel styles
│   ├── vercel.json          → Vercel routing & headers config
│   ├── models/              → 3D model files (.glb)
│   └── videos/              → Background video files
│
└── 🖥️ BACKEND (Deploy to Render)
    └── backend/
        ├── server.js        → Express API server
        ├── package.json     → Dependencies
        ├── .env             → Local environment variables
        └── .gitignore       → Excludes secrets
```

## 🚀 Deployment Guide

### Step 1: Deploy Backend on Render

1. **Create a new Web Service** on [render.com](https://render.com)
2. **Connect** your GitHub repo
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Root Directory**: `backend` (important!)
6. **Set Environment Variables** on Render dashboard:

   | Variable | Value |
   |----------|-------|
   | `PORT` | `10000` (Render auto-sets this) |
   | `FIREBASE_KEY` | Paste entire `serviceAccountKey.json` as one-line JSON string |
   | `ADMIN_EMAILS` | `admin@spiderman.com,admin@spidey.com` |
   | `FRONTEND_URL` | `https://your-project.vercel.app` |
   | `NODE_ENV` | `production` |

7. **Get your Render URL** (e.g., `https://spiderman-backend.onrender.com`)

### Step 2: Update Frontend Config

1. Open `config.js`
2. Replace the placeholder Render URL:
   ```javascript
   // Line ~29: Replace with your actual Render URL
   return "https://your-actual-backend.onrender.com";
   ```

### Step 3: Deploy Frontend on Vercel

1. **Import project** on [vercel.com](https://vercel.com)
2. **Framework Preset**: `Other` (static site)
3. **Root Directory**: `.` (project root, NOT backend)
4. Vercel will auto-detect `vercel.json`
5. **Done!** Your site is live at `https://your-project.vercel.app`

### Step 4: Update Backend CORS

1. Go to Render dashboard → Environment Variables
2. Set `FRONTEND_URL` to your Vercel URL
3. Redeploy

## 🔐 Environment Variables

### Backend (Render)
```env
PORT=10000
FIREBASE_KEY={"type":"service_account","project_id":"...", ... }
ADMIN_EMAILS=admin@spiderman.com,admin@spidey.com
FRONTEND_URL=https://your-project.vercel.app
NODE_ENV=production
```

### Frontend
The frontend uses `config.js` instead of `.env` files since it's a static site. Edit the Render URL directly in `config.js`.

## 🛠️ Local Development

### Backend
```bash
cd backend
npm install
# Create .env file with your Firebase credentials
npm run dev
```

### Frontend
Serve the root directory with any static server:
```bash
# Option 1: VS Code Live Server extension
# Option 2: Python
python -m http.server 5500
# Option 3: npx
npx serve .
```

## 🔒 Security Checklist

- [x] No `serviceAccountKey.json` in production
- [x] No hardcoded `localhost` URLs in frontend
- [x] CORS configured for specific domains
- [x] Firebase credentials via environment variables
- [x] Admin routes protected by email verification
- [x] Auth guard on protected pages
- [x] Security headers via Vercel config

## 📋 API Routes

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | Public | Health check |
| POST | `/api/login` | Public | Verify Firebase ID token |
| GET | `/api/products` | Public | List all products |
| POST | `/api/products` | Admin | Add product |
| PUT | `/api/products/:id` | Admin | Edit product |
| DELETE | `/api/products/:id` | Admin | Delete product |
| GET | `/api/cart/:uid` | Auth | Get user cart |
| POST | `/api/cart/:uid` | Auth | Save user cart |
| POST | `/api/orders` | Auth | Place order |
| GET | `/api/orders/:uid` | Auth | User order history |
| GET | `/api/admin/orders` | Admin | All orders |

## ✨ Features

- 🎬 Cinematic hero section with video background
- 🕸️ Spider-web SVG animations and particle effects
- 🎭 3D model viewer for product previews
- 🔐 Firebase authentication (login/signup)
- 🛒 Full shopping cart with localStorage
- 💳 Multiple payment options (Card, UPI, COD)
- 📦 Order management system
- 👨‍💼 Admin panel (add/edit/delete products + view orders)
- 🎨 Glassmorphism UI design
- 📱 Responsive design
