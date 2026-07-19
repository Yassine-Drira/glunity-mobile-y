'use strict';

const { Router } = require('express');
const controller = require('./notifications.controller');
const validate = require('../../common/middleware/validation.middleware');
const authMiddleware = require('../../common/middleware/auth.middleware');
const { notificationIdSchema } = require('./notifications.schema');

const router = Router();

router.get('/', authMiddleware, controller.list);
router.patch('/read', authMiddleware, controller.markMultipleAsRead);
router.patch('/archive', authMiddleware, controller.archiveMultiple);
router.post('/test-push', authMiddleware, controller.testPush);
router.post('/read-all', authMiddleware, controller.markAllAsRead);
router.post('/:id/read', authMiddleware, notificationIdSchema, validate, controller.markAsRead);
router.delete('/', authMiddleware, controller.deleteAll);
router.delete('/:id', authMiddleware, notificationIdSchema, validate, controller.delete);

module.exports = router;
