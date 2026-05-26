'use strict';

const helmet = require('helmet');

/**
 * Helmet middleware configuration.
 * CSP and COEP are disabled to allow React Native/Expo image fetching.
 */
const securityMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

module.exports = securityMiddleware;
