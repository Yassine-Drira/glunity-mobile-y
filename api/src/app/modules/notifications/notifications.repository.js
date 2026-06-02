'use strict';

const Notification = require('../../../database/models/notification.model');

const notificationsRepository = {
	findManyByUser(userId, { limit = 50, skip = 0 } = {}) {
		return Notification.find({ userId })
			.sort({ createdAt: -1 })
			.limit(limit)
			.skip(skip)
			.lean();
	},

	findById(id) {
		return Notification.findById(id).lean();
	},

	create(payload) {
		return Notification.create(payload);
	},

	markAsRead(id, userId) {
		return Notification.findOneAndUpdate(
			{ _id: id, userId },
			{ $set: { isRead: true } },
			{ new: true }
		).lean();
	},

	markAllAsRead(userId) {
		return Notification.updateMany(
			{ userId, isRead: false },
			{ $set: { isRead: true } }
		);
	},

	delete(id, userId) {
		return Notification.findOneAndDelete({ _id: id, userId });
	},

	deleteAll(userId) {
		return Notification.deleteMany({ userId });
	},
};

module.exports = notificationsRepository;
