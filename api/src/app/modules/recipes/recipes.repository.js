'use strict';

const Recipe = require('../../../database/models/recipe.model');

const PUBLISHED_QUERY = {
	$or: [{ isPublished: true }, { isPublished: { $exists: false } }],
};

const recipesRepository = {
	create(data) {
		return Recipe.create(data);
	},

	findById(id) {
		return Recipe.findOne({ _id: id, ...PUBLISHED_QUERY });
	},

	async findMany({ category, search, page = 1, limit = 20 }) {
		const query = { ...PUBLISHED_QUERY };

		if (category) query.category = category;
		if (search) query.$text = { $search: search };

		const skip = (page - 1) * limit;

		const [items, total] = await Promise.all([
			Recipe.find(query)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit),
			Recipe.countDocuments(query),
		]);

		return { items, total, page, limit };
	},

	updateByIdForAuthor(id, authorId, updates) {
		return Recipe.findOneAndUpdate(
			{ _id: id, authorId },
			{ $set: updates },
			{ new: true, runValidators: true },
		);
	},

	deleteByIdForAuthor(id, authorId) {
		return Recipe.findOneAndDelete({ _id: id, authorId });
	},

	setFavorite(recipeId, userId, value) {
		return Recipe.findByIdAndUpdate(
			recipeId,
			value ? { $addToSet: { favoritedBy: userId } } : { $pull: { favoritedBy: userId } },
			{ new: true },
		);
	},
};

module.exports = recipesRepository;

