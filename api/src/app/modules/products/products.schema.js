'use strict';

const { body, param, query } = require('express-validator');

const productIdSchema = [
	param('id')
		.isMongoId()
		.withMessage('Invalid product ID format'),
];

const createProductSchema = [
	body('name')
		.trim()
		.notEmpty()
		.withMessage('Product name is required')
		.isLength({ min: 2, max: 140 })
		.withMessage('Name must be between 2 and 140 characters'),
	body('category')
		.trim()
		.notEmpty()
		.withMessage('Product category is required'),
	body('images')
		.optional()
		.isArray()
		.withMessage('Images must be an array of strings'),
	body('images.*')
		.isString()
		.withMessage('Each image must be a string URL'),
	body('isGlutenFree')
		.optional()
		.isBoolean()
		.withMessage('isGlutenFree must be a boolean'),
	body('certifiedGF')
		.optional()
		.isBoolean()
		.withMessage('certifiedGF must be a boolean'),
	body('ingredients')
		.optional()
		.isArray()
		.withMessage('Ingredients must be an array of strings'),
	body('ingredients.*')
		.isString()
		.withMessage('Each ingredient must be a string'),
	body('price')
		.notEmpty()
		.withMessage('Price is required')
		.isFloat({ min: 0 })
		.withMessage('Price must be a positive number'),
];

const updateProductSchema = [
	...productIdSchema,
	body('name')
		.optional()
		.trim()
		.isLength({ min: 2, max: 140 })
		.withMessage('Name must be between 2 and 140 characters'),
	body('category')
		.optional()
		.trim()
		.notEmpty()
		.withMessage('Product category cannot be empty'),
	body('images')
		.optional()
		.isArray()
		.withMessage('Images must be an array of strings'),
	body('images.*')
		.isString()
		.withMessage('Each image must be a string URL'),
	body('isGlutenFree')
		.optional()
		.isBoolean()
		.withMessage('isGlutenFree must be a boolean'),
	body('certifiedGF')
		.optional()
		.isBoolean()
		.withMessage('certifiedGF must be a boolean'),
	body('ingredients')
		.optional()
		.isArray()
		.withMessage('Ingredients must be an array of strings'),
	body('ingredients.*')
		.isString()
		.withMessage('Each ingredient must be a string'),
	body('price')
		.optional()
		.isFloat({ min: 0 })
		.withMessage('Price must be a positive number'),
];

const listProductsSchema = [
	query('page')
		.optional()
		.isInt({ min: 1 })
		.withMessage('Page must be a positive integer')
		.toInt(),
	query('limit')
		.optional()
		.isInt({ min: 1, max: 100 })
		.withMessage('Limit must be between 1 and 100')
		.toInt(),
	query('category')
		.optional()
		.trim(),
	query('search')
		.optional()
		.trim(),
	query('sellerId')
		.optional()
		.isMongoId()
		.withMessage('Invalid seller ID format'),
];

module.exports = {
	productIdSchema,
	createProductSchema,
	updateProductSchema,
	listProductsSchema,
};
