'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const productSchema = new Schema(
	{
		name: {
			type: String,
			required: [true, 'Product name is required'],
			trim: true,
			minlength: [2, 'Name must be at least 2 characters'],
			maxlength: [140, 'Name must be at most 140 characters'],
		},
		category: {
			type: String,
			required: [true, 'Product category is required'],
			trim: true,
			index: true,
		},
		sellerId: {
			type: Types.ObjectId,
			ref: 'User',
			required: [true, 'sellerId is required'],
			index: true,
		},
		images: {
			type: [String],
			default: [],
		},
		isGlutenFree: {
			type: Boolean,
			default: true,
		},
		certifiedGF: {
			type: Boolean,
			default: false,
		},
		ingredients: {
			type: [String],
			default: [],
		},
		price: {
			type: Number,
			required: [true, 'Price is required'],
			min: [0, 'Price cannot be negative'],
		},
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: { virtuals: true, versionKey: false },
		toObject: { virtuals: true, versionKey: false },
	},
);

productSchema.index({ name: 'text' });
productSchema.index({ category: 1, createdAt: -1 });

productSchema.methods.toPublic = function toPublic() {
	return {
		_id: this._id,
		name: this.name,
		category: this.category,
		sellerId: this.sellerId,
		images: this.images,
		isGlutenFree: this.isGlutenFree,
		certifiedGF: this.certifiedGF,
		ingredients: this.ingredients,
		price: this.price,
		createdAt: this.createdAt,
		updatedAt: this.updatedAt,
	};
};

const Product = model('Product', productSchema);

module.exports = Product;
