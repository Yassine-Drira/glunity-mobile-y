'use strict';

const asyncHandler = require('../../common/utils/async-handler');
const recipesService = require('./recipes.service');
const recipesMapper = require('./recipes.mapper');

const recipesController = {
	list: asyncHandler(async (req, res) => {
		const userId = req.user?._id || null;
		const payload = await recipesService.listRecipes(req.query, userId);
		res.status(200).json(recipesMapper.toListResponse(payload));
	}),

	getById: asyncHandler(async (req, res) => {
		const userId = req.user?._id || null;
		const recipe = await recipesService.getRecipeById(req.params.id, userId);
		res.status(200).json(recipesMapper.toItemResponse(recipe));
	}),

	create: asyncHandler(async (req, res) => {
		const recipe = await recipesService.createRecipe(req.body, req.user._id);
		res.status(201).json(recipesMapper.toItemResponse(recipe));
	}),

	update: asyncHandler(async (req, res) => {
		const recipe = await recipesService.updateRecipe(req.params.id, req.user._id, req.body);
		res.status(200).json(recipesMapper.toItemResponse(recipe));
	}),

	remove: asyncHandler(async (req, res) => {
		await recipesService.deleteRecipe(req.params.id, req.user._id);
		res.status(200).json({ success: true, message: 'Recipe deleted successfully' });
	}),

	setFavorite: asyncHandler(async (req, res) => {
		const recipe = await recipesService.setFavorite(req.params.id, req.user._id, !!req.body.isFavorite);
		res.status(200).json(recipesMapper.toItemResponse(recipe));
	}),
};

module.exports = recipesController;

