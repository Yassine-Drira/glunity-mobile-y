'use strict';

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const corsOptions = require('./config/cors');
const security = require('./config/security');
const { authLimiter, globalLimiter } = require('./config/rate-limit');
const errorMiddleware = require('./common/middleware/error.middleware');
const requestId = require('./common/middleware/request-id.middleware');
const logger = require('./bootstrap/logger.bootstrap');

// ── Route modules ─────────────────────────────────────────────────────────────
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const recipesRoutes = require('./modules/recipes/recipes.routes');
const productsRoutes = require('./modules/products/products.routes');
const locationsRoutes = require('./modules/locations/locations.routes');
const eventsRoutes = require('./modules/events/events.routes');
const registrationsRoutes = require('./modules/events/registrations.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const badgesRoutes = require('./modules/badges/badges.routes');
const reviewsRoutes = require('./modules/reviews/reviews.routes');
const channelsRoutes = require('./modules/channels/channels.routes');
const patientResourcesRoutes = require('./modules/patient-resources/patient-resources.routes');
const uploadsRoutes = require('./modules/uploads/uploads.routes');
const reelsRoutes = require('./modules/reels/reels.routes');
const reelPreviewRoutes = require('./modules/reels/reels.preview.routes');

const app = express();



// ── Global middleware ──────────────────────────────────────────────────────────
app.use(requestId);
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});
app.use(security);
app.use(cors(corsOptions));
app.use(globalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Serve local uploaded files (development fallback) with proxy to messaging-service when missing
const fs = require('fs');
const http = require('http');
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

app.use('/uploads', (req, res, next) => {
  // Normalize requested filename and local path
  const rel = decodeURIComponent(req.path || '').replace(/^\/+/, '');
  const localPath = path.join(UPLOADS_DIR, rel);

  // If file exists locally, let express.static-like behavior serve it
  if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.sendFile(localPath);
  }

  // Fallback: proxy the request to the messaging-service uploads endpoint
  // This helps when attachments were stored by the messaging microservice
  const MSG_SERVICE_BASE = process.env.MSG_SERVICE_URL || 'http://localhost:5001';
  const targetUrl = new URL(req.originalUrl, MSG_SERVICE_BASE).toString();

  // Simple HTTP GET proxy stream
  const getter = targetUrl.startsWith('https:') ? require('https') : http;
  const proxyReq = getter.get(targetUrl, (proxyRes) => {
    // If remote responded with an error, provide a graceful placeholder for images
    if (proxyRes.statusCode >= 400) {
      // Determine file extension from request path
      const ext = path.extname(req.path || '').toLowerCase();
      const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
      if (imageExts.has(ext) || req.path.includes('/images-')) {
        // Send a tiny SVG placeholder so image elements render something
        res.setHeader('Content-Type', 'image/svg+xml');
        res.statusCode = 200;
        const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='100%' height='100%' fill='#f3f3f3'/><g fill='#d0d0d0' font-family='Arial, Helvetica, sans-serif' font-size='20'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>Image unavailable</text></g></svg>`;
        return res.end(svg);
      }

      // Non-image: forward the error response to let callers handle it (404 etc.)
      res.statusCode = proxyRes.statusCode || 502;
      proxyRes.pipe(res);
      return;
    }
    // Copy headers
    Object.entries(proxyRes.headers).forEach(([k, v]) => res.setHeader(k, v));
    res.statusCode = proxyRes.statusCode || 200;
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    // On error, pass through to main error/404 handler
    next();
  });
});

// ── Well-Known files (App Links / Universal Links verification) ──────────────
// Serves /.well-known/assetlinks.json (Android) and
// /.well-known/apple-app-site-association (iOS) as public static files.
app.use(
  '/.well-known',
  express.static(path.join(__dirname, '..', '..', '..', '.well-known'), {
    setHeaders(res, filePath) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  })
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// ── API Routes ────────────────────────────────────────────────────────────────
const adminRoutes = require('./modules/admin/admin.routes');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);

app.use('/api/recipes', recipesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/conversations', channelsRoutes);
app.use('/api/patient-resources', patientResourcesRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/reels', reelsRoutes);

// ── Reel Preview (Open Graph / social share) ──────────────────────────────────
// Public route: GET /reel/:id → returns server-rendered HTML with OG meta tags.
// Must be mounted AFTER API routes so /api/... is never shadowed.
app.use('/reel', reelPreviewRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Route not found' });
});

// ── Global error handler (MUST be last) ───────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
