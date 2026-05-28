'use strict';

const { body } = require('express-validator');

const createReviewSchema = [
	body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
	body('comment').notEmpty().withMessage('Comment is required').trim(),
];

module.exports = {
	createReviewSchema,
};
