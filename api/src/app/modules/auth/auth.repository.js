'use strict';

const User = require('../../../database/models/user.model');

const authRepository = {
  // ── Read ──────────────────────────────────────────────────────────────────
  findByEmail(email) {
    return User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  },

  findById(id) {
    return User.findOne({ _id: id, isActive: true }).populate('badges');
  },

  findByVerificationToken(hashedToken) {
    return User.findOne({
      emailVerificationToken:   hashedToken,
      emailVerificationExpires: { $gt: new Date() },
      isActive: true,
    }).select('+emailVerificationToken +emailVerificationExpires');
  },

  findByResetToken(hashedToken) {
    return User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: new Date() },
      isActive: true,
    }).select('+passwordResetToken +passwordResetExpires');
  },

  // ── Write ─────────────────────────────────────────────────────────────────
  create(data) {
    return User.create(data);
  },

  markEmailVerified(userId) {
    return User.findByIdAndUpdate(userId, {
      $set: {
        emailVerified:            true,
        emailVerificationToken:   undefined,
        emailVerificationExpires: undefined,
      },
    });
  },

  setVerificationToken(userId, token, expires) {
    return User.findByIdAndUpdate(userId, {
      $set: {
        emailVerificationToken:   token,
        emailVerificationExpires: expires,
      },
    });
  },

  setPasswordResetToken(userId, token, expires) {
    return User.findByIdAndUpdate(userId, {
      $set: {
        passwordResetToken:   token,
        passwordResetExpires: expires,
      },
    });
  },

  updatePassword(userId, passwordHash) {
    return User.findByIdAndUpdate(userId, {
      $set: {
        passwordHash,
        passwordResetToken:   undefined,
        passwordResetExpires: undefined,
      },
    });
  },
};

module.exports = authRepository;
