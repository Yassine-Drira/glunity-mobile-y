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

		// Dispatch badge update
		(async () => {
			try {
				const socketBootstrap = require('../../bootstrap/socket.bootstrap');
				const io = socketBootstrap.getIO();
				if (io) {
					const unreadCount = await repository.countUnread(userId);
					io.to(String(userId)).emit('notification:badge', { unreadCount });
				}
			} catch (err) {
				console.error('Failed to emit real-time badge update on markAsRead:', err);
			}
		})();

		return updated;
	},

	async markAllAsRead(userId) {
		await repository.markAllAsRead(userId);

		// Dispatch badge update
		(async () => {
			try {
				const socketBootstrap = require('../../bootstrap/socket.bootstrap');
				const io = socketBootstrap.getIO();
				if (io) {
					io.to(String(userId)).emit('notification:badge', { unreadCount: 0 });
				}
			} catch (err) {
				console.error('Failed to emit real-time badge update on markAllAsRead:', err);
			}
		})();

		return { success: true };
	},

	async delete(id, userId) {
		const doc = await repository.delete(id, userId);
		if (!doc) {
			const error = new Error('Notification not found');
			error.status = 404;
			throw error;
		}

		// Dispatch badge update
		(async () => {
			try {
				const socketBootstrap = require('../../bootstrap/socket.bootstrap');
				const io = socketBootstrap.getIO();
				if (io) {
					const unreadCount = await repository.countUnread(userId);
					io.to(String(userId)).emit('notification:badge', { unreadCount });
				}
			} catch (err) {
				console.error('Failed to emit real-time badge update on delete:', err);
			}
		})();

		return doc;
	},

	async deleteAll(userId) {
		await repository.deleteAll(userId);

		// Dispatch badge update
		(async () => {
			try {
				const socketBootstrap = require('../../bootstrap/socket.bootstrap');
				const io = socketBootstrap.getIO();
				if (io) {
					io.to(String(userId)).emit('notification:badge', { unreadCount: 0 });
				}
			} catch (err) {
				console.error('Failed to emit real-time badge update on deleteAll:', err);
			}
		})();

		return { success: true };
	},

	async create(payload) {
		const doc = await repository.create(payload);

		// Dispatch real-time socket events
		(async () => {
			try {
				const socketBootstrap = require('../../bootstrap/socket.bootstrap');
				const io = socketBootstrap.getIO();
				if (io) {
					const populated = await repository.findById(doc._id);
					if (populated) {
						const mapper = require('./notifications.mapper');
						const dto = mapper.toNotificationDto(populated);
						const recipientId = payload.recipientId || payload.userId;

						io.to(String(recipientId)).emit('notification:new', dto);

						const unreadCount = await repository.countUnread(recipientId);
						io.to(String(recipientId)).emit('notification:badge', { unreadCount });
					}
				}
			} catch (socketErr) {
				console.error('Failed to dispatch real-time socket notification:', socketErr);
			}
		})();

		// Dispatch push notification in the background
		(async () => {
			try {
				const User = require('../../../database/models/user.model');
				const recipientId = payload.recipientId || payload.userId;
				const user = await User.findById(recipientId, 'pushToken pushEnabled').lean();
				if (user && user.pushToken && user.pushEnabled !== false) {
					const expoClient = require('../../integrations/push/expo.client');
					await expoClient.sendPushNotification(
						user.pushToken,
						payload.title || 'GlUnity',
						payload.body || payload.message,
						payload.metadata || {}
					);
				}
			} catch (err) {
				console.error('Failed to send push notification background event:', err);
			}
		})();
		return doc;
	},
};

module.exports = notificationsService;

