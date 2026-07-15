'use strict';

const crypto = require('crypto');

const authRepository = require('./auth.repository');
const { hashPassword, verifyPassword } = require('../../common/utils/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signOauthSignupToken,
  verifyOauthSignupToken,
} = require('../../common/utils/token');
const AppError = require('../../common/errors/app-error');
const { AUTH } = require('../../config/constants');
const env = require('../../config/env');
const emailService = require('../../common/services/email.service');

// Helper to verify google token
async function verifyGoogleToken(token) {
  try {
    if (process.env.NODE_ENV !== 'production' && token.startsWith('mock_')) {
      const id = token.replace('mock_', '');
      return {
        id,
        email: `${id}@gmail.com`,
        fullName: `Mock Google User ${id}`,
        emailVerified: true,
      };
    }
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!res.ok) {
      throw AppError.unauthorized('Invalid Google token');
    }
    const payload = await res.json();
    return {
      id: payload.sub,
      email: payload.email,
      fullName: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Failed to verify Google token: ' + err.message);
  }
}

// Helper to verify facebook token
async function verifyFacebookToken(token) {
  try {
    if (process.env.NODE_ENV !== 'production' && token.startsWith('mock_')) {
      const id = token.replace('mock_', '');
      return {
        id,
        email: `${id}@gmail.com`,
        fullName: `Mock Facebook User ${id}`,
        emailVerified: true,
      };
    }
    const res = await fetch(`https://graph.facebook.com/me?fields=id,name,email,first_name,last_name&access_token=${token}`);
    if (!res.ok) {
      throw AppError.unauthorized('Invalid Facebook token');
    }
    const payload = await res.json();
    return {
      id: payload.id,
      email: payload.email,
      fullName: payload.name || `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
      emailVerified: !!payload.email,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Failed to verify Facebook token: ' + err.message);
  }
}

class AuthService {
  // ─── Register ──────────────────────────────────────────────────────────────
  async register(dto) {
    const {
      fullName,
      email,
      phone,
      password,
      profileType,
      language,
      birthDate,
      location,
      gender,
      dietaryPreference,
      consentVersion,
      consentTimestamp,
      celiacQuestionnaire,
      storeInfo,
      oauthSignupToken,
    } = dto;

    let finalEmail = email;
    let finalFullName = fullName;
    let googleId = undefined;
    let facebookId = undefined;
    let isEmailVerified = false;

    if (oauthSignupToken) {
      const decoded = verifyOauthSignupToken(oauthSignupToken);
      finalEmail = decoded.email;
      if (decoded.provider === 'google') {
        googleId = decoded.providerId;
      } else if (decoded.provider === 'facebook') {
        facebookId = decoded.providerId;
      }
      isEmailVerified = decoded.emailVerified;
      // Allow the user to override their full name from the wizard
      if (fullName) {
        finalFullName = fullName;
      } else {
        finalFullName = decoded.fullName;
      }
    }

    const existing = await authRepository.findByEmail(finalEmail);
    if (existing) {
      throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    }

    let passwordHash = undefined;
    if (!oauthSignupToken) {
      passwordHash = await hashPassword(password);
    }

    let emailVerificationToken = undefined;
    let emailVerificationExpires = undefined;
    let rawToken = undefined;

    if (!isEmailVerified) {
      // Generate email verification token
      rawToken = crypto.randomBytes(32).toString('hex');
      emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    }

    const user = await authRepository.create({
      fullName: finalFullName,
      email: finalEmail,
      phone,
      passwordHash,
      googleId,
      facebookId,
      profileType,
      language,
      birthDate,
      location,
      gender,
      dietaryPreference,
      consentVersion,
      consentTimestamp,
      celiacQuestionnaire: profileType !== 'pro_commerce' ? {
        diagnosisDate: celiacQuestionnaire?.diagnosisDate || null,
        symptoms: celiacQuestionnaire?.symptoms || [],
        severity: celiacQuestionnaire?.severity || '',
        clinicalDiagnosis: !!celiacQuestionnaire?.clinicalDiagnosis,
        familyHistory: !!celiacQuestionnaire?.familyHistory,
      } : undefined,
      storeInfo: profileType === 'pro_commerce' ? storeInfo : undefined,
      emailVerified: isEmailVerified,
      emailVerificationToken,
      emailVerificationExpires,
    });

    if (!isEmailVerified && rawToken) {
      // Send verification email (non-blocking — don't throw if it fails)
      const verifyUrl = `${env.APP_URL}/api/auth/verify-email/${rawToken}`;
      emailService.sendVerificationEmail(finalEmail, verifyUrl).catch((err) => {
        console.error('[email] Failed to send verification email:', err.message);
      });
    }

    const tokens = this._issueTokens(user);
    return { user: user.toPublic(), tokens };
  }

  async oauthLogin(provider, token) {
    let profile;
    if (provider === 'google') {
      profile = await verifyGoogleToken(token);
    } else if (provider === 'facebook') {
      profile = await verifyFacebookToken(token);
    } else {
      throw AppError.badRequest('Unsupported OAuth provider');
    }

    const { id: providerId, email, fullName, emailVerified } = profile;

    if (!email) {
      throw AppError.badRequest('OAuth provider did not return an email address');
    }

    // Try finding user by provider ID
    const query = provider === 'google' ? { googleId: providerId } : { facebookId: providerId };
    let user = await authRepository.findByOAuthId(query);

    if (user) {
      if (!user.isActive) {
        throw AppError.unauthorized('Account deactivated');
      }
      // Issue session tokens for existing user
      const tokens = this._issueTokens(user);
      return { user: user.toPublic(), tokens };
    }

    // Check if email already exists to prevent security leaks
    user = await authRepository.findByEmail(email);
    if (user) {
      throw AppError.badRequest('An account with this email address already exists. Please log in using your original sign-in method.');
    }

    // This is a new user!
    // Sign a temporary signup token to prevent tampering with the verified OAuth profile info
    const oauthSignupToken = signOauthSignupToken({
      email,
      fullName,
      provider,
      providerId,
      emailVerified,
    });

    return {
      isNewUser: true,
      oauthSignupToken,
      prefill: {
        email,
        fullName,
      },
    };
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

    if (user.twoFactorEnabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.twoFactorCode = code;
      user.twoFactorCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
      await user.save();

      emailService.sendTwoFactorEmail(user.email, code).catch((err) => {
        console.error('[email] Failed to send two factor email:', err.message);
      });

      return { twoFactorRequired: true, userId: user._id.toString() };
    }

    const tokens = this._issueTokens(user);
    return { user: user.toPublic(), tokens };
  }

  // ─── Verify Two Factor Code ───────────────────────────────────────────────
  async verify2Fa(userId, code) {
    const user = await authRepository.findByIdWith2Fa(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Account not found or deactivated');
    }

    if (!user.twoFactorCode || user.twoFactorCode !== code) {
      throw AppError.unauthorized('Invalid verification code');
    }

    if (user.twoFactorCodeExpires < new Date()) {
      throw AppError.unauthorized('Verification code has expired. Please try logging in again.');
    }

    user.twoFactorCode = undefined;
    user.twoFactorCodeExpires = undefined;
    await user.save();

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

    const rawToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
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
    const rawToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
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
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken({ id: user._id.toString() }),
      expiresIn: AUTH.COOKIE_OPTIONS.maxAge / 1000,
    };
  }
}

module.exports = new AuthService();
