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
					name: 'Bronze Initiator',
					description: 'Awarded for starting your gluten-free journey with GlUnity.',
					icon: 'bronze',
					pointsRequired: 150,
				},
				{
					name: 'Active Contributor',
					description: 'Recognizes members with high awareness of cross-contamination.',
					icon: 'silver',
					pointsRequired: 500,
				},
				{
					name: 'Gluten-Free Champion',
					description: 'Awarded for mastering the gluten-free lifestyle and inspiring others.',
					icon: 'gold',
					pointsRequired: 2500,
				},
				{
					name: 'Silver Advocate',
					description: 'Recognizes pro members showing high advocacy.',
					icon: 'pro_silver',
					pointsRequired: 300,
				},
				{
					name: 'Gold Guardian',
					description: 'The highest pro honour for ultimate community guardians.',
					icon: 'pro_gold',
					pointsRequired: 2500,
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
