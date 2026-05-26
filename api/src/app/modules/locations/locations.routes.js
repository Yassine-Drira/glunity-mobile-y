'use strict';

const { Router } = require('express');

const controller     = require('./locations.controller');
const validate       = require('../../common/middleware/validation.middleware');
const authMiddleware = require('../../common/middleware/auth.middleware');
const {
  listLocationsSchema,
  createLocationSchema,
  getLocationSchema,
} = require('./locations.schema');

const router = Router();

// ── Public — anyone can browse the collaborative map ──────────────────────────
router.get('/',     listLocationsSchema, validate, controller.list);
router.get('/:id',  getLocationSchema,   validate, controller.getOne);

// ── Authenticated — community members can suggest a new spot ──────────────────
router.post('/', authMiddleware, createLocationSchema, validate, controller.create);

module.exports = router;
