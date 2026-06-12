'use strict';

const { createMainClient, available: redisAvailable } = require('../../bootstrap/redis.bootstrap');
const emitter  = require('../emitters/channel.emitter');
const env      = require('../../config/env');
const logger   = require('../../bootstrap/logger.bootstrap');
const Channel  = require('../../database/models/channel.model');
const mongoose = require('mongoose');

const PRESENCE_KEY  = (userId) => `presence:${userId}`;
const HEARTBEAT_TTL = Math.ceil(env.presence.timeout / 1000);

let redisClientInstance = null;
function getRedis() {
  if (!redisClientInstance && redisAvailable()) {
    redisClientInstance = createMainClient();
  }
  return redisClientInstance;
}

// Lazy-load User model (same shared MongoDB connection as Channel)
function getUserModel() {
  return mongoose.model('User');
}

/**
 * Returns the set of user IDs that share at least one channel with `userId`.
 * These are the only users that need to receive presence updates for this user.
 */
async function getPeerUserIds(userId) {
  const channels = await Channel.find({
    $or: [
      { 'participants.userId': userId }, // Mongoose auto-casts string → ObjectId
      { participants: userId },           // legacy flat-array format
      { isPrivate: { $ne: true } },       // all public channels
    ]
  }).select('participants').lean();

  const peerSet = new Set();
  for (const ch of channels) {
    for (const p of ch.participants || []) {
      const pId = p.userId ? p.userId.toString() : p.toString();
      if (pId !== userId) peerSet.add(pId);
    }
  }
  return [...peerSet];
}

function presenceHandler(io, socket) {
  const user   = socket.data.user;
  const userId = user._id.toString();
  const redis  = getRedis();

  // ── Mark online on connect ───────────────────────────────────────────────────
  (async () => {
    try {
      const User = getUserModel();

      // 1. Join the user's own named room immediately — before any async work
      //    so that peers who connect milliseconds later can already target this socket
      socket.join(userId);

      // 2. Persist to MongoDB
      await User.findByIdAndUpdate(userId, {
        onlineStatus: 'online',
        lastSeenAt: null,
      });

      // 3. Set Redis TTL key (heartbeat window), if Redis is enabled
      if (redis) {
        await redis.set(PRESENCE_KEY(userId), socket.id, 'EX', HEARTBEAT_TTL);
      }

      // 4. Get this user's peer IDs (channel-mates)
      const peerIds = await getPeerUserIds(userId);

      // 5. Tell every peer that this user is now online
      emitter.presenceOnline(io, userId, peerIds);

      // 6. ── SYNC GAP FIX ──────────────────────────────────────────────────
      //    The connecting user has an empty onlineMap and has no way of knowing
      //    which of their peers are ALREADY online.  Query MongoDB for online peers
      //    and push individual presence:online events straight back to THIS socket.
      //    This runs every connect so the client never needs to poll or refresh.
      if (peerIds.length > 0) {
        const onlinePeers = await User.find({
          _id: { $in: peerIds },
          onlineStatus: 'online',
        }).select('_id').lean();

        for (const p of onlinePeers) {
          socket.emit('presence:online', { userId: p._id.toString() });
        }

        logger.info('[presence] Online — synced peers', {
          userId,
          totalPeers: peerIds.length,
          onlinePeers: onlinePeers.length,
        });
      } else {
        logger.info('[presence] Online', { userId, peers: 0 });
      }
    } catch (err) {
      logger.error('[presence] Failed to set online', { err: err.message });
    }
  })();

  // ── Heartbeat ping ────────────────────────────────────────────────────────────
  socket.on('presence:ping', async () => {
    try {
      if (redis) {
        await redis.expire(PRESENCE_KEY(userId), HEARTBEAT_TTL);
      }
    } catch (err) {
      logger.warn('[presence] Ping expire failed', { err: err.message });
    }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    try {
      // Only mark offline if this user has NO other open sockets (e.g. multiple tabs)
      const allSockets = await io.fetchSockets();
      const stillOnline = allSockets.some(
        (s) => s.id !== socket.id && s.data?.user?._id?.toString() === userId
      );

      if (!stillOnline) {
        const now = new Date();
        const User = getUserModel();

        // 1. Persist to MongoDB
        await User.findByIdAndUpdate(userId, {
          onlineStatus: 'offline',
          lastSeenAt: now,
        });

        // 2. Clean Redis key
        if (redis) {
          await redis.del(PRESENCE_KEY(userId));
        }

        // 3. Emit offline to peers
        const peerIds = await getPeerUserIds(userId);
        emitter.presenceOffline(io, userId, now.toISOString(), peerIds);

        logger.info('[presence] Offline', { userId, lastSeen: now });
      }
    } catch (err) {
      logger.error('[presence] Failed to set offline', { err: err.message });
    }
  });
}

// In-memory fallback for Redis
const memoryOnlineSet = new Set();
const memoryHeartbeats = new Map();
const memoryLastSeen = new Map();

const mockRedis = {
  sadd: async (key, val) => {
    if (key === 'presence:online') {
      memoryOnlineSet.add(String(val));
    }
    return 1;
  },
  srem: async (key, val) => {
    if (key === 'presence:online') {
      memoryOnlineSet.delete(String(val));
    }
    return 1;
  },
  sismember: async (key, val) => {
    if (key === 'presence:online') {
      return memoryOnlineSet.has(String(val)) ? 1 : 0;
    }
    return 0;
  },
  set: async (key, val, exFlag, exVal) => {
    if (key.startsWith('presence:heartbeat:')) {
      const userId = key.split(':').pop();
      if (memoryHeartbeats.has(userId)) {
        clearTimeout(memoryHeartbeats.get(userId));
      }
      const timer = setTimeout(() => {
        memoryOnlineSet.delete(String(userId));
        memoryHeartbeats.delete(userId);
      }, (exVal || 90) * 1000);
      memoryHeartbeats.set(userId, timer);
    } else if (key.startsWith('presence:lastseen:')) {
      const userId = key.split(':').pop();
      memoryLastSeen.set(userId, val);
    }
    return 'OK';
  },
  del: async (key) => {
    if (key.startsWith('presence:heartbeat:')) {
      const userId = key.split(':').pop();
      if (memoryHeartbeats.has(userId)) {
        clearTimeout(memoryHeartbeats.get(userId));
        memoryHeartbeats.delete(userId);
      }
    }
    return 1;
  },
  expire: async (key, seconds) => {
    if (key.startsWith('presence:heartbeat:')) {
      const userId = key.split(':').pop();
      if (memoryHeartbeats.has(userId)) {
        clearTimeout(memoryHeartbeats.get(userId));
      }
      const timer = setTimeout(() => {
        memoryOnlineSet.delete(String(userId));
        memoryHeartbeats.delete(userId);
      }, seconds * 1000);
      memoryHeartbeats.set(userId, timer);
    }
    return 1;
  }
};

/**
 * Registers real-time online presence handlers for a connected socket (new spec).
 * 
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Connected socket instance
 * @param {object} redisClient - Connected Redis client
 */
async function registerPresenceHandler(io, socket, redisClient) {
  const userId = socket.userId || socket.data?.user?._id?.toString();
  if (!userId || userId === 'unknown') return;

  const redis = redisClient || mockRedis;

  // 1. ON CONNECT:
  try {
    // a. Add userId to Redis SET key: `presence:online`
    await redis.sadd('presence:online', userId);

    // b. Set a per-user TTL key for heartbeat:
    await redis.set(`presence:heartbeat:${userId}`, '1', 'EX', 90);

    // c. Find all channel IDs where this user is a participant:
    const channels = await Channel.find({ 'participants.userId': userId }, { _id: 1 });

    // d. For each channelId, emit to room `channel:<channelId>`:
    for (const channel of channels) {
      socket.to(`channel:${channel._id}`).emit('presence:online', { userId });
    }

    // e. Join the socket to room `user:<userId>`
    socket.join(`user:${userId}`);
  } catch (err) {
    logger.error('[presence:connect] Error:', { err: err.message });
  }

  // 2. ON DISCONNECT (socket 'disconnect' event):
  socket.on('disconnect', async () => {
    try {
      // Check if user is still online on other sockets/tabs
      const sockets = await io.in(`user:${userId}`).fetchSockets();
      const stillOnline = sockets.some(s => s.id !== socket.id);

      if (!stillOnline) {
        // a. Remove userId from Redis SET:
        await redis.srem('presence:online', userId);

        // b. Delete heartbeat key:
        await redis.del(`presence:heartbeat:${userId}`);

        // c. Record lastSeen timestamp in Redis:
        const lastSeen = new Date().toISOString();
        await redis.set(`presence:lastseen:${userId}`, lastSeen, 'EX', 604800);

        // d. Find all channel IDs where this user is a participant:
        const channels = await Channel.find({ 'participants.userId': userId }, { _id: 1 });

        // e. For each channelId, emit to room `channel:<channelId>`:
        for (const channel of channels) {
          socket.to(`channel:${channel._id}`).emit('presence:offline', {
            userId,
            lastSeen
          });
        }
      }
    } catch (err) {
      logger.error('[presence:disconnect] Error:', { err: err.message });
    }
  });

  // 3. ON 'presence:ping' event from client (heartbeat to stay online):
  socket.on('presence:ping', async () => {
    try {
      await redis.expire(`presence:heartbeat:${userId}`, 90);
    } catch (err) {
      logger.warn('[presence:ping] Error:', { err: err.message });
    }
  });

  // 4. ON 'presence:get_status' event from client:
  socket.on('presence:get_status', async ({ userIds }, callback) => {
    try {
      const statuses = {};
      if (Array.isArray(userIds)) {
        for (const id of userIds) {
          const isMember = await redis.sismember('presence:online', id);
          statuses[id] = isMember === 1;
        }
      }
      if (typeof callback === 'function') {
        callback({ statuses });
      }
    } catch (err) {
      logger.error('[presence:get_status] Error:', { err: err.message });
    }
  });
}

// Assign named exports to function object to allow both CommonJS usage formats:
//   const presenceHandler = require('./presence.handler')
//   const { registerPresenceHandler } = require('./presence.handler')
presenceHandler.registerPresenceHandler = registerPresenceHandler;

module.exports = presenceHandler;
