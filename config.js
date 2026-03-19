/**
 * config.js — Central configuration for Spider-Man Frontend
 * ─────────────────────────────────────────────────────────
 * This file provides the API_URL for all frontend fetch calls.
 * 
 * For LOCAL development:
 *   API_URL defaults to "http://localhost:5000"
 *
 * For PRODUCTION (Vercel):
 *   Set window.__ENV__.API_URL before this script loads,
 *   or the script auto-detects production by hostname.
 *
 * Usage in other JS files:
 *   import { API_URL } from "./config.js";
 *   fetch(`${API_URL}/api/products`)
 */

// ── Determine API URL ──────────────────────────────────────────
// Priority: 1. window.__ENV__  2. auto-detect  3. localhost fallback

const ENV = window.__ENV__ || {};

function resolveApiUrl() {
  // 1. Explicit override (set via env injection or script tag)
  if (ENV.API_URL) return ENV.API_URL;

  // 2. If running on Vercel (production), use your Render backend URL
  //    ⚠️ REPLACE this with your actual Render URL before deploying!
  const hostname = window.location.hostname;
  if (hostname.endsWith(".vercel.app") || hostname === "your-custom-domain.com") {
    return "https://spiderman-backend-1.onrender.com";
  }

  // 3. Local development fallback
  return "http://localhost:5000";
}

export const API_URL = resolveApiUrl();

// Log for debugging (removed in production by browser)
console.log(`🌐 API_URL = ${API_URL}`);
