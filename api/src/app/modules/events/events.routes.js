'use strict';

const { Router } = require('express');
const controller = require('./events.controller');
const validate = require('../../common/middleware/validation.middleware');
const authMiddleware = require('../../common/middleware/auth.middleware');
const { listEventsSchema, createEventSchema, getEventSchema } = require('./events.schema');

const router = Router();

router.get('/', listEventsSchema, validate, controller.list);
router.get('/:id', getEventSchema, validate, controller.getOne);
router.post('/', authMiddleware, createEventSchema, validate, controller.create);
router.post('/:id/join', authMiddleware, getEventSchema, validate, controller.join);
router.post('/:id/leave', authMiddleware, getEventSchema, validate, controller.leave);

module.exports = router;
