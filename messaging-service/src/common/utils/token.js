'use strict';

const jwt  = require('jsonwebtoken');
const env  = require('../../config/env');

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
    issuer:    'glunity-api',
    audience:  'glunity-mobile',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret, {
    issuer:   'glunity-api',
    audience: 'glunity-mobile',
  });
}

module.exports = { signAccessToken, verifyAccessToken };
