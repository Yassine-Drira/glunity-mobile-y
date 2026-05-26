'use strict';

const { body, query, param } = require('express-validator');

const CATEGORIES = ['restaurant', 'bakery', 'grocery', 'pharmacy', 'cafe', 'other'];
const PRICE_RANGES = ['$', '$$', '$$$', '$$$$', ''];

// ── GET /api/locations — supports geo + filter query ──────────────────────────
const listLocationsSchema = [
  query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('lng must be -180..180'),
  query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('lat must be -90..90'),
  query('radius').optional().isFloat({ min: 50, max: 100000 }).withMessage('radius (m) must be 50..100000'),
  query('category').optional().isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(', ')}`),
  query('glutenFree').optional().isBoolean().withMessage('glutenFree must be boolean'),
  query('certified').optional().isBoolean().withMessage('certified must be boolean'),
  query('search').optional().isString().isLength({ max: 120 }),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('skip').optional().isInt({ min: 0 }).toInt(),
];

// ── POST /api/locations — create ──────────────────────────────────────────────
const createLocationSchema = [
  body('name').isString().trim().isLength({ min: 2, max: 120 }),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('category').optional().isIn(CATEGORIES),
  body('glutenFree').optional().isBoolean(),
  body('certified').optional().isBoolean(),
  body('contaminationWarning').optional().isBoolean(),
  body('address').optional().isString().isLength({ max: 300 }),
  body('city').optional().isString().isLength({ max: 80 }),
  body('country').optional().isString().isLength({ max: 80 }),
  body('phone').optional().isString().isLength({ max: 40 }),
  body('priceRange').optional().isIn(PRICE_RANGES),
  body('lng').exists().isFloat({ min: -180, max: 180 }).withMessage('lng required'),
  body('lat').exists().isFloat({ min: -90, max: 90 }).withMessage('lat required'),
];

// ── GET /api/locations/:id ────────────────────────────────────────────────────
const getLocationSchema = [
  param('id').isMongoId().withMessage('Invalid location id'),
];

module.exports = {
  listLocationsSchema,
  createLocationSchema,
  getLocationSchema,
};
