'use strict';

const { verifyAccessToken } = require('../utils/token');
const User = require('../../database/models/user.model');

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('Unauthorized'); err.status = 401; throw err;
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (_) {
      const err = new Error('Invalid token'); err.status = 401; throw err;
    }

    const user = await User.findById(decoded.id || decoded.sub).lean();
    if (!user || user.isActive === false) {
      const err = new Error('User inactive or not found'); err.status = 401; throw err;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = auth;
