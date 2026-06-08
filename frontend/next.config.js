/** @type {import('next').NextConfig} */

// ─────────────────────────────────────────────────────────────────────────────
// Same-origin API proxy (fixes cross-site cookie auth)
//
// The frontend (Vercel) and backend (Render) live on different domains, so the
// auth cookie is a THIRD-PARTY cookie — which modern browsers (Chrome 2024+) now
// block by default. The result was 401 on every authenticated call (the doctor
// dashboard/profile "Failed to load" error).
//
// Fix: in production the frontend calls a RELATIVE "/api/*" path (same-origin),
// and Vercel transparently proxies it to the backend below. The auth cookie then
// becomes FIRST-PARTY for the Vercel domain and is sent on every request.
//
// To use it, set on Vercel:
//   NEXT_PUBLIC_API_URL = /api
//   NEXT_PUBLIC_WS_URL  = https://healthcare-chatbot-backend-1a80.onrender.com  (chat WS stays direct)
//   BACKEND_ORIGIN      = https://healthcare-chatbot-backend-1a80.onrender.com  (optional; overrides default)
//
// Local dev is unaffected: NEXT_PUBLIC_API_URL is unset there, so the client calls
// http://localhost:8081/api directly and never touches this rewrite.
// ─────────────────────────────────────────────────────────────────────────────
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN || 'https://healthcare-chatbot-backend-1a80.onrender.com';

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
