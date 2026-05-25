'use strict';

const { body, param, query } = require('express-validator');
const { RECIPE_CATEGORIES } = require('../../../database/models/recipe.model');

const createRecipeSchema = [
	body('title')
		.trim()
		.notEmpty().withMessage('title is required')
		.isLength({ min: 2, max: 140 }).withMessage('title must be between 2 and 140 chars'),

	body('category')
		.notEmpty().withMessage('category is required')
		.isIn(RECIPE_CATEGORIES).withMessage(`category must be one of: ${RECIPE_CATEGORIES.join(', ')}`),

	body('description')
		.optional({ nullable: true })
		.trim()
		.isLength({ max: 500 }).withMessage('description must be at most 500 chars'),

	body('ingredients')
		.isArray({ min: 1 }).withMessage('ingredients must contain at least one item'),

	body('ingredients.*')
		.trim()
		.notEmpty().withMessage('ingredient entries cannot be empty'),

	body('steps')
		.isArray({ min: 1 }).withMessage('steps must contain at least one item'),

	body('steps.*')
		.trim()
		.notEmpty().withMessage('step entries cannot be empty'),

	body('nutritionInfo')
		.optional({ nullable: true })
		.isObject().withMessage('nutritionInfo must be an object'),

	body('photos')
		.optional({ nullable: true })
		.isArray().withMessage('photos must be an array'),

	body('videos')
		.optional({ nullable: true })
		.isArray().withMessage('videos must be an array'),
];

const updateRecipeSchema = [
	param('id').isMongoId().withMessage('invalid recipe id'),

	body('title')
		.optional()
		.trim()
		.isLength({ min: 2, max: 140 }).withMessage('title must be between 2 and 140 chars'),

	body('category')
		.optional()
		.isIn(RECIPE_CATEGORIES).withMessage(`category must be one of: ${RECIPE_CATEGORIES.join(', ')}`),

	body('description')
		.optional({ nullable: true })
		.trim()
		.isLength({ max: 500 }).withMessage('description must be at most 500 chars'),

	body('ingredients')
		.optional()
		.isArray({ min: 1 }).withMessage('ingredients must contain at least one item'),

	body('steps')
		.optional()
		.isArray({ min: 1 }).withMessage('steps must contain at least one item'),

	body('nutritionInfo')
		.optional({ nullable: true })
		.isObject().withMessage('nutritionInfo must be an object'),

	body('photos')
		.optional({ nullable: true })
		.isArray().withMessage('photos must be an array'),

	body('videos')
		.optional({ nullable: true })
		.isArray().withMessage('videos must be an array'),
];

const listRecipesSchema = [
	query('category')
		.optional()
		.isIn(RECIPE_CATEGORIES).withMessage(`category must be one of: ${RECIPE_CATEGORIES.join(', ')}`),
	query('search').optional().isString(),
	query('page').optional().isInt({ min: 1 }),
	query('limit').optional().isInt({ min: 1, max: 50 }),
];

const recipeIdSchema = [
	param('id').isMongoId().withMessage('invalid recipe id'),
];

const setFavoriteSchema = [
	param('id').isMongoId().withMessage('invalid recipe id'),
	body('isFavorite').isBoolean().withMessage('isFavorite must be boolean'),
];

module.exports = {
	createRecipeSchema,
	updateRecipeSchema,
	listRecipesSchema,
	recipeIdSchema,
	setFavoriteSchema,
};

