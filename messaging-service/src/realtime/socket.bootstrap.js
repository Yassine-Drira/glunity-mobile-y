'use strict';

const { Server }        = require('socket.io');
const env               = require('../config/env');
const logger            = require('../bootstrap/logger.bootstrap');
const socketAuth        = require('./socket.auth');

const channelHandler  = require('./handlers/channel.handler');
const messageHandler  = require('./handlers/message.handler');
const reactionHandler = require('./handlers/reaction.handler');
const presenceHandler = require('./handlers/presence.handler');

function bootstrap(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin:      env.socket.corsOrigins,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout:  60_000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares:          true,
    },
    transports: ['websocket', 'polling'],
  });

  attachRedisAdapter(io).catch((err) => {
    logger.warn('[socket.io] Redis adapter not attached — running single-instance', { err: err.message });
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const userId = socket.data.user?._id?.toString() ?? 'unknown';
    logger.info('[socket.io] Client connected', { userId, socketId: socket.id });

    socket.userId = userId;
    const redisClient = require('../bootstrap/redis.bootstrap').getPubClient();

    // import { registerPresenceHandler } from './handlers/presence.handler.js';
    const { registerPresenceHandler } = require('./handlers/presence.handler.js');
    registerPresenceHandler(io, socket, redisClient);

    socket.data.io = io;
    if (userId !== 'unknown') {
      socket.join(userId);
    }

    channelHandler (io, socket);
    messageHandler (io, socket);
    reactionHandler(io, socket);
    presenceHandler(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info('[socket.io] Client disconnected', { userId, reason });
    });
  });

  logger.info('[socket.io] Server bootstrapped');
  return io;
}

async function attachRedisAdapter(io) {
  const { createAdapter } = require('@socket.io/redis-adapter');
  const { getPubClient, getSubClient } = require('../bootstrap/redis.bootstrap');

  const pub = getPubClient();
  const sub = getSubClient();

  if (!pub || !sub) {
    throw new Error('Redis clients not initialized (disabled)');
  }

  await Promise.race([
    new Promise((resolve, reject) => {
      if (pub.status === 'ready') return resolve();
      pub.once('ready', resolve);
      pub.once('error', reject);
      pub.once('end',   () => reject(new Error('Redis gave up reconnecting')));
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ready timeout')), 5000)),
  ]);

  io.adapter(createAdapter(pub, sub));
  logger.info('[socket.io] Redis adapter attached ✓');
}

module.exports = bootstrap;
