'use strict';

const { Router } = require('express');
const controller = require('./channels.controller');
const validate = require('../../common/middleware/validation.middleware');
const authMiddleware = require('../../common/middleware/auth.middleware');
const { channelIdSchema, postMessageSchema } = require('./channels.schema');

const router = Router();

router.get('/', authMiddleware, controller.list);
router.post('/direct', authMiddleware, controller.getOrCreateDirectChannel);
router.post('/', authMiddleware, controller.createChannel);
const { updateChannelSchema } = require('./channels.schema');
router.patch('/:id', authMiddleware, updateChannelSchema, validate, controller.updateChannel);
router.post('/:id/update', authMiddleware, updateChannelSchema, validate, controller.updateChannel);
router.get('/:id/messages', authMiddleware, channelIdSchema, validate, controller.listMessages);
router.post('/:id/messages', authMiddleware, postMessageSchema, validate, controller.postMessage);

module.exports = router;
