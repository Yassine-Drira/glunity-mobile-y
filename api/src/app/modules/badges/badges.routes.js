'use strict';

const { Router } = require('express');
const controller = require('./badges.controller');
const validate = require('../../common/middleware/validation.middleware');
const { badgeIdSchema } = require('./badges.schema');

const router = Router();

router.get('/', controller.list);
router.get('/:id', badgeIdSchema, validate, controller.getById);

module.exports = router;
