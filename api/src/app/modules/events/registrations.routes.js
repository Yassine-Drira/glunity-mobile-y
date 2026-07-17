'use strict';

const { Router } = require('express');
const controller = require('./events.controller');
const authMiddleware = require('../../common/middleware/auth.middleware');

const router = Router();

router.patch('/:id/approve', authMiddleware, controller.approveRegistration);
router.patch('/:id/reject', authMiddleware, controller.rejectRegistration);

module.exports = router;
