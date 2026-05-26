'use strict';

const { Router } = require('express');

const recipesController = require('./recipes.controller');
const {
	createRecipeSchema,
	updateRecipeSchema,
	listRecipesSchema,
	recipeIdSchema,
	setFavoriteSchema,
} = require('./recipes.schema');
const validate = require('../../common/middleware/validation.middleware');
const authMiddleware = require('../../common/middleware/auth.middleware');

const router = Router();

router.get('/', listRecipesSchema, validate, recipesController.list);
router.get('/:id', recipeIdSchema, validate, recipesController.getById);

router.post('/', authMiddleware, createRecipeSchema, validate, recipesController.create);
router.patch('/:id', authMiddleware, updateRecipeSchema, validate, recipesController.update);
router.delete('/:id', authMiddleware, recipeIdSchema, validate, recipesController.remove);

router.patch('/:id/favorite', authMiddleware, setFavoriteSchema, validate, recipesController.setFavorite);

module.exports = router;

