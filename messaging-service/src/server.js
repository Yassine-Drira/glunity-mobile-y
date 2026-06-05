'use strict';

require('./bootstrap/env.bootstrap');
const http = require('http');
const app = require('./app');
const env = require('./config/env');
const connectDB = require('./bootstrap/db.bootstrap');
const socketBootstrap = require('./realtime/socket.bootstrap');
const redisBootstrap = require('./bootstrap/redis.bootstrap');
const logger = require('./bootstrap/logger.bootstrap');

const server = http.createServer(app);

// Bootstrap Socket.IO
const io = socketBootstrap(server);

async function start() {
  // Connect to DB
  await connectDB();

  // Listen
  server.listen(env.port, () => {
    logger.info(`Glunity Messaging Microservice running in [${env.node}] mode on port [${env.port}]`);
  });
}

// ── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully…`);

  server.close(async (err) => {
    if (err) {
      logger.error('Error during HTTP server close', { err: err.message });
      process.exit(1);
    }

    try {
      // Disconnect all socket clients and close socket server
      await new Promise((resolve) => io.close(resolve));
      logger.info('[socket.io] Server closed');

      // Disconnect Redis clients
      await redisBootstrap.disconnectAll();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (shutdownErr) {
      logger.error('Error during graceful shutdown dependencies close', { err: shutdownErr.message });
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Force shutdown triggered after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  logger.error('Startup failed', { err: err.message });
  process.exit(1);
});
