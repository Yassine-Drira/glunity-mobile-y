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

	// POST /api/events/:id/cancel (auth)
	cancel: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const updated = await service.cancel(req.params.id, userId);
		res.status(200).json(mapper.toEventResponse(updated));
	}),

	// POST /api/events/:id/remove (auth) — pro_commerce or organizer can soft-remove
	remove: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const profileType = req.user?.profileType;
		const updated = await service.remove(req.params.id, userId, profileType);
		res.status(200).json(mapper.toEventResponse(updated));
	}),

	// ── Registration handlers ──────────────────────────────────────────────────
	registerAttendee: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const eventId = req.params.id;
		const registration = await service.registerAttendee(eventId, userId, req.body);
		res.status(201).json({ success: true, data: registration });
	}),

	getRegistrations: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const eventId = req.params.id;
		const registrations = await service.getRegistrations(eventId, userId);
		res.status(200).json({ success: true, data: registrations });
	}),

	getMyRegistration: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const eventId = req.params.id;
		const registration = await service.getMyRegistration(eventId, userId);
		res.status(200).json({ success: true, data: registration });
	}),

	confirmRegistration: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const regId = req.params.regId;
		const updated = await service.confirmRegistration(regId, userId);
		res.status(200).json({ success: true, data: updated });
	}),

	cancelRegistration: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const regId = req.params.regId;
		const updated = await service.cancelRegistration(regId, userId);
		res.status(200).json({ success: true, data: updated });
	}),

	getOwnerRegistrationNotifications: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const data = await service.getOwnerRegistrationNotifications(userId);
		res.status(200).json({ success: true, data });
	}),

	getOwnerStats: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const data = await service.getOwnerStats(userId);
		res.status(200).json({ success: true, data });
	}),

	getRegistrationDetails: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const eventId = req.params.id;
		const regId = req.params.registrationId;
		const data = await service.getRegistrationDetails(eventId, regId, userId);
		res.status(200).json({ success: true, data });
	}),

	approveRegistration: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const regId = req.params.id;
		const updated = await service.approveRegistration(regId, userId);
		res.status(200).json({ success: true, data: updated });
	}),

	rejectRegistration: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const regId = req.params.id;
		const { reason } = req.body;
		const updated = await service.rejectRegistration(regId, userId, reason);
		res.status(200).json({ success: true, data: updated });
	}),
};

module.exports = eventsController;
