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
  port: Number(process.env.PORT) || 5000,

  // App URL (for building email links)
  APP_URL: process.env.APP_URL || 'http://localhost:5000',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:8081',

  mongo: {
    uri: process.env.MONGO_URI,
  },

  jwt: {
    accessSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.REFRESH_SECRET,
    accessExpires: process.env.ACCESS_TOKEN_EXPIRES || '15m',
    refreshExpires: process.env.REFRESH_TOKEN_EXPIRES || '7d',
  },

  cors: {
    origins: (process.env.APP_ORIGINS || 'http://localhost:8081')
      .split(',')
      .map((o) => o.trim()),
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // flat SMTP accessors for email.service.js
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'GlUnity <no-reply@glunity.app>',

  mail: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'GlUnity <no-reply@glunity.app>',
  },

  // ── Redis ────────────────────────────────────────────────────────────────────
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // ── Socket.IO ────────────────────────────────────────────────────────────────
  socket: {
    corsOrigins: (process.env.SOCKET_CORS_ORIGINS || 'http://localhost:8081,http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
  },

  // ── Real-time Presence ───────────────────────────────────────────────────────
  presence: {
    heartbeatInterval: Number(process.env.PRESENCE_HEARTBEAT_INTERVAL) || 30000,
    timeout:           Number(process.env.PRESENCE_TIMEOUT) || 90000,
  },

  // ── Media Upload ─────────────────────────────────────────────────────────────
  media: {
    maxImageSize: Number(process.env.MAX_IMAGE_SIZE) || 10 * 1024 * 1024,  // 10 MB
    maxVideoSize: Number(process.env.MAX_VIDEO_SIZE) || 50 * 1024 * 1024,  // 50 MB
  },
};

module.exports = env;
