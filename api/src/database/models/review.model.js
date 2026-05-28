'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const reviewSchema = new Schema(
	{
		userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
		productId: { type: Types.ObjectId, ref: 'Product', index: true },
		recipeId: { type: Types.ObjectId, ref: 'Recipe', index: true },
		rating: { type: Number, required: true, min: 1, max: 5 },
		comment: { type: String, required: true, trim: true },
	},
	{
		timestamps: true,
		versionKey: false,
	}
);

const Review = model('Review', reviewSchema);
module.exports = Review;
