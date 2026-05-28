'use strict';

const Review = require('../../../database/models/review.model');

const reviewsRepository = {
	findMany({ limit = 50, skip = 0, productId, recipeId } = {}) {
		const query = {};
		if (productId) query.productId = productId;
		if (recipeId) query.recipeId = recipeId;

		return Review.find(query)
			.populate('userId', 'fullName avatar')
			.sort({ createdAt: -1 })
			.limit(limit)
			.skip(skip)
			.lean();
	},

	findById(id) {
		return Review.findById(id).lean();
	},

	create(payload) {
		return Review.create(payload);
	},
};

module.exports = reviewsRepository;
