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
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

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

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
};
