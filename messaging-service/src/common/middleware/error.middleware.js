'use strict';

const logger = require('../../bootstrap/logger.bootstrap');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[API ERROR] ${req.method} ${req.originalUrl} - ${status} - ${message}`, {
    stack: err.stack,
  });

  res.status(status).json({
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message,
  });
}

module.exports = errorHandler;
