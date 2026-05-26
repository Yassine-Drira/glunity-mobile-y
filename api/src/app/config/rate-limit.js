'use strict';

const rateLimit = require('express-rate-limit');
const AppError  = require('../common/errors/app-error');

/**
 * Strict rate limiter for auth endpoints.
 * Max 100 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(AppError.badRequest('Too many authentication attempts. Please try again in 15 minutes.', 'TOO_MANY_REQUESTS'));
  },
});

/**
 * Global rate limiter for standard API routes.
 * Max 300 requests per minute per IP.
 */
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
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
