'use strict';

const { param, body } = require('express-validator');

const reelIdSchema = [
	param('id').isMongoId().withMessage('Invalid reel ID'),
];

const createReelSchema = [
	body('videoUrl').isURL().withMessage('Invalid video URL'),
	body('thumbnailUrl').isURL().withMessage('Invalid thumbnail URL'),
	body('caption').optional().isString().trim(),
	body('duration').optional().isNumeric().withMessage('Duration must be a number'),
	body('category').optional().isIn(['all', 'recipes', 'tips', 'products', 'lifestyle']).withMessage('Invalid category'),
	body('channelRef').optional().isMongoId().withMessage('Invalid channel reference ID'),
];

const createCommentSchema = [
	param('id').isMongoId().withMessage('Invalid reel ID'),
	body('text').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters'),
];

const updateReelSchema = [
	param('id').isMongoId().withMessage('Invalid reel ID'),
	body('caption').optional().isString().trim(),
	body('category').optional().isIn(['all', 'recipes', 'tips', 'products', 'lifestyle']).withMessage('Invalid category'),
	body('audioTitle').optional().isString().trim(),
	body('audioArtist').optional().isString().trim(),
];

module.exports = {
	reelIdSchema,
	createReelSchema,
	createCommentSchema,
	updateReelSchema,
};
