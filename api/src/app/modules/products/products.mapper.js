'use strict';

class ProductsMapper {
	toPublic(product) {
		if (!product) return null;
		
		if (typeof product.toPublic === 'function') {
			return product.toPublic();
		}

		// Fallback in case it's a plain object
		return {
			_id: product._id,
			name: product.name,
			category: product.category,
			sellerId: product.sellerId,
			images: product.images || [],
			isGlutenFree: product.isGlutenFree,
			certifiedGF: product.certifiedGF,
			ingredients: product.ingredients || [],
			price: product.price,
			createdAt: product.createdAt,
			updatedAt: product.updatedAt,
		};
	}

	toPublicList(products) {
		if (!Array.isArray(products)) return [];
		return products.map((product) => this.toPublic(product));
	}
}

module.exports = new ProductsMapper();
