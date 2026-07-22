'use strict';

const authService  = require('./auth.service');
const authMapper   = require('./auth.mapper');
const asyncHandler = require('../../common/utils/async-handler');
const { AUTH }     = require('../../config/constants');

const authController = {
  /** POST /api/auth/register */
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.cookie(AUTH.COOKIE_NAME, result.tokens.refreshToken, AUTH.COOKIE_OPTIONS);
    res.status(201).json(authMapper.toAuthResponse(result));
  }),

  /** POST /api/auth/oauth */
  oauthLogin: asyncHandler(async (req, res) => {
    const { provider, token } = req.body;
    const result = await authService.oauthLogin(provider, token);
    if (result.isNewUser) {
      return res.status(200).json({
        success: true,
        data: {
          isNewUser: true,
          oauthSignupToken: result.oauthSignupToken,
          prefill: result.prefill,
        },
      });
    }
    res.cookie(AUTH.COOKIE_NAME, result.tokens.refreshToken, AUTH.COOKIE_OPTIONS);
    res.status(200).json(authMapper.toAuthResponse(result));
  }),

  /** POST /api/auth/login */
  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    if (result.twoFactorRequired) {
      return res.status(200).json({
        success: true,
        data: {
          twoFactorRequired: true,
          userId: result.userId,
        },
      });
    }
    res.cookie(AUTH.COOKIE_NAME, result.tokens.refreshToken, AUTH.COOKIE_OPTIONS);
    res.status(200).json(authMapper.toAuthResponse(result));
  }),

  /** POST /api/auth/verify-2fa */
  verify2Fa: asyncHandler(async (req, res) => {
    const { userId, code } = req.body;
    const result = await authService.verify2Fa(userId, code);
    res.cookie(AUTH.COOKIE_NAME, result.tokens.refreshToken, AUTH.COOKIE_OPTIONS);
    res.status(200).json(authMapper.toAuthResponse(result));
  }),

  /** POST /api/auth/verify-password */
  verifyPassword: asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Mot de passe requis' });
    }
    const User = require('../../../database/models/user.model');
    const { verifyPassword } = require('../../common/utils/password');

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) throw AppError.notFound('User');

    const isValid = await verifyPassword(password, user.passwordHash || user.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Mot de passe incorrect' });
    }

    res.status(200).json({ success: true, message: 'Mot de passe vérifié avec succès' });
  }),

  /** POST /api/auth/refresh */
  refresh: asyncHandler(async (req, res) => {
    const token  = req.cookies?.[AUTH.COOKIE_NAME] || req.body?.refreshToken;
    const result = await authService.refresh(token);
    res.cookie(AUTH.COOKIE_NAME, result.tokens.refreshToken, AUTH.COOKIE_OPTIONS);
    res.status(200).json(authMapper.toRefreshResponse(result));
  }),

  /** POST /api/auth/logout */
  logout: asyncHandler(async (_req, res) => {
    res.clearCookie(AUTH.COOKIE_NAME);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }),

  /** GET /api/auth/me  (protected) */
  me: asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user._id);
    res.status(200).json(authMapper.toMeResponse(user));
  }),

  /** GET /api/auth/verify-email/:token */
  verifyEmail: asyncHandler(async (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:8081';
    try {
      await authService.verifyEmail(req.params.token);
      // Redirect browser to the React app's email-verified screen
      return res.redirect(`${clientUrl}/email-verified?success=1`);
    } catch (err) {
      // Even on failure redirect so the user sees a proper screen
      return res.redirect(`${clientUrl}/email-verified?success=0`);
    }
  }),

  /** POST /api/auth/resend-verification */
  resendVerification: asyncHandler(async (req, res) => {
    const result = await authService.resendVerification(req.body.email);
    res.status(200).json({ success: true, ...result });
  }),

  /** POST /api/auth/forgot-password */
  forgotPassword: asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json({ success: true, ...result });
  }),

  /** POST /api/auth/reset-password */
  resetPassword: asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    res.status(200).json({ success: true, ...result });
  }),
};

module.exports = authController;
