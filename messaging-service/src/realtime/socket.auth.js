'use strict';

const { verifyAccessToken } = require('../common/utils/token');
const User = require('../database/models/user.model');
const logger = require('../bootstrap/logger.bootstrap');

async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      logger.warn('[socket:auth] Invalid token signature', { err: err.message });
      return next(new Error('Invalid token'));
    }

    const user = await User.findById(decoded.id || decoded.sub).lean();
    if (!user || user.isActive === false) {
      return next(new Error('User account is suspended or not found'));
    }

    socket.data.user = user;
    next();
  } catch (err) {
    logger.error('[socket:auth] Authentication error', { err: err.message });
    next(new Error('Internal authentication error'));
  }
}

module.exports = socketAuth;
