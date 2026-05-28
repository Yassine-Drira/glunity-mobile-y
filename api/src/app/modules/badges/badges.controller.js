'use strict';

const service = require('./badges.service');
const mapper = require('./badges.mapper');
const asyncHandler = require('../../common/utils/async-handler');

const badgesController = {
	// GET /api/badges
	list: asyncHandler(async (req, res) => {
		const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
		const skip = req.query.skip !== undefined ? Number(req.query.skip) : 0;

		let { items } = await service.list({ limit, skip });

		if (items.length === 0 && skip === 0) {
			const seedData = [
				{
					name: 'Gluten-Free Novice',
					description: 'Awarded for starting your gluten-free journey with GlUnity.',
					icon: 'sprout',
					pointsRequired: 10,
				},
				{
					name: 'Celiac Warrior',
					description: 'Recognizes members with high awareness of cross-contamination.',
					icon: 'shield-check',
					pointsRequired: 50,
				},
				{
					name: 'Community Contributor',
					description: 'Given for contributing reviews and sharing gluten-free recipes.',
					icon: 'heart-pulse',
					pointsRequired: 100,
				},
				{
					name: 'Master Baker',
					description: 'Unlock this by baking verified Tunisian gluten-free dishes.',
					icon: 'chef-hat',
					pointsRequired: 200,
				},
			];
			const created = [];
			for (const seed of seedData) {
				const doc = await service.create(seed);
				created.push(doc);
			}
			items = created;
		}

		res.status(200).json(mapper.toBadgeListResponse(items));
	}),

	// GET /api/badges/:id
	getById: asyncHandler(async (req, res) => {
		const badge = await service.getById(req.params.id);
		res.status(200).json({ success: true, data: mapper.toBadgeResponse(badge) });
	}),
};

module.exports = badgesController;
