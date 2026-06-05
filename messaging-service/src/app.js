'use strict';

require('./bootstrap/env.bootstrap');
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');
const fs           = require('fs');

const env          = require('./config/env');
const requestId    = require('./common/middleware/request-id.middleware');
const errorHandler = require('./common/middleware/error.middleware');

const messagesRoutes = require('./modules/messages/messages.routes');
const messagesRoutesStandalone = require('./modules/messages/messages.routes.standalone');

const app = express();

// ── Basic Middlewares ────────────────────────────────────────────────────────
app.use(requestId);
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] [API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.use(cors({
  origin: env.socket.corsOrigins,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'ok', service: 'messaging-service', timestamp: new Date().toISOString() }),
);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'messaging-service' });
});

// ── API Routes ────────────────────────────────────────────────────────────────
// Mount within-channel route mapping
app.use('/api/channels/:channelId/messages', messagesRoutes);

// Mount standalone message edit/delete routes
app.use('/api/messages', messagesRoutesStandalone);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'Route not found',
  });
});

// ── Global Error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
