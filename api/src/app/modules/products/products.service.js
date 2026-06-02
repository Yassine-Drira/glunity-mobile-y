'use strict';

const createHttpError = require('http-errors');
const productsRepository = require('./products.repository');
const User = require('../../../database/models/user.model');
const Notification = require('../../../database/models/notification.model');

class ProductsService {
	async create(productData, userId) {
		const newProduct = {
			...productData,
			sellerId: userId,
		};
		const product = await productsRepository.create(newProduct);
		const prodObj = product.toObject ? product.toObject() : product;

		// Dispatch notification to other users in background
		(async () => {
			try {
				const users = await User.find({ _id: { $ne: userId } }, '_id pushEnabled').lean();
				if (users.length > 0) {
					const notifs = users
						.filter(u => u.pushEnabled !== false)
						.map(u => ({
							userId: u._id,
							title: 'New Gluten-Free Product! 🍕',
							body: `A new product "${prodObj.name}" is now available in the market. Tap to view!`,
							type: 'product',
							isRead: false,
							metadata: { productId: String(prodObj._id) },
						}));
					if (notifs.length > 0) {
						await Notification.insertMany(notifs);
					}
				}
			} catch (err) {
				console.error('Failed to dispatch new product notifications:', err);
			}
		})();

		return product;
	}

	async getById(id) {
		const product = await productsRepository.findById(id);
		if (!product) {
			throw createHttpError(404, 'Product not found');
		}
		return product;
	}

	async incrementViews(id) {
		return productsRepository.incrementViews(id);
	}

	async list(query = {}) {
		const { page = 1, limit = 20, category, search, sellerId } = query;
		
		const filter = {};
		
		if (category) {
			filter.category = category;
		}
		if (sellerId) {
			filter.sellerId = sellerId;
		}
		if (search) {
			filter.$text = { $search: search };
		}

		const skip = (page - 1) * limit;
		const options = {
			skip,
			limit,
			sort: { createdAt: -1 }
		};

		const { products, total } = await productsRepository.find(filter, options);

		return {
			products,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		};
	}

	async update(id, updateData, userId) {
		const product = await productsRepository.findById(id);
		if (!product) {
			throw createHttpError(404, 'Product not found');
		}

		const sellerIdStr = product.sellerId._id ? product.sellerId._id.toString() : product.sellerId.toString();
		const userIdStr = userId.toString();

		if (sellerIdStr !== userIdStr) {
			throw createHttpError(403, 'You are not authorized to update this product');
		}

		return productsRepository.updateById(id, updateData);
	}

	async remove(id, userId) {
		const product = await productsRepository.findById(id);
		if (!product) {
			throw createHttpError(404, 'Product not found');
		}

		const sellerIdStr = product.sellerId._id ? product.sellerId._id.toString() : product.sellerId.toString();
		const userIdStr = userId.toString();

		if (sellerIdStr !== userIdStr) {
			throw createHttpError(403, 'You are not authorized to delete this product');
		}

		await productsRepository.deleteById(id);
		return { success: true };
	}
}

module.exports = new ProductsService();
