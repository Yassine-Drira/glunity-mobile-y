'use strict';

const EventEmitter = require('events');
const notificationEmitter = new EventEmitter();

// Require dependencies at the top to avoid dynamic requires in hot paths
const socketBootstrap = require('../../bootstrap/socket.bootstrap');
const expoClient = require('../../integrations/push/expo.client');
const User = require('../../../database/models/user.model');
const repository = require('./notifications.repository');
const mapper = require('./notifications.mapper');

// Helper to reliably emit socket events to a user
async function emitSocketToUser(userId, eventName, payload) {
	try {
		const io = socketBootstrap.getIO();
		if (io) {
			io.to(String(userId)).emit(eventName, payload);
		}
	} catch (err) {
		console.error(`Failed to emit socket event ${eventName} to user ${userId}:`, err);
	}
}

// ── Notification Created ──────────────────────────────────────────────────
notificationEmitter.on('notification:created', async ({ doc, payload }) => {
	const recipientId = payload.recipientId || payload.userId;

	// 1. Dispatch real-time socket events
	try {
		const populated = await repository.findById(doc._id);
		if (populated) {
			const dto = mapper.toNotificationDto(populated);
			await emitSocketToUser(recipientId, 'notification:new', dto);
			const unreadCount = await repository.countUnread(recipientId);
			await emitSocketToUser(recipientId, 'notification:badge', { unreadCount });
		}
	} catch (socketErr) {
		console.error('Failed to dispatch real-time socket notification:', socketErr);
	}

	// 2. Dispatch push notification in the background
	try {
		const user = await User.findById(recipientId, 'pushToken pushEnabled').lean();
		if (user && user.pushToken && user.pushEnabled !== false) {
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
});

// ── Notification Badge Update ──────────────────────────────────────────────
notificationEmitter.on('notification:badgeUpdate', async ({ userId, unreadCount }) => {
	try {
		// If unreadCount is explicitly passed (e.g. 0), use it. Otherwise, count it.
		const count = unreadCount !== undefined ? unreadCount : await repository.countUnread(userId);
		await emitSocketToUser(userId, 'notification:badge', { unreadCount: count });
	} catch (err) {
		console.error('Failed to update notification badge:', err);
	}
});

module.exports = notificationEmitter;
