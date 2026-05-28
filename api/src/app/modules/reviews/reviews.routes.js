'use strict';

const { Router } = require('express');
const controller = require('./reviews.controller');
const validate = require('../../common/middleware/validation.middleware');
const authMiddleware = require('../../common/middleware/auth.middleware');
const { createReviewSchema } = require('./reviews.schema');

const router = Router();

router.get('/', controller.list);
router.post('/', authMiddleware, createReviewSchema, validate, controller.create);

module.exports = router;
