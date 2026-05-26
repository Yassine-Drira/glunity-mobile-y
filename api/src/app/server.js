'use strict';

// ── 1. Load .env FIRST (before any other import reads process.env) ─────────────
require('./bootstrap/env.bootstrap');

// ── 2. Config & bootstrap ──────────────────────────────────────────────────────
const env = require('./config/env');
const connectDB = require('./bootstrap/db.bootstrap');
const logger = require('./bootstrap/logger.bootstrap');
const app = require('./app');

// ── 3. Boot sequence ───────────────────────────────────────────────────────────
async function boot() {
  await connectDB();

  const server = app.listen(env.port, () => {
    logger.info(`🚀 GlUnity API running`, {
      port: env.port,
      env: env.node,
      url: `http://localhost:${env.port}`,
    });
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully…`);
    server.close(() => {
      const mongoose = require('mongoose');
      mongoose.connection.close(false, () => {
        logger.info('MongoDB connection closed.');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err: err.message, stack: err.stack });
    process.exit(1);
  });
}

boot();
