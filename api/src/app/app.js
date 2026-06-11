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
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const badgesRoutes = require('./modules/badges/badges.routes');
const reviewsRoutes = require('./modules/reviews/reviews.routes');
const channelsRoutes = require('./modules/channels/channels.routes');
const patientResourcesRoutes = require('./modules/patient-resources/patient-resources.routes');
const uploadsRoutes = require('./modules/uploads/uploads.routes');

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

// Serve local uploaded files (development fallback)
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/conversations', channelsRoutes);
app.use('/api/patient-resources', patientResourcesRoutes);
app.use('/api/uploads', uploadsRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Route not found' });
});

// ── Global error handler (MUST be last) ───────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
