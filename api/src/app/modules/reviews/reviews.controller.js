'use strict';

const service = require('./reviews.service');
const mapper = require('./reviews.mapper');
const asyncHandler = require('../../common/utils/async-handler');
const AppError = require('../../common/errors/app-error');
const Product = require('../../../database/models/product.model');

const reviewsController = {
  // GET /api/reviews?productId=&recipeId=
  // Accessible to everyone including sellers (read-only).
  // Seeds demo reviews ONLY when the requesting user is a non-seller (celiac/proche/pro_health).
  list: asyncHandler(async (req, res) => {
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
    const skip = req.query.skip !== undefined ? Number(req.query.skip) : 0;
    const productId = req.query.productId;
    const recipeId = req.query.recipeId;

    let { items } = await service.list({ limit, skip, productId, recipeId });

    // Seed demo reviews only for non-seller users when there are none yet
    const isNonSeller = req.user && req.user.profileType !== 'pro_commerce';
    if (items.length === 0 && skip === 0 && (productId || recipeId) && isNonSeller) {
      const seedData = [
        {
          userId: req.user._id,
          productId,
          recipeId,
          rating: 5,
          comment: 'Absolutely love this! Highly recommended for anyone on a strict gluten-free diet.',
        },
        {
          userId: req.user._id,
          productId,
          recipeId,
          rating: 4,
          comment: 'Really good quality, matches my expectations perfectly. Will buy again!',
        },
      ];
      const created = [];
      for (const seed of seedData) {
        if (!seed.userId) continue;
        const doc = await service.create(seed);
        created.push(doc);
      }
      items = created;
    }

    res.status(200).json(mapper.toReviewListResponse(items));
  }),

  // POST /api/reviews
  // Only celiac / proche / pro_health users (enforced by route-level authorize middleware).
  // Extra guard: a user cannot review a product they own.
  create: asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { productId, recipeId, rating, comment } = req.body;

    // Prevent a seller from reviewing their own product (belt-and-suspenders guard)
    if (productId) {
      const product = await Product.findById(productId).select('sellerId');
      if (product && product.sellerId?.toString() === userId.toString()) {
        throw AppError.forbidden('You cannot review your own product');
      }
    }

    const review = await service.create({
      userId,
      productId,
      recipeId,
      rating,
      comment,
    });

    try {
      const badgesService = require('../badges/badges.service');
      await badgesService.awardPointsAndCheckBadges(userId, 10);
    } catch (err) {
      console.error('[gamification] Failed to award points for review:', err.message);
    }

    res.status(201).json({ success: true, data: mapper.toReviewResponse(review) });
  }),
};

module.exports = reviewsController;
