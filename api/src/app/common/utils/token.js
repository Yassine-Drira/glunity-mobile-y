'use strict';

const jwt  = require('jsonwebtoken');
const env  = require('../../config/env');

/**
 * Sign a short-lived access token.
 * @param {{ id: string, profileType: string }} payload
 * @returns {string}
 */
function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
    issuer:    'glunity-api',
    audience:  'glunity-mobile',
  });
}

/**
 * Sign a long-lived refresh token.
 * @param {{ id: string }} payload
 * @returns {string}
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires,
    issuer:    'glunity-api',
    audience:  'glunity-mobile',
  });
}

/**
 * Verify an access token.
 * @param {string} token
 * @returns {object} decoded payload
 */
function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret, {
    issuer:   'glunity-api',
    audience: 'glunity-mobile',
  });
}

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {object}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret, {
    issuer:   'glunity-api',
    audience: 'glunity-mobile',
  });
}

/**
 * Sign a short-lived temporary OAuth signup token.
 */
function signOauthSignupToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: '15m',
    issuer:    'glunity-api',
    audience:  'glunity-mobile',
  });
}

/**
 * Verify a short-lived temporary OAuth signup token.
 */
function verifyOauthSignupToken(token) {
  return jwt.verify(token, env.jwt.accessSecret, {
    issuer:   'glunity-api',
    audience: 'glunity-mobile',
  });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  signOauthSignupToken,
  verifyOauthSignupToken,
};
