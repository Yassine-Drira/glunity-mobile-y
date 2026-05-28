'use strict';

const { param } = require('express-validator');

const notificationIdSchema = [
	param('id').isMongoId().withMessage('Invalid notification ID'),
];

module.exports = {
	notificationIdSchema,
};
