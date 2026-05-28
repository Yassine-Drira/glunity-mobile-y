'use strict';

const { Router } = require('express');
const controller = require('./patient-resources.controller');
const authMiddleware = require('../../common/middleware/auth.middleware');

const router = Router();

router.get('/home', authMiddleware, controller.home);
router.get('/', authMiddleware, controller.list);
router.get('/:id', authMiddleware, controller.getById);

module.exports = router;
