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
    const status = res.statusCode;
    // Only log errors — suppress routine 2xx / 3xx / OPTIONS noise
    if (status >= 400) {
      const duration = Date.now() - start;
      console.error(`[${new Date().toISOString()}] [API ERROR] ${req.method} ${req.originalUrl} - ${status} (${duration}ms)`);
    }
  });
  next();
});

const isAllowedLocalDevOrigin = (origin) => {
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
};

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = env.socket.corsOrigins.includes(origin) || (env.isDev && isAllowedLocalDevOrigin(origin));
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin "${origin}" is not allowed`));
  },
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
app.use('/api/conversations', channelsRoutes);

// Standalone message mutations (edit & soft-delete)
//   PATCH  /api/messages/:id
//   DELETE /api/messages/:id
app.use('/api/messages', messagesRoutesStandalone);

// Internal socket bridge endpoint (called by the main api service to propagate events to the clients connected here)
app.post('/api/internal/socket/emit', (req, res) => {
  const { room, event, payload } = req.body;
  const io = req.app.get('io');
  if (io) {
    if (room) {
      io.to(room).emit(event, payload);
    } else {
      io.emit(event, payload);
    }
    return res.status(200).json({ success: true, message: `Emitted to room ${room}` });
  }
  return res.status(500).json({ success: false, message: 'Socket.IO instance not found' });
});

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
