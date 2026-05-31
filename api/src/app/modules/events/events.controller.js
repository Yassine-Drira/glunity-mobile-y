'use strict';

const service = require('./events.service');
const mapper = require('./events.mapper');
const asyncHandler = require('../../common/utils/async-handler');

const eventsController = {
	// GET /api/events
	list: asyncHandler(async (req, res) => {
		const q = {
			search: req.query.search,
			type: req.query.type,
			limit: req.query.limit !== undefined ? Number(req.query.limit) : 50,
			skip: req.query.skip !== undefined ? Number(req.query.skip) : 0,
		};
		const { items, total } = await service.list(q);
		res.status(200).json(mapper.toEventListResponse(items, total));
	}),

	// GET /api/events/:id
	getOne: asyncHandler(async (req, res) => {
		const doc = await service.getById(req.params.id);
		res.status(200).json(mapper.toEventResponse(doc));
	}),

	// POST /api/events (auth)
	create: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const doc = await service.create(req.body, userId);
		try {
			const badgesService = require('../badges/badges.service');
			await badgesService.awardPointsAndCheckBadges(userId, 15);
		} catch (err) {
			console.error('[gamification] Failed to award points for creating event:', err.message);
		}
		res.status(201).json(mapper.toEventResponse(doc));
	}),

	// POST /api/events/:id/join (auth)
	join: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const updated = await service.join(req.params.id, userId);
		try {
			const badgesService = require('../badges/badges.service');
			await badgesService.awardPointsAndCheckBadges(userId, 5);
		} catch (err) {
			console.error('[gamification] Failed to award points for joining event:', err.message);
		}
		res.status(200).json(mapper.toEventResponse(updated));
	}),

	leave: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const updated = await service.leave(req.params.id, userId);
		res.status(200).json(mapper.toEventResponse(updated));
	}),
};

module.exports = eventsController;
