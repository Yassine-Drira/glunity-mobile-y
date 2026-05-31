'use strict';

const productsService = require('./products.service');
const productsMapper = require('./products.mapper');

class ProductsController {
	async create(req, res, next) {
		try {
			const productData = req.body;
			const userId = req.user._id || req.user.id;

			const product = await productsService.create(productData, userId);
			
			try {
				const badgesService = require('../badges/badges.service');
				await badgesService.awardPointsAndCheckBadges(userId, 15);
			} catch (err) {
				console.error('[gamification] Failed to award points for product:', err.message);
			}

			res.status(201).json({
				success: true,
				data: productsMapper.toPublic(product),
			});
		} catch (error) {
			next(error);
		}
	}

	async getById(req, res, next) {
		try {
			const { id } = req.params;
			const product = await productsService.getById(id);
			
			res.status(200).json({
				success: true,
				data: productsMapper.toPublic(product),
			});
		} catch (error) {
			next(error);
		}
	}

	async list(req, res, next) {
		try {
			const result = await productsService.list(req.query);
			
			res.status(200).json({
				success: true,
				data: productsMapper.toPublicList(result.products),
				pagination: result.pagination,
			});
		} catch (error) {
			next(error);
		}
	}

	async update(req, res, next) {
		try {
			const { id } = req.params;
			const updateData = req.body;
			const userId = req.user._id || req.user.id;

			const updatedProduct = await productsService.update(id, updateData, userId);
			
			res.status(200).json({
				success: true,
				data: productsMapper.toPublic(updatedProduct),
			});
		} catch (error) {
			next(error);
		}
	}

	async remove(req, res, next) {
		try {
			const { id } = req.params;
			const userId = req.user._id || req.user.id;

			await productsService.remove(id, userId);
			
			res.status(200).json({
				success: true,
				message: 'Product deleted successfully',
			});
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new ProductsController();
