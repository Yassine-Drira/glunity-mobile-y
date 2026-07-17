'use strict';

const { body, param } = require('express-validator');
const { PROFILE_TYPES, LANGUAGES } = require('../../config/constants');

const REGISTER_PROFILE_TYPES = [
  PROFILE_TYPES.CELIAC,
  PROFILE_TYPES.PROCHE,
  PROFILE_TYPES.PRO_COMMERCE,
  PROFILE_TYPES.PRO_HEALTH,
];

// ─── Register ─────────────────────────────────────────────────────────────────
const registerSchema = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 80 }).withMessage('Full name must be 2–80 characters'),

  body('email')
    .trim()
    .custom((value, { req }) => {
      if (!req.body.oauthSignupToken) {
        if (!value) {
          throw new Error('Email is required');
        }
        if (!/\S+@\S+\.\S+/.test(value)) {
          throw new Error('Invalid email address');
        }
      }
      return true;
    }),

  body('password')
    .custom((value, { req }) => {
      if (!req.body.oauthSignupToken) {
        if (!value || value.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        if (!/[A-Z]/.test(value)) {
          throw new Error('Password must contain at least one uppercase letter');
        }
        if (!/[0-9]/.test(value)) {
          throw new Error('Password must contain at least one number');
        }
      }
      return true;
    }),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+?[\d\s\-().]{7,20}$/).withMessage('Invalid phone number'),

  body('profileType')
    .notEmpty().withMessage('profileType is required')
    .isIn(REGISTER_PROFILE_TYPES)
    .withMessage(`profileType must be one of: ${REGISTER_PROFILE_TYPES.join(', ')}`),

  body('language')
    .optional()
    .isIn(Object.values(LANGUAGES))
    .withMessage(`language must be one of: ${Object.values(LANGUAGES).join(', ')}`),

  body('birthDate')
    .notEmpty().withMessage('Birth date is required')
    .isISO8601().withMessage('Birth date must be a valid ISO8601 date'),

  body('location')
    .trim()
    .notEmpty().withMessage('Location is required'),

  body('gender')
    .optional({ checkFalsy: true })
    .isIn(['male', 'female', 'other', ''])
    .withMessage('Invalid gender value'),

  body('dietaryPreference')
    .optional({ checkFalsy: true })
    .isIn(['strict_gluten_free', 'gluten_reduced', 'seeking_diagnosis', ''])
    .withMessage('Invalid dietary preference value'),

  body('consentVersion')
    .notEmpty().withMessage('Consent version is required'),

  body('consentTimestamp')
    .notEmpty().withMessage('Consent timestamp is required')
    .isISO8601().withMessage('Consent timestamp must be a valid ISO8601 date'),

  body('celiacQuestionnaire')
    .optional()
    .isObject().withMessage('celiacQuestionnaire must be an object'),

  body('storeInfo')
    .optional()
    .isObject().withMessage('storeInfo must be an object'),
];

const oauthSchema = [
  body('provider')
    .notEmpty().withMessage('Provider is required')
    .isIn(['google', 'facebook']).withMessage('Provider must be google or facebook'),
  body('token')
    .notEmpty().withMessage('Token is required'),
];

// ─── Login ────────────────────────────────────────────────────────────────────
const loginSchema = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ─── Refresh ──────────────────────────────────────────────────────────────────
const refreshSchema = [
  body('refreshToken')
    .optional()
    .isString(),
];

// ─── Forgot Password ──────────────────────────────────────────────────────────
const forgotPasswordSchema = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
];

// ─── Reset Password ───────────────────────────────────────────────────────────
const resetPasswordSchema = [
  body('token')
    .trim()
    .notEmpty().withMessage('Reset token is required'),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

// ─── Verify Email (param) ─────────────────────────────────────────────────────
const verifyEmailSchema = [
  param('token')
    .trim()
    .notEmpty().withMessage('Verification token is required'),
];

// ─── Resend Verification ──────────────────────────────────────────────────────
const resendVerificationSchema = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
];

// ─── Verify 2FA ───────────────────────────────────────────────────────────────
const verify2FaSchema = [
  body('userId')
    .trim()
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid User ID'),

  body('code')
    .trim()
    .notEmpty().withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits'),
];

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  verify2FaSchema,
  oauthSchema,
};
