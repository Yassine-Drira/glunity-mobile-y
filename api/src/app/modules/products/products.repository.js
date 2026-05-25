'use strict';

const Product = require('../../../database/models/product.model');

class ProductsRepository {
	async create(productData) {
		const product = new Product(productData);
		return product.save();
	}

	async findById(id) {
		return Product.findById(id).populate('sellerId', 'fullName avatar');
	}

	async findOne(filter) {
		return Product.findOne(filter).populate('sellerId', 'fullName avatar');
	}

	async find(filter = {}, options = {}) {
		const { skip = 0, limit = 20, sort = { createdAt: -1 } } = options;
		
		const [products, total] = await Promise.all([
			Product.find(filter)
				.populate('sellerId', 'fullName avatar')
				.sort(sort)
				.skip(skip)
				.limit(limit)
				.exec(),
			Product.countDocuments(filter),
		]);

		return { products, total };
	}

	async updateById(id, updateData) {
		return Product.findByIdAndUpdate(id, updateData, { new: true })
			.populate('sellerId', 'fullName avatar');
	}

	async deleteById(id) {
		return Product.findByIdAndDelete(id);
	}
}

module.exports = new ProductsRepository();
