'use strict';

const { createMainClient, available: redisAvailable } = require('../../bootstrap/redis.bootstrap');
const emitter = require('../emitters/channel.emitter');
const env     = require('../../config/env');
const logger  = require('../../bootstrap/logger.bootstrap');

const PRESENCE_KEY  = (userId) => `presence:${userId}`;
const HEARTBEAT_TTL = Math.ceil(env.presence.timeout / 1000);

let redisClient = null;
function getRedis() {
  if (!redisClient && redisAvailable()) {
    redisClient = createMainClient();
  }
  return redisClient;
}

function presenceHandler(io, socket) {
  const user   = socket.data.user;
  const userId = user._id.toString();
  const redis  = getRedis();

  // Mark online
  (async () => {
    try {
      if (redis) {
        await redis.set(PRESENCE_KEY(userId), socket.id, 'EX', HEARTBEAT_TTL);
      } else {
        logger.debug('[presence] Redis not available, skipping set online');
      }
      emitter.presenceOnline(io, userId);
      logger.info('[presence] Online', { userId });
    } catch (err) {
      logger.error('[presence] Failed to set online', { err: err.message });
    }
  })();

  // Heartbeat ping
  socket.on('presence:ping', async () => {
    try {
      if (redis) {
        await redis.expire(PRESENCE_KEY(userId), HEARTBEAT_TTL);
      }
    } catch (err) {
      logger.warn('[presence] Ping expire failed', { err: err.message });
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    try {
      const allSockets = await io.fetchSockets();
      const stillOnline = allSockets.some(
        (s) => s.id !== socket.id && s.data?.user?._id?.toString() === userId
      );

      if (!stillOnline) {
        if (redis) {
          await redis.del(PRESENCE_KEY(userId));
        }
        emitter.presenceOffline(io, userId, new Date().toISOString());
        logger.info('[presence] Offline', { userId });
      }
    } catch (err) {
      logger.error('[presence] Failed to set offline', { err: err.message });
    }
  });
}

module.exports = presenceHandler;
