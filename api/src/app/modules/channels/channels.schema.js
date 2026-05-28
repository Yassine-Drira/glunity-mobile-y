'use strict';

const { param, body } = require('express-validator');

const channelIdSchema = [
	param('id').isMongoId().withMessage('Invalid channel ID'),
];

const postMessageSchema = [
	param('id').isMongoId().withMessage('Invalid channel ID'),
	body('content').notEmpty().withMessage('Message content cannot be empty').trim(),
];

module.exports = {
	channelIdSchema,
	postMessageSchema,
};
