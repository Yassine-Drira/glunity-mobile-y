'use strict';

const repo = require('./events.repository');
const AppError = require('../../common/errors/app-error');
const notificationsService = require('../notifications/notifications.service');

const User = require('../../../database/models/user.model');
const Notification = require('../../../database/models/notification.model');

const eventsService = {
	async list(query) {
		const { items, total } = await repo.findMany(query);
		return { items, total };
	},

	async getById(id) {
		const doc = await repo.findById(id);
		if (!doc) throw AppError.notFound('Event');
		return doc;
	},

	async create(payload, userId) {
		// Normalize incoming imageUrl into images array so the mapper can read images[0].url
		const images = [];
		if (payload && payload.imageUrl) images.push({ url: payload.imageUrl });
		const createPayload = { ...payload, images: images.length ? images : payload.images || undefined, createdBy: userId || undefined };
		const doc = await repo.create(createPayload);
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

		// Create a notification for the user who joined
		try {
			await notificationsService.create({
				userId,
				title: `You're going: ${doc.title}`,
				body: `You've successfully joined ${doc.title}. See you there!`,
				type: 'event',
				metadata: { eventId: eventId, kind: 'joined' },
			});
		} catch (err) {
			// Don't block the join if notification fails — just log and continue
			/* eslint-disable no-console */
			console.warn('Failed to create join notification', err && err.message);
			/* eslint-enable no-console */
		}
		return updated;
	},

	async cancel(eventId, userId) {
		const doc = await repo.findById(eventId);
		if (!doc) throw AppError.notFound('Event');
		// Only organizer or creator can cancel
		const organizerId = doc.organizer && doc.organizer.organizerId ? String(doc.organizer.organizerId) : String(doc.createdBy);
		if (userId && String(userId) !== organizerId) {
			throw AppError.forbidden('Not allowed to cancel this event');
		}

		const updated = await repo.cancel(eventId);
		if (!updated) throw AppError.notFound('Event');

		// Notify all attendees about cancellation
		const attendees = Array.isArray(updated.attendees) ? updated.attendees : [];
		for (const attendeeId of attendees) {
			try {
				await notificationsService.create({
					userId: attendeeId,
					title: `Event cancelled: ${updated.title}`,
					body: `We're sorry — "${updated.title}" has been cancelled.`,
					type: 'event',
					metadata: { eventId: eventId, kind: 'cancelled' },
				});
			} catch (err) {
				console.warn('Failed to create cancellation notification', err && err.message);
			}
		}

		return updated;
	},

	async remove(eventId, userId, userProfileType) {
		const doc = await repo.findById(eventId);
		if (!doc) throw AppError.notFound('Event');
		// Only organizer/creator or pro_commerce or admin can remove
		const organizerId = doc.organizer && doc.organizer.organizerId ? String(doc.organizer.organizerId) : String(doc.createdBy);
		if (userId && String(userId) !== organizerId && userProfileType !== 'pro_commerce' && userProfileType !== 'admin') {
			throw AppError.forbidden('Not allowed to remove this event');
		}

		// Soft-remove: set isPublished false and record remover
		const updated = await repo.findByIdAndUpdateRemoved(eventId, { removedBy: userId, removedAt: new Date(), isPublished: false, isCancelled: true, status: 'cancelled' });
		if (!updated) throw AppError.notFound('Event');

		// Notify all attendees about removal
		const attendees = Array.isArray(updated.attendees) ? updated.attendees : [];
		for (const attendeeId of attendees) {
			try {
				await notificationsService.create({
					userId: attendeeId,
					title: `Event removed: ${updated.title}`,
					body: `The event "${updated.title}" was removed by the organizer. Check other upcoming events in the app.`,
					type: 'event',
					metadata: { eventId: eventId, kind: 'removed' },
				});
			} catch (err) {
				console.warn('Failed to create removal notification', err && err.message);
			}
		}

		return updated;
	},

	async leave(eventId, userId) {
		const doc = await repo.findById(eventId);
		if (!doc) throw AppError.notFound('Event');
		const updated = await repo.leave(eventId, userId);
		if (!updated) throw AppError.notFound('Event');

		// Create a "sad" notification for the user who left
		try {
			await notificationsService.create({
				userId,
				title: `You cancelled: ${doc.title}`,
				body: `Sad to see you cancel your spot at ${doc.title}. We hope to see you next time!`,
				type: 'event',
				metadata: { eventId: eventId, kind: 'left' },
			});
		} catch (err) {
			console.warn('Failed to create leave notification', err && err.message);
		}

		// Notify organizer that a user left (non-blocking)
		try {
			const organizerId = doc.organizer && doc.organizer.organizerId ? doc.organizer.organizerId : doc.createdBy;
			if (organizerId) {
				await notificationsService.create({
					userId: organizerId,
					title: `Attendee left: ${doc.title}`,
					body: `A user has cancelled their attendance for ${doc.title}.`,
					type: 'event',
					metadata: { eventId: eventId, kind: 'attendee_left', attendeeId: userId },
				});
			}
		} catch (err) {
			console.warn('Failed to notify organizer about leave', err && err.message);
		}

		return updated;
	},
};

module.exports = eventsService;
