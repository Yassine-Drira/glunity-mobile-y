'use strict';

const mongoose = require('mongoose');

const { Schema, model, Types } = mongoose;

const RECIPE_CATEGORIES = ['tunisian', 'easy', 'quick'];

const nutritionInfoSchema = new Schema(
	{
		calories: { type: Number, min: 0, default: 0 },
		carbs: { type: Number, min: 0, default: 0 },
		protein: { type: Number, min: 0, default: 0 },
		fat: { type: Number, min: 0, default: 0 },
		fiber: { type: Number, min: 0, default: 0 },
		sugar: { type: Number, min: 0, default: 0 },
		sodium: { type: Number, min: 0, default: 0 },
		servingSize: { type: String, trim: true, default: '' },
	},
	{ _id: false },
);

const recipeSchema = new Schema(
	{
		title: {
			type: String,
			required: [true, 'Recipe title is required'],
			trim: true,
			minlength: [2, 'Title must be at least 2 characters'],
			maxlength: [140, 'Title must be at most 140 characters'],
		},
		slug: {
			type: String,
			unique: true,
			trim: true,
			lowercase: true,
		},
		category: {
			type: String,
			required: [true, 'Recipe category is required'],
			enum: {
				values: RECIPE_CATEGORIES,
				message: `category must be one of: ${RECIPE_CATEGORIES.join(', ')}`,
			},
			index: true,
		},
		description: {
			type: String,
			trim: true,
			maxlength: [500, 'Description must be at most 500 characters'],
			default: '',
		},
		ingredients: {
			type: [String],
			required: true,
			validate: {
				validator(value) {
					return Array.isArray(value) && value.length > 0;
				},
				message: 'At least one ingredient is required',
			},
		},
		steps: {
			type: [String],
			required: true,
			validate: {
				validator(value) {
					return Array.isArray(value) && value.length > 0;
				},
				message: 'At least one preparation step is required',
			},
		},
		nutritionInfo: {
			type: nutritionInfoSchema,
			default: () => ({}),
		},
		photos: {
			type: [String],
			default: [],
		},
		videos: {
			type: [String],
			default: [],
		},
		authorId: {
			type: Types.ObjectId,
			ref: 'User',
			required: [true, 'authorId is required'],
			index: true,
		},
		isFavorite: {
			type: Boolean,
			default: false,
		},
		favoritedBy: [
			{
				type: Types.ObjectId,
				ref: 'User',
			},
		],
		isPublished: {
			type: Boolean,
			default: true,
			index: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: { virtuals: true, versionKey: false },
		toObject: { virtuals: true, versionKey: false },
	},
);

recipeSchema.index({ title: 'text' });
recipeSchema.index({ category: 1, createdAt: -1 });

function slugifyTitle(title) {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

recipeSchema.pre('validate', function preValidate(next) {
	if (!this.slug && this.title) {
		this.slug = slugifyTitle(this.title);
	}
	next();
});

recipeSchema.methods.toPublic = function toPublic(userId = null) {
	const isFavForUser =
		!!userId &&
		Array.isArray(this.favoritedBy) &&
		this.favoritedBy.some((id) => id.toString() === userId.toString());

	return {
		_id: this._id,
		title: this.title,
		slug: this.slug,
		category: this.category,
		description: this.description,
		ingredients: this.ingredients,
		steps: this.steps,
		nutritionInfo: this.nutritionInfo,
		photos: this.photos,
		videos: this.videos,
		authorId: this.authorId,
		isFavorite: isFavForUser || this.isFavorite,
		favoriteCount: this.favoritedBy?.length || 0,
		createdAt: this.createdAt,
		updatedAt: this.updatedAt,
	};
};

const Recipe = model('Recipe', recipeSchema);

module.exports = Recipe;
module.exports.RECIPE_CATEGORIES = RECIPE_CATEGORIES;

