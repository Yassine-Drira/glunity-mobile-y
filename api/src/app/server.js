'use strict';





// ── 1. Load .env FIRST (before any other import reads process.env) ─────────────
require('./bootstrap/env.bootstrap');

// ── 2. Config & bootstrap ──────────────────────────────────────────────────────
const env            = require('./config/env');
const connectDB      = require('./bootstrap/db.bootstrap');
const logger         = require('./bootstrap/logger.bootstrap');
const app            = require('./app');
const http           = require('http');
// ── 3. Boot sequence ───────────────────────────────────────────────────────────
async function boot() {
  await connectDB();

  // Create HTTP server
  const server = http.createServer(app);

  server.listen(env.port, () => {
    logger.info(`🚀 GlUnity API running`, {
      port: env.port,
      env: env.node,
      url: `http://localhost:${env.port}`,
    });
  });


  // Start background jobs
  try {
    require('./jobs/notifications-dispatch.job');
  } catch (err) {
    logger.warn('Failed to start notifications-dispatch job', { err: err.message });
  }

  try {
    require('./jobs/cleanup-finished-events.job');
  } catch (err) {
    logger.warn('Failed to start cleanup-finished-events job', { err: err.message });
  }

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully…`);
    server.close(async () => {
      try {
        const mongoose = require('mongoose');
        await Promise.allSettled([
          mongoose.connection.close(),
        ]);
        logger.info('MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { err: err.message });
        process.exit(1);
      }
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
