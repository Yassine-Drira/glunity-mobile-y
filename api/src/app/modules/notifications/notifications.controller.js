'use strict';

const service = require('./notifications.service');
const mapper = require('./notifications.mapper');
const asyncHandler = require('../../common/utils/async-handler');

const notificationsController = {
	// GET /api/notifications
	list: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
		const skip = req.query.skip !== undefined ? Number(req.query.skip) : 0;

		let { items } = await service.list(userId, { limit, skip });

		// Automatically seed mock notifications if this user has none yet
		if (items.length === 0 && skip === 0) {
			const seedData = [
				{
					userId,
					title: 'Welcome to GlUnity! 🌾',
					body: 'Find certified gluten-free products, local events, and recipes tailored to your lifestyle.',
					type: 'system',
					isRead: false,
				},
				{
					userId,
					title: 'Gluten-Free Cooking Workshop 🥞',
					body: 'A new event was published: Pancake Sunday Meetup on June 15th! RSVP to book your spot.',
					type: 'event',
					isRead: false,
				},
				{
					userId,
					title: 'Pure Treats Bakery 🥐',
					body: 'Senda added fresh gluten-free chocolate croissants to the products market catalog.',
					type: 'product',
					isRead: true,
				},
				{
					userId,
					title: 'Community Verified Badge Alert 🛡️',
					body: 'Your profile has been verified as a Gluten-Free Warrior! Enjoy our certified badges.',
					type: 'community',
					isRead: false,
				},
			];
			const created = [];
			for (const seed of seedData) {
				const doc = await service.create(seed);
				created.push(doc);
			}
			items = created;
		}

		res.status(200).json(mapper.toNotificationListResponse(items));
	}),

	// POST /api/notifications/:id/read
	markAsRead: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const updated = await service.markAsRead(req.params.id, userId);
		res.status(200).json(mapper.toNotificationResponse(updated));
	}),

	// POST /api/notifications/read-all
	markAllAsRead: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		await service.markAllAsRead(userId);
		res.status(200).json({ success: true, message: 'All notifications marked as read' });
	}),

	// DELETE /api/notifications
	deleteAll: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		await service.deleteAll(userId);
		res.status(200).json({ success: true, message: 'All notifications deleted successfully' });
	}),

	// DELETE /api/notifications/:id
	delete: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const deleted = await service.delete(req.params.id, userId);
		res.status(200).json({ success: true, data: mapper.toNotificationDto(deleted), message: 'Notification deleted successfully' });
	}),

	// POST /api/notifications/test-push
	testPush: asyncHandler(async (req, res) => {
		const user = req.user;
		if (!user.pushToken) {
			const err = new Error('No push token registered for this user');
			err.status = 400;
			throw err;
		}

		const expoClient = require('../../integrations/push/expo.client');
		const result = await expoClient.sendPushNotification(
			user.pushToken,
			'GlUnity Test Push 🚀',
			'Hello! This is a test push notification from GlUnity backend.',
			{ test: true }
		);

		res.status(200).json({ success: !!result, result });
	}),

	markMultipleAsRead: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const { ids } = req.body;
		const result = await service.markMultipleAsRead(ids, userId);
		res.status(200).json(result);
	}),

	archiveMultiple: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const { ids } = req.body;
		const result = await service.archiveMultiple(ids, userId);
		res.status(200).json(result);
	}),
};

module.exports = notificationsController;
