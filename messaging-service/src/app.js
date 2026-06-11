'use strict';

require('./bootstrap/env.bootstrap');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const env = require('./config/env');
const requestId = require('./common/middleware/request-id.middleware');
const errorHandler = require('./common/middleware/error.middleware');

const channelsRoutes = require('./modules/channels/channels.routes');
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

// Serve local uploaded files (development fallback)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'ok', service: 'messaging-service', timestamp: new Date().toISOString() }),
);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'messaging-service' });
});

// ── API Routes ────────────────────────────────────────────────────────────────
// Channels (+ nested messages sub-resource)
//   GET    /api/channels
//   POST   /api/channels
//   POST   /api/channels/dm
//   PATCH  /api/channels/:id/participants/:uid/role
//   GET    /api/channels/:channelId/messages?cursor=&limit=&direction=
//   POST   /api/channels/:channelId/messages/:messageId/pin
//   DELETE /api/channels/:channelId/messages/:messageId/pin
app.use('/api/channels', channelsRoutes);

// Standalone message mutations (edit & soft-delete)
//   PATCH  /api/messages/:id
//   DELETE /api/messages/:id
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
