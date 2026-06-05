'use strict';

const Redis  = require('ioredis');
const logger = require('./logger.bootstrap');
const env = require('../config/env');

const MAX_RETRY_ATTEMPTS = 10;
const MAX_RETRY_DELAY_MS = 3000;

let pubClient  = null;
let subClient  = null;
let isAvailable = false;

function createClient(label) {
  const url = env.redis.url;

  const client = new Redis(url, {
    lazyConnect:          false,
    enableReadyCheck:     true,
    maxRetriesPerRequest: null,
    enableOfflineQueue:   false,
    retryStrategy(times) {
      if (times > MAX_RETRY_ATTEMPTS) {
        logger.warn(`[redis:${label}] Giving up after ${MAX_RETRY_ATTEMPTS} attempts — running without Redis`);
        return null;
      }
      const delay = Math.min(times * 200, MAX_RETRY_DELAY_MS);
      logger.warn(`[redis:${label}] Reconnecting in ${delay}ms (attempt ${times}/${MAX_RETRY_ATTEMPTS})`);
      return delay;
    },
  });

  client.on('connect',      () => { isAvailable = true; logger.info(`[redis:${label}] Connected`); });
  client.on('ready',        () => logger.info(`[redis:${label}] Ready`));
  client.on('error',        (err) => logger.error(`[redis:${label}] Error: ${err.message}`));
  client.on('close',        () => logger.warn(`[redis:${label}] Connection closed`));
  client.on('reconnecting', () => logger.warn(`[redis:${label}] Reconnecting…`));
  client.on('end',          () => logger.warn(`[redis:${label}] Connection ended`));

  return client;
}

function getPubClient() {
  if (!pubClient) pubClient = createClient('pub');
  return pubClient;
}

function getSubClient() {
  if (!subClient) {
    subClient = getPubClient().duplicate();
    subClient.on('error', (err) => logger.error(`[redis:sub] Error: ${err.message}`));
    subClient.on('end',   () => logger.warn('[redis:sub] Connection ended'));
  }
  return subClient;
}

function createMainClient() {
  return createClient('main');
}

function available() {
  return isAvailable;
}

async function disconnectAll() {
  const clients = [pubClient, subClient].filter(Boolean);
  await Promise.allSettled(clients.map((c) => c.quit().catch(() => {})));
  pubClient  = null;
  subClient  = null;
  isAvailable = false;
  logger.info('[redis] All clients disconnected');
}

module.exports = { getPubClient, getSubClient, createMainClient, available, disconnectAll };
