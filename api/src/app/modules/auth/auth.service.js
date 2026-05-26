'use strict';

const crypto = require('crypto');

const authRepository  = require('./auth.repository');
const { hashPassword, verifyPassword } = require('../../common/utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../common/utils/token');
const AppError        = require('../../common/errors/app-error');
const { AUTH }        = require('../../config/constants');
const env             = require('../../config/env');
const emailService    = require('../../common/services/email.service');

class AuthService {
  // ─── Register ──────────────────────────────────────────────────────────────
  async register(dto) {
    const { fullName, email, phone, password, profileType, language } = dto;

    const existing = await authRepository.findByEmail(email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    }

    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const rawToken              = crypto.randomBytes(32).toString('hex');
    const emailVerificationToken   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await authRepository.create({
      fullName,
      email,
      phone,
      passwordHash,
      profileType,
      language,
      emailVerificationToken,
      emailVerificationExpires,
    });

    // Send verification email (non-blocking — don't throw if it fails)
    const verifyUrl = `${env.APP_URL}/api/auth/verify-email/${rawToken}`;
    emailService.sendVerificationEmail(email, verifyUrl).catch((err) => {
      console.error('[email] Failed to send verification email:', err.message);
    });

    const tokens = this._issueTokens(user);
    return { user: user.toPublic(), tokens };
  }

  // ─── Login ─────────────────────────────────────────────────────────────────
  async login(dto) {
    const { email, password } = dto;

    const user = await authRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const match = await verifyPassword(password, user.passwordHash);
    if (!match) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.emailVerified) {
      throw AppError.unauthorized('Please verify your email before logging in.', 'EMAIL_NOT_VERIFIED');
    }

    const tokens = this._issueTokens(user);
    return { user: user.toPublic(), tokens };
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────
  async refresh(refreshToken) {
    if (!refreshToken) {
      throw AppError.unauthorized('No refresh token provided');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token', 'TOKEN_EXPIRED');
    }

    const user = await authRepository.findById(decoded.id);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Account not found or deactivated');
    }

    if (!user.emailVerified) {
      throw AppError.unauthorized('Please verify your email before continuing.', 'EMAIL_NOT_VERIFIED');
    }

    const tokens = this._issueTokens(user);
    return { user: user.toPublic(), tokens };
  }

  // ─── Me (current user) ────────────────────────────────────────────────────
  async getMe(userId) {
    const user = await authRepository.findById(userId);
    if (!user) throw AppError.notFound('User');
    if (!user.emailVerified) {
      throw AppError.unauthorized('Please verify your email before continuing.', 'EMAIL_NOT_VERIFIED');
    }
    return user.toPublic();
  }

  // ─── Verify Email ─────────────────────────────────────────────────────────
  async verifyEmail(rawToken) {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await authRepository.findByVerificationToken(hashedToken);
    if (!user) {
      throw AppError.badRequest('Invalid or expired verification link', 'TOKEN_INVALID');
    }
    if (user.emailVerificationExpires < new Date()) {
      throw AppError.badRequest('Verification link has expired', 'TOKEN_EXPIRED');
    }
    if (user.emailVerified) {
      throw AppError.badRequest('Email already verified');
    }

    await authRepository.markEmailVerified(user._id);
    return { message: 'Email verified successfully' };
  }

  // ─── Resend Verification Email ────────────────────────────────────────────
  async resendVerification(email) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      // Return success to avoid account enumeration
      return { message: 'If that email exists, a verification link has been sent.' };
    }
    if (user.emailVerified) {
      throw AppError.badRequest('Email is already verified');
    }

    const rawToken              = crypto.randomBytes(32).toString('hex');
    const emailVerificationToken   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await authRepository.setVerificationToken(user._id, emailVerificationToken, emailVerificationExpires);

    const verifyUrl = `${env.APP_URL}/api/auth/verify-email/${rawToken}`;
    emailService.sendVerificationEmail(email, verifyUrl).catch((err) => {
      console.error('[email] Failed to resend verification email:', err.message);
    });

    return { message: 'If that email exists, a verification link has been sent.' };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────
  async forgotPassword(email) {
    const user = await authRepository.findByEmail(email);

    // Always return success to prevent account enumeration
    if (!user || !user.isActive) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    // Generate reset token
    const rawToken          = crypto.randomBytes(32).toString('hex');
    const passwordResetToken   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await authRepository.setPasswordResetToken(user._id, passwordResetToken, passwordResetExpires);

    // Build reset URL — for mobile, this deep-links back into the app
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
    emailService.sendPasswordResetEmail(email, resetUrl).catch((err) => {
      console.error('[email] Failed to send password reset email:', err.message);
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────
  async resetPassword(rawToken, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await authRepository.findByResetToken(hashedToken);
    if (!user) {
      throw AppError.badRequest('Invalid or expired reset token', 'TOKEN_INVALID');
    }
    if (user.passwordResetExpires < new Date()) {
      throw AppError.badRequest('Reset token has expired. Please request a new one.', 'TOKEN_EXPIRED');
    }

    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePassword(user._id, passwordHash);

    return { message: 'Password reset successful. You can now log in.' };
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────
  _issueTokens(user) {
    const payload = { id: user._id.toString(), profileType: user.profileType };
    return {
      accessToken:  signAccessToken(payload),
      refreshToken: signRefreshToken({ id: user._id.toString() }),
      expiresIn:    AUTH.COOKIE_OPTIONS.maxAge / 1000,
    };
  }
}

module.exports = new AuthService();
