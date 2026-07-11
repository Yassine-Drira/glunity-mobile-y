'use strict';

const repository = require('./notifications.repository');
const notificationEvents = require('./notifications.events');

const notificationsService = {
	async list(userId, { limit = 50, skip = 0 } = {}) {
		const items = await repository.findManyByUser(userId, { limit, skip });
		return { items };
	},

	async markAsRead(id, userId) {
		const updated = await repository.markAsRead(id, userId);
		if (!updated) {
			const error = new Error('Notification not found');
			error.status = 404;
			throw error;
		}

		// Dispatch badge update event
		notificationEvents.emit('notification:badgeUpdate', { userId });
		return updated;
	},

	async markAllAsRead(userId) {
		await repository.markAllAsRead(userId);

		// Dispatch badge update event
		notificationEvents.emit('notification:badgeUpdate', { userId, unreadCount: 0 });
		return { success: true };
	},

	async delete(id, userId) {
		const doc = await repository.delete(id, userId);
		if (!doc) {
			const error = new Error('Notification not found');
			error.status = 404;
			throw error;
		}

		// Dispatch badge update event
		notificationEvents.emit('notification:badgeUpdate', { userId });
		return doc;
	},

	async deleteAll(userId) {
		await repository.deleteAll(userId);

		// Dispatch badge update event
		notificationEvents.emit('notification:badgeUpdate', { userId, unreadCount: 0 });
		return { success: true };
	},

	async create(payload) {
		const doc = await repository.create(payload);

		// Dispatch background tasks (socket and push) via event emitter
		notificationEvents.emit('notification:created', { doc, payload });
		
		return doc;
	},
};

module.exports = notificationsService;
