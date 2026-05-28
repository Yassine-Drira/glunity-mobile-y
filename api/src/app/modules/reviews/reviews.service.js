'use strict';

const repository = require('./reviews.repository');

const reviewsService = {
	async list({ limit = 50, skip = 0, productId, recipeId } = {}) {
		const items = await repository.findMany({ limit, skip, productId, recipeId });
		return { items };
	},

	async create(payload) {
		const review = await repository.create(payload);
		return review.populate('userId', 'fullName avatar');
	},
};

module.exports = reviewsService;
