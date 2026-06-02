'use strict';

const repo = require('./events.repository');
const AppError = require('../../common/errors/app-error');

const User = require('../../../database/models/user.model');
const Notification = require('../../../database/models/notification.model');

const eventsService = {
	async list(query) {
		const items = await repo.findMany(query);
		const total = items.length;
		return { items, total };
	},

	async getById(id) {
		const doc = await repo.findById(id);
		if (!doc) throw AppError.notFound('Event');
		return doc;
	},

	async create(payload, userId) {
		const doc = await repo.create({ ...payload, createdBy: userId || undefined });
		const eventObj = doc.toObject();

		// Dispatch notification to other users in background
		(async () => {
			try {
				const users = await User.find({ _id: { $ne: userId } }, '_id pushEnabled').lean();
				if (users.length > 0) {
					const notifs = users
						.filter(u => u.pushEnabled !== false)
						.map(u => ({
							userId: u._id,
							title: 'New Event Published! 📅',
							body: `A new event was published: "${eventObj.title}". Tap to check details!`,
							type: 'event',
							isRead: false,
							metadata: { eventId: String(eventObj._id) },
						}));
					if (notifs.length > 0) {
						await Notification.insertMany(notifs);
					}
				}
			} catch (err) {
				console.error('Failed to dispatch new event notifications:', err);
			}
		})();

		return eventObj;
	},

	async join(eventId, userId) {
		const doc = await repo.findById(eventId);
		if (!doc) throw AppError.notFound('Event');
		if (doc.maxCapacity && doc.attendees && doc.attendees.length >= doc.maxCapacity) {
			throw AppError.badRequest('Event is full');
		}
		const updated = await repo.join(eventId, userId);
		if (!updated) throw AppError.notFound('Event');
		return updated;
	},

	async leave(eventId, userId) {
		const doc = await repo.findById(eventId);
		if (!doc) throw AppError.notFound('Event');
		const updated = await repo.leave(eventId, userId);
		if (!updated) throw AppError.notFound('Event');
		return updated;
	},
};

module.exports = eventsService;
