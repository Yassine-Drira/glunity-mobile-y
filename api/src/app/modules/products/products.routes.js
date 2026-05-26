'use strict';

const { Router } = require('express');

const productsController = require('./products.controller');
const {
	createProductSchema,
	updateProductSchema,
	listProductsSchema,
	productIdSchema,
} = require('./products.schema');
const validate = require('../../common/middleware/validation.middleware');
const authMiddleware = require('../../common/middleware/auth.middleware');

const router = Router();

// Public routes (or partially protected based on business logic)
router.get('/', listProductsSchema, validate, productsController.list);
router.get('/:id', productIdSchema, validate, productsController.getById);

// Protected routes (require user to be logged in)
router.post('/', authMiddleware, createProductSchema, validate, productsController.create);
router.patch('/:id', authMiddleware, updateProductSchema, validate, productsController.update);
router.delete('/:id', authMiddleware, productIdSchema, validate, productsController.remove);

module.exports = router;
