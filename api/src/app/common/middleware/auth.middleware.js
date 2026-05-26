'use strict';

const { verifyAccessToken } = require('../utils/token');
const AppError              = require('../errors/app-error');
const User                  = require('../../../database/models/user.model');

/**
 * Extracts and verifies the Bearer JWT from Authorization header.
 * Attaches the full user document to req.user.
 */
async function authMiddleware(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next(AppError.unauthorized('No access token provided'));
    }

    const token   = header.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findActiveById(decoded.id);
    if (!user) {
      return next(AppError.unauthorized('Account not found or deactivated'));
    }

    if (!user.emailVerified) {
      return next(AppError.unauthorized('Please verify your email before continuing.', 'EMAIL_NOT_VERIFIED'));
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err); // JWT errors are caught in error middleware
  }
}

module.exports = authMiddleware;
