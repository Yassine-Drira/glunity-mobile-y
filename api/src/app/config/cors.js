'use strict';

const env = require('./env');

function isAllowedLocalDevOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
}

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    if (env.cors.origins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow localhost regardless of port for Expo web sessions.
    if (env.isDev && isAllowedLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: Origin "${origin}" is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  exposedHeaders: ['x-request-id'],
};

module.exports = corsOptions;
