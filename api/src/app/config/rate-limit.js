'use strict';

const rateLimit = require('express-rate-limit');
const AppError  = require('../common/errors/app-error');

/**
 * Rate limiting rules for sensitive authentication endpoints (login, registration, etc.).
 * Allows a maximum of 100 requests per 15 minutes from a single IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(AppError.badRequest('Too many authentication attempts. Please try again in 15 minutes.', 'TOO_MANY_REQUESTS'));
  },
});

/**
 * Global rate limiting rules for standard API endpoints.
 * Allows a maximum of 300 requests per minute.
 */
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many requests. Please slow down.', 429, 'TOO_MANY_REQUESTS'));
  },
});

module.exports = {
  authLimiter,
  globalLimiter,
};
