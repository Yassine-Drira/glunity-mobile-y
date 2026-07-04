'use strict';

const { available: redisAvailable } = require('../../bootstrap/redis.bootstrap');
const env      = require('../../config/env');
const logger   = require('../../bootstrap/logger.bootstrap');
const Channel  = require('../../database/models/channel.model');
const User     = require('../../database/models/user.model');
const mongoose = require('mongoose');

const PRESENCE_KEY  = (userId) => `presence:heartbeat:${userId}`;
const HEARTBEAT_TTL = Math.ceil(env.presence.timeout / 1000) || 90;

// In-memory fallback if Redis is disabled
const memoryOnlineSet = new Set();
const memoryHeartbeats = new Map();
const memoryLastSeen = new Map();

const mockRedis = {
  sadd: async (key, val) => {
    if (key === 'presence:online') memoryOnlineSet.add(String(val));
    return 1;
  },
  srem: async (key, val) => {
    if (key === 'presence:online') memoryOnlineSet.delete(String(val));
    return 1;
  },
  sismember: async (key, val) => {
    if (key === 'presence:online') return memoryOnlineSet.has(String(val)) ? 1 : 0;
    return 0;
  },
  set: async (key, val, exFlag, exVal) => {
    if (key.startsWith('presence:heartbeat:')) {
      const uId = key.split(':').pop();
      if (memoryHeartbeats.has(uId)) {
        clearTimeout(memoryHeartbeats.get(uId));
      }
      const timer = setTimeout(() => {
        memoryOnlineSet.delete(String(uId));
        memoryHeartbeats.delete(uId);
      }, (exVal || HEARTBEAT_TTL) * 1000);
      memoryHeartbeats.set(uId, timer);
    } else if (key.startsWith('presence:lastseen:')) {
      const uId = key.split(':').pop();
      memoryLastSeen.set(uId, val);
    }
    return 'OK';
  },
  del: async (key) => {
    if (key.startsWith('presence:heartbeat:')) {
      const uId = key.split(':').pop();
      if (memoryHeartbeats.has(uId)) {
        clearTimeout(memoryHeartbeats.get(uId));
        memoryHeartbeats.delete(uId);
      }
    }
    return 1;
  },
  expire: async (key, seconds) => {
    if (key.startsWith('presence:heartbeat:')) {
      const uId = key.split(':').pop();
      if (memoryHeartbeats.has(uId)) {
        clearTimeout(memoryHeartbeats.get(uId));
      }
      const timer = setTimeout(() => {
        memoryOnlineSet.delete(String(uId));
        memoryHeartbeats.delete(uId);
      }, seconds * 1000);
      memoryHeartbeats.set(uId, timer);
    }
    return 1;
  }
};

async function presenceHandler(io, socket, redisClient) {
  const user = socket.data?.user;
  if (!user) return;
  const userId = user._id.toString();

  const hasUsableRedis = () => !!redisClient && redisAvailable() && redisClient.status === 'ready';
  const redis = new Proxy({}, {
    get(_, op) {
      return async (...args) => {
        const primary = hasUsableRedis() ? redisClient : mockRedis;
        try {
          return await primary[op](...args);
        } catch (err) {
          logger.warn('[presence:store] Redis op failed; switching to memory fallback', {
            op: String(op),
            err: err?.message || 'unknown error',
          });
          return mockRedis[op](...args);
        }
      };
    }
  });

  // 1. ON CONNECT
  try {

    // Ensure socket joins their personal room
    socket.join(userId);

    // Update MongoDB status
    await User.findByIdAndUpdate(userId, {
      onlineStatus: 'online',
      lastSeenAt: null,
      lastActiveAt: new Date(),
    });

    // Update Redis keys
    await redis.sadd('presence:online', userId);
    await redis.set(PRESENCE_KEY(userId), '1', 'EX', HEARTBEAT_TTL);

    // Fetch channels user is part of (both private and public)
    const channels = await Channel.find({
      $or: [
        { 'participants.userId': userId },
        { isPrivate: { $ne: true } }
      ]
    }, { _id: 1 }).lean();

    // Broadcast online status to all channel rooms
    for (const ch of channels) {
      socket.to(`channel:${ch._id.toString()}`).emit('presence:online', { userId });
    }

    // Sync state for multi-device login (emit to own room)
    io.to(userId).emit('presence:online', { userId });

    logger.info('[presence] Online', { userId, channelsCount: channels.length });
  } catch (err) {
    logger.error('[presence:connect] Error:', { err: err.message });
  }

  // 2. DISCONNECT
  socket.on('disconnect', async () => {
    try {
      // Check if user is still online on other sockets/tabs
      const sockets = await io.in(userId).fetchSockets();
      const stillOnline = sockets.some(s => s.id !== socket.id);

      if (!stillOnline) {
        const now = new Date();

        await User.findByIdAndUpdate(userId, {
          onlineStatus: 'offline',
          lastSeenAt: now,
          lastActiveAt: null,
        });

        await redis.srem('presence:online', userId);
        await redis.del(PRESENCE_KEY(userId));

        const lastSeenStr = now.toISOString();
        await redis.set(`presence:lastseen:${userId}`, lastSeenStr, 'EX', 604800);

        // Fetch channels to broadcast offline status
        const channels = await Channel.find({
          $or: [
            { 'participants.userId': userId },
            { isPrivate: { $ne: true } }
          ]
        }, { _id: 1 }).lean();

        for (const ch of channels) {
          socket.to(`channel:${ch._id.toString()}`).emit('presence:offline', { userId, lastSeen: lastSeenStr });
        }

        // Multi-device sync
        io.to(userId).emit('presence:offline', { userId, lastSeen: lastSeenStr });

        logger.info('[presence] Offline', { userId, lastSeen: now });
      }
    } catch (err) {
      logger.error('[presence:disconnect] Error:', { err: err.message });
    }
  });

  // 3. HEARTBEAT PING
  socket.on('presence:ping', async () => {
    try {
      await User.findByIdAndUpdate(userId, {
        lastActiveAt: new Date(),
        onlineStatus: 'online',
      });
      await redis.expire(PRESENCE_KEY(userId), HEARTBEAT_TTL);
    } catch (err) {
      logger.warn('[presence:ping] Error:', { err: err.message });
    }
  });

  // 4. GET STATUS — Redis-first, DB fallback
  socket.on('presence:get_status', async ({ userIds }, callback) => {
    try {
      const statuses = {};
      const lastSeens = {};

      if (Array.isArray(userIds) && userIds.length > 0) {
        // ── Step 1: Check Redis/memory for real-time heartbeat keys ──────────
        // HEARTBEAT_TTL is typically 90s; heartbeats fire every 25s.
        // If the key exists in Redis, the user is definitively online.
        const redisChecks = await Promise.allSettled(
          userIds.map(async (id) => {
            const inSet     = await redis.sismember('presence:online', id);
            const heartbeat = await redis.sismember('presence:online', id); // set membership is O(1)
            return { id, online: inSet === 1 };
          })
        );

        const redisOnlineSet = new Set();
        for (const result of redisChecks) {
          if (result.status === 'fulfilled' && result.value.online) {
            redisOnlineSet.add(result.value.id);
            statuses[result.value.id] = true;
          }
        }

        // ── Step 2: For users not confirmed online by Redis, consult DB ──────
        const unknownIds = userIds.filter((id) => statuses[id] === undefined);

        if (unknownIds.length > 0) {
          const users = await User.find({ _id: { $in: unknownIds } })
            .select('_id onlineStatus lastActiveAt lastSeenAt')
            .lean();

          const now = Date.now();
          // Use generous threshold: heartbeat period (25s) × 4 = 100s safety buffer
          const activeThreshold = Math.max(HEARTBEAT_TTL * 1000, 100_000);

          for (const u of users) {
            const uId = u._id.toString();
            const isOnlineDB =
              u.onlineStatus === 'online' &&
              u.lastActiveAt &&
              (now - new Date(u.lastActiveAt).getTime()) < activeThreshold;

            statuses[uId] = !!isOnlineDB;

            if (!isOnlineDB) {
              lastSeens[uId] = u.lastSeenAt ? u.lastSeenAt.toISOString() : null;

              // Self-correct a stuck 'online' DB status
              if (u.onlineStatus === 'online') {
                User.findByIdAndUpdate(u._id, {
                  onlineStatus: 'offline',
                  lastSeenAt: u.lastActiveAt || u.updatedAt || new Date(),
                }).catch(() => {});
              }
            }
          }

          // Default any still-missing users to offline
          for (const id of unknownIds) {
            if (statuses[id] === undefined) {
              statuses[id] = false;
            }
          }
        }
      }

      if (typeof callback === 'function') {
        callback({ statuses, lastSeens });
      }
    } catch (err) {
      logger.error('[presence:get_status] Error:', { err: err.message });
      if (typeof callback === 'function') {
        callback({ statuses: {}, lastSeens: {} });
      }
    }
  });
}

// Assign named exports to function object to allow both CommonJS usage formats:
presenceHandler.registerPresenceHandler = presenceHandler;

module.exports = presenceHandler;
