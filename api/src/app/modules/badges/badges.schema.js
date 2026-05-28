'use strict';

const { param } = require('express-validator');

const badgeIdSchema = [
	param('id').isMongoId().withMessage('Invalid badge ID'),
];

module.exports = {
	badgeIdSchema,
};
