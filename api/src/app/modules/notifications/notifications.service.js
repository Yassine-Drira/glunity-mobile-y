'use strict';

const repository = require('./notifications.repository');

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
		return updated;
	},

	async markAllAsRead(userId) {
		await repository.markAllAsRead(userId);
		return { success: true };
	},

	async delete(id, userId) {
		const doc = await repository.delete(id, userId);
		if (!doc) {
			const error = new Error('Notification not found');
			error.status = 404;
			throw error;
		}
		return doc;
	},

	async deleteAll(userId) {
		await repository.deleteAll(userId);
		return { success: true };
	},

	async create(payload) {
		return repository.create(payload);
	},
};

module.exports = notificationsService;
