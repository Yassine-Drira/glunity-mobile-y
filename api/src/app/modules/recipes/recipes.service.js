'use strict';

const mongoose = require('mongoose');

const recipesRepository = require('./recipes.repository');
const AppError = require('../../common/errors/app-error');

class RecipesService {
	async listRecipes(query, userId = null) {
		const page = Number(query.page) > 0 ? Number(query.page) : 1;
		const limitRaw = Number(query.limit) > 0 ? Number(query.limit) : 20;
		const limit = Math.min(limitRaw, 50);

		const { items, total } = await recipesRepository.findMany({
			category: query.category,
			search: query.search,
			page,
			limit,
		});

		return {
			items: items.map((recipe) => recipe.toPublic(userId)),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.max(1, Math.ceil(total / limit)),
			},
		};
	}

	async getRecipeById(id, userId = null) {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			throw AppError.badRequest('Invalid recipe id', 'INVALID_RECIPE_ID');
		}

		const recipe = await recipesRepository.findById(id);
		if (!recipe) throw AppError.notFound('Recipe');

		return recipe.toPublic(userId);
	}

	async createRecipe(dto, authorId) {
		const recipe = await recipesRepository.create({
			title: dto.title,
			category: dto.category,
			description: dto.description,
			ingredients: dto.ingredients,
			steps: dto.steps,
			nutritionInfo: dto.nutritionInfo,
			photos: dto.photos,
			videos: dto.videos,
			authorId,
		});

		return recipe.toPublic(authorId);
	}

	async updateRecipe(id, authorId, updates) {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			throw AppError.badRequest('Invalid recipe id', 'INVALID_RECIPE_ID');
		}

		const recipe = await recipesRepository.updateByIdForAuthor(id, authorId, updates);
		if (!recipe) {
			throw AppError.notFound('Recipe not found or not owned by current user');
		}

		return recipe.toPublic(authorId);
	}

	async deleteRecipe(id, authorId) {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			throw AppError.badRequest('Invalid recipe id', 'INVALID_RECIPE_ID');
		}

		const deleted = await recipesRepository.deleteByIdForAuthor(id, authorId);
		if (!deleted) {
			throw AppError.notFound('Recipe not found or not owned by current user');
		}
	}

	async setFavorite(id, userId, value) {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			throw AppError.badRequest('Invalid recipe id', 'INVALID_RECIPE_ID');
		}

		const recipe = await recipesRepository.setFavorite(id, userId, value);
		if (!recipe) throw AppError.notFound('Recipe');

		return recipe.toPublic(userId);
	}
}

module.exports = new RecipesService();

