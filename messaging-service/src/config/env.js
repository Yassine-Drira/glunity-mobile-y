'use strict';

const REQUIRED = [
  'MONGO_URI',
  'JWT_SECRET',
  'REFRESH_SECRET',
];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`[env] Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();

const env = {
  node: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  port: Number(process.env.PORT) || 5001,

  mongo: {
    uri: process.env.MONGO_URI,
  },

  jwt: {
    accessSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.REFRESH_SECRET,
    accessExpires: process.env.ACCESS_TOKEN_EXPIRES || '15m',
    refreshExpires: process.env.REFRESH_TOKEN_EXPIRES || '7d',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    disabled: process.env.DISABLE_REDIS === 'true',
  },

  socket: {
    corsOrigins: (process.env.SOCKET_CORS_ORIGINS || 'http://localhost:8081,http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
  },

  presence: {
    heartbeatInterval: Number(process.env.PRESENCE_HEARTBEAT_INTERVAL) || 30000,
    timeout:           Number(process.env.PRESENCE_TIMEOUT) || 90000,
  },
};

module.exports = env;
