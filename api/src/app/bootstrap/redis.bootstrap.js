'use strict';

const Redis  = require('ioredis');
const logger = require('./logger.bootstrap');

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_RETRY_ATTEMPTS = 10;   // stop retrying after this many failures
const MAX_RETRY_DELAY_MS = 3000; // cap backoff at 3 s

let pubClient  = null;
let subClient  = null;
let isAvailable = false;  // flip to true once any client connects successfully

/**
 * Creates a Redis client with:
 *  - Bounded retry (stops after MAX_RETRY_ATTEMPTS so the process doesn't spin forever)
 *  - All event handlers (including 'error') attached immediately — silences ioredis warning
 *  - lazyConnect:true so the constructor itself never throws
 */
function createClient(label) {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(url, {
    lazyConnect:          false,
    enableReadyCheck:     true,
    maxRetriesPerRequest: null,   // required by @socket.io/redis-adapter
    enableOfflineQueue:   false,  // don't queue commands while disconnected
    retryStrategy(times) {
      if (times > MAX_RETRY_ATTEMPTS) {
        logger.warn(`[redis:${label}] Giving up after ${MAX_RETRY_ATTEMPTS} attempts — running without Redis`);
        return null;   // returning null stops retrying
      }
      const delay = Math.min(times * 200, MAX_RETRY_DELAY_MS);
      logger.warn(`[redis:${label}] Reconnecting in ${delay}ms (attempt ${times}/${MAX_RETRY_ATTEMPTS})`);
      return delay;
    },
  });

  // Attach ALL event handlers immediately to prevent "missing 'error' handler" warning
  client.on('connect',      () => { isAvailable = true;  logger.info(`[redis:${label}] Connected`); });
  client.on('ready',        () => logger.info(`[redis:${label}] Ready`));
  client.on('error',        (err) => logger.error(`[redis:${label}] Error: ${err.message}`));
  client.on('close',        () => logger.warn(`[redis:${label}] Connection closed`));
  client.on('reconnecting', (t) => logger.warn(`[redis:${label}] Reconnecting…`));
  client.on('end',          () => logger.warn(`[redis:${label}] Connection ended (no more retries)`));

  return client;
}

/**
 * Pub client — used by Socket.IO redis-adapter.
 */
function getPubClient() {
  if (!pubClient) pubClient = createClient('pub');
  return pubClient;
}

/**
 * Sub client — cloned from pub; MUST have its own error handler (ioredis requirement).
 */
function getSubClient() {
  if (!subClient) {
    subClient = getPubClient().duplicate();
    // duplicate() clones options but not event listeners — re-attach error handler
    subClient.on('error', (err) => logger.error(`[redis:sub] Error: ${err.message}`));
    subClient.on('end',   () => logger.warn('[redis:sub] Connection ended'));
  }
  return subClient;
}

/**
 * Returns a fresh Redis client for general use (presence, caching).
 * Caller owns this instance and is responsible for closing it.
 */
function createMainClient() {
  return createClient('main');
}

/**
 * Returns true if Redis connected at least once this session.
 * Use this to decide whether to enable Redis-dependent features.
 */
function available() {
  return isAvailable;
}

/**
 * Gracefully quit all shared clients.
 */
async function disconnectAll() {
  const clients = [pubClient, subClient].filter(Boolean);
  await Promise.allSettled(clients.map((c) => c.quit().catch(() => {})));
  pubClient  = null;
  subClient  = null;
  isAvailable = false;
  logger.info('[redis] All clients disconnected');
}

module.exports = { getPubClient, getSubClient, createMainClient, available, disconnectAll };
