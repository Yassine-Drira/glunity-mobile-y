'use strict';

const { param, body } = require('express-validator');

const channelIdSchema = [
	param('id').isMongoId().withMessage('Invalid channel ID'),
];

const postMessageSchema = [
	param('id').isMongoId().withMessage('Invalid channel ID'),
	body('content').optional().isString().trim(),
	body('type').optional().isString().trim(),
	body('attachments').optional().isArray(),
	body('reelRef').optional().isObject(),
	body('replyTo').optional().isObject(),
];

const createChannelSchema = [
	body('name').optional().isString().trim(),
	body('description').optional().isString().trim(),
	body('participants').optional().isArray(),
	body('participants.*').optional().isMongoId().withMessage('Invalid participant id'),
	body('icon').optional().isString().trim(),
];

const updateChannelSchema = [
    param('id').isMongoId().withMessage('Invalid channel ID'),
    body('name').optional().isString().trim(),
    body('icon').optional().isString().trim(),
    body('description').optional().isString().trim(),
];

module.exports = {
	channelIdSchema,
	postMessageSchema,
	createChannelSchema,
	updateChannelSchema,
};
