'use strict';

const logger   = require('../../bootstrap/logger.bootstrap');
const AppError = require('../errors/app-error');
const env      = require('../../config/env');

/**
 * Global error handler — must be mounted LAST in Express.
 */
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  // Mongoose duplicate key
  if (err.code === 11000) {
    const rawField = Object.keys(err.keyValue || {})[0] || 'field';
    let field = rawField;
    if (rawField === 'email') field = 'Email address';
    else if (rawField === 'username') field = 'Username';
    else if (rawField === 'slug') field = 'Title';
    else {
      field = rawField.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    }
    err = AppError.conflict(`${field} is already taken`, 'DUPLICATE_KEY');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    err = AppError.unprocessable(messages.join('. '), 'VALIDATION_ERROR');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    err = AppError.unauthorized('Invalid token', 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    err = AppError.unauthorized('Token expired', 'TOKEN_EXPIRED');
  }

  const status  = err.status  || 500;
  const code    = err.code    || 'INTERNAL_ERROR';
  const message = err.message || 'Something went wrong';

  logger.error(message, {
    code,
    status,
    path:   req.path,
    method: req.method,
    ...(env.isDev && { stack: err.stack }),
  });

  res.status(status).json({
    success: false,
    code,
    message,
    ...(env.isDev && { stack: err.stack }),
  });
}

module.exports = errorMiddleware;
