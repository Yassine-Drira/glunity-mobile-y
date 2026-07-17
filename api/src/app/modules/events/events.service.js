'use strict';

const repo = require('./events.repository');
const AppError = require('../../common/errors/app-error');
const notificationsService = require('../notifications/notifications.service');

const User = require('../../../database/models/user.model');
const Notification = require('../../../database/models/notification.model');
const Registration = require('../../../database/models/registration.model');

// In-memory query cache for events
const listCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCachedList(query) {
	const key = JSON.stringify(query);
	if (listCache.has(key)) {
		const cached = listCache.get(key);
		if (Date.now() - cached.timestamp < CACHE_TTL) {
			return cached.data;
		}
		listCache.delete(key);
	}
	return null;
}

function setCachedList(query, data) {
	const key = JSON.stringify(query);
	listCache.set(key, { data, timestamp: Date.now() });
}

function clearCache() {
	listCache.clear();
}

const eventsService = {
	async list(query) {
		const cached = getCachedList(query);
		if (cached) return cached;

		const { items, total } = await repo.findMany(query);
		const result = { items, total };
		setCachedList(query, result);
		return result;
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

		clearCache();
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
		clearCache();
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

		clearCache();
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

		clearCache();
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

		clearCache();
		return updated;
	},

	// ── Registration Services ──────────────────────────────────────────────────
	async registerAttendee(eventId, userId, dto) {
		const doc = await repo.findById(eventId);
		if (!doc) throw AppError.notFound('Event');

		const form = dto.registrationForm || dto;
		const { firstName, lastName, email, phone, gender, dateOfBirth, address, city, country, notes } = form;
		
		if (!firstName || !lastName || !email || !phone || !gender) {
			throw AppError.badRequest('Required fields: First Name, Last Name, Email, Phone, Gender');
		}

		// Enforce unique phone per event check
		const existingReg = await Registration.findOne({
			eventId,
			phone: phone.trim()
		});
		if (existingReg) {
			throw AppError.badRequest('This phone number is already registered for this event.');
		}

		// Every participant can register for only one ticket per event
		const finalTicketCount = 1;
		
		const attendeesCount = (doc.attendees || []).length;
		if (doc.maxCapacity && attendeesCount + finalTicketCount > doc.maxCapacity) {
			throw AppError.badRequest('Not enough spots available');
		}

		let status = 'APPROVED';
		let paymentMethod = undefined;
		if (doc.price > 0) {
			status = 'WAITING_PAYMENT';
			paymentMethod = doc.paymentMethod || 'presentiel';
		}

		const cleanForm = {
			firstName,
			lastName,
			email,
			phone: phone.trim(),
			gender,
			dateOfBirth: dateOfBirth || '',
			address: address || '',
			city: city || '',
			country: country || '',
			ticketCount: finalTicketCount,
			notes: notes || ''
		};

		const reg = await Registration.create({
			eventId,
			userId,
			fullName: `${firstName} ${lastName}`,
			email,
			phone,
			ticketsCount: finalTicketCount,
			ticketCount: finalTicketCount,
			notes: notes || '',
			status,
			paymentMethod,
			registrationForm: cleanForm
		});

		const organizerId = doc.organizer && doc.organizer.organizerId ? doc.organizer.organizerId : doc.createdBy;

		if (status === 'APPROVED') {
			await repo.join(eventId, userId);
			try {
				await notificationsService.create({
					userId,
					title: `Registration Approved! 🎉`,
					body: `Your registration for "${cleanForm.firstName} ${cleanForm.lastName}" has been approved.`,
					type: 'event',
					metadata: { eventId, registrationId: String(reg._id), kind: 'joined' },
				});
			} catch (e) {}
		} else {
			// Notify organizer about new request
			try {
				await notificationsService.create({
					userId: organizerId,
					title: `Event Registration Requests 🔔`,
					body: `${cleanForm.firstName} ${cleanForm.lastName} requested to join "${doc.title}".`,
					type: 'registration_request',
					metadata: { eventId, registrationId: String(reg._id), kind: 'pending' },
				});
			} catch (e) {}

			// Notify user registration submitted
			try {
				await notificationsService.create({
					userId,
					title: `Registration submitted successfully.`,
					body: `Waiting for organizer approval.`,
					type: 'event',
					metadata: { eventId, registrationId: String(reg._id), kind: 'submitted' },
				});
			} catch (e) {}
		}

		// Emit socket events to update counts/badges in real-time
		const io = require('../../bootstrap/socket.bootstrap').getIO();
		if (io) {
			io.to(String(organizerId)).emit('registration:change', { eventId, status });
			io.to(String(userId)).emit('registration:change', { eventId, status });
		}

		clearCache();
		return reg;
	},

	async getRegistrations(eventId, userId) {
		const doc = await repo.findById(eventId);
		if (!doc) throw AppError.notFound('Event');
		
		const organizerId = doc.organizer && doc.organizer.organizerId ? String(doc.organizer.organizerId) : String(doc.createdBy);
		if (String(userId) !== organizerId) {
			throw AppError.forbidden('Only the event organizer can view registrations');
		}

		return Registration.find({ eventId }).populate('userId', 'fullName avatar email phone').sort({ createdAt: -1 }).lean();
	},

	async getRegistrationDetails(eventId, regId, userId) {
		const doc = await repo.findById(eventId);
		if (!doc) throw AppError.notFound('Event');
		
		const organizerId = doc.organizer && doc.organizer.organizerId ? String(doc.organizer.organizerId) : String(doc.createdBy);
		const reg = await Registration.findById(regId).populate('userId', 'fullName avatar email phone').lean();
		if (!reg) throw AppError.notFound('Registration');

		if (String(userId) !== organizerId && String(userId) !== String(reg.userId)) {
			throw AppError.forbidden('Not authorized to view this registration');
		}

		return reg;
	},

	async getMyRegistration(eventId, userId) {
		return Registration.findOne({ eventId, userId }).lean();
	},

	async approveRegistration(regId, userId) {
		const reg = await Registration.findById(regId);
		if (!reg) throw AppError.notFound('Registration');

		const doc = await repo.findById(reg.eventId);
		if (!doc) throw AppError.notFound('Event');

		const organizerId = doc.organizer && doc.organizer.organizerId ? String(doc.organizer.organizerId) : String(doc.createdBy);
		if (String(userId) !== organizerId) {
			throw AppError.forbidden('Only the event organizer can approve registrations');
		}

		reg.status = 'APPROVED';
		reg.paidAt = new Date();
		reg.approvedAt = new Date();
		reg.approvedBy = userId;
		await reg.save();

		await repo.join(reg.eventId, reg.userId);

		try {
			await notificationsService.create({
				userId: reg.userId,
				title: `Registration approved.`,
				body: `Your registration has been approved.`,
				type: 'event',
				metadata: { eventId: String(doc._id), kind: 'confirmed' },
			});
		} catch (e) {}

		// Emit socket update
		const io = require('../../bootstrap/socket.bootstrap').getIO();
		if (io) {
			io.to(String(reg.userId)).emit('registration:change', { eventId: String(doc._id), status: 'APPROVED' });
			io.to(String(organizerId)).emit('registration:change', { eventId: String(doc._id), status: 'APPROVED' });
		}

		clearCache();
		return reg;
	},

	async rejectRegistration(regId, userId, reason) {
		const reg = await Registration.findById(regId);
		if (!reg) throw AppError.notFound('Registration');

		const doc = await repo.findById(reg.eventId);
		if (!doc) throw AppError.notFound('Event');

		const organizerId = doc.organizer && doc.organizer.organizerId ? String(doc.organizer.organizerId) : String(doc.createdBy);
		if (String(userId) !== organizerId) {
			throw AppError.forbidden('Only the event organizer can reject registrations');
		}

		reg.status = 'REJECTED';
		reg.rejectedReason = reason || '';
		await reg.save();

		try {
			await notificationsService.create({
				userId: reg.userId,
				title: `Registration rejected.`,
				body: `Your registration has been rejected.`,
				type: 'event',
				metadata: { eventId: String(doc._id), kind: 'rejected', reason },
			});
		} catch (e) {}

		// Emit socket update
		const io = require('../../bootstrap/socket.bootstrap').getIO();
		if (io) {
			io.to(String(reg.userId)).emit('registration:change', { eventId: String(doc._id), status: 'REJECTED' });
			io.to(String(organizerId)).emit('registration:change', { eventId: String(doc._id), status: 'REJECTED' });
		}

		clearCache();
		return reg;
	},

	async confirmRegistration(regId, userId) {
		return this.approveRegistration(regId, userId);
	},

	async cancelRegistration(regId, userId) {
		const reg = await Registration.findById(regId);
		if (!reg) throw AppError.notFound('Registration');

		const doc = await repo.findById(reg.eventId);
		if (!doc) throw AppError.notFound('Event');

		const organizerId = doc.organizer && doc.organizer.organizerId ? String(doc.organizer.organizerId) : String(doc.createdBy);
		const isAttendee = String(userId) === String(reg.userId);
		const isOrganizer = String(userId) === organizerId;

		if (!isAttendee && !isOrganizer) {
			throw AppError.forbidden('Not allowed to cancel this registration');
		}

		reg.status = 'CANCELLED';
		await reg.save();

		await repo.leave(reg.eventId, reg.userId);

		try {
			if (isOrganizer) {
				await notificationsService.create({
					userId: reg.userId,
					title: `Registration Cancelled`,
					body: `Your registration for ${doc.title} has been cancelled by the organizer.`,
					type: 'event',
					metadata: { eventId: String(doc._id), kind: 'cancelled' },
				});
			} else {
				await notificationsService.create({
					userId: organizerId,
					title: `Attendee Cancelled`,
					body: `${reg.fullName} has cancelled their registration for ${doc.title}.`,
					type: 'event',
					metadata: { eventId: String(doc._id), kind: 'cancelled' },
				});
			}
		} catch (e) {}

		// Emit socket update
		const io = require('../../bootstrap/socket.bootstrap').getIO();
		if (io) {
			io.to(String(reg.userId)).emit('registration:change', { eventId: String(doc._id), status: 'CANCELLED' });
			io.to(String(organizerId)).emit('registration:change', { eventId: String(doc._id), status: 'CANCELLED' });
		}

		clearCache();
		return reg;
	},

	async getOwnerRegistrationNotifications(userId) {
		const Event = require('../../../database/models/event.model');
		const ownerEvents = await Event.find({
			$or: [
				{ 'organizer.organizerId': userId },
				{ createdBy: userId }
			],
			isPublished: true,
			isCancelled: false
		}).lean();

		const eventIds = ownerEvents.map(e => e._id);

		const regs = await Registration.find({
			eventId: { $in: eventIds },
			status: { $in: ['WAITING_PAYMENT', 'waiting_payment'] }
		})
		.populate('userId', 'fullName avatar')
		.sort({ createdAt: -1 })
		.lean();

		const groupedMap = new Map();
		for (const reg of regs) {
			const evId = String(reg.eventId);
			if (!groupedMap.has(evId)) {
				groupedMap.set(evId, []);
			}
			groupedMap.get(evId).push(reg);
		}

		const result = [];
		for (const ev of ownerEvents) {
			const evId = String(ev._id);
			const eventRegs = groupedMap.get(evId) || [];
			if (eventRegs.length > 0) {
				result.push({
					eventId: evId,
					title: ev.title,
					coverImage: ev.images && ev.images[0] ? ev.images[0].url : (ev.imageUrl || ''),
					startsAt: ev.startsAt,
					pendingCount: eventRegs.length,
					pendingUsers: eventRegs.map(r => ({
						registrationId: r._id,
						userId: r.userId?._id,
						fullName: r.userId?.fullName || r.fullName,
						avatarUrl: r.userId?.avatar?.url || '',
						createdAt: r.createdAt
					}))
				});
			}
		}

		return result;
	},

	async getOwnerStats(userId) {
		const Event = require('../../../database/models/event.model');
		const ownerEvents = await Event.find({
			$or: [
				{ 'organizer.organizerId': userId },
				{ createdBy: userId }
			]
		}).lean();

		const eventIds = ownerEvents.map(e => e._id);

		const upcomingEventsCount = ownerEvents.filter(e => !e.isCancelled && !e.isFinished && new Date(e.startsAt) >= new Date()).length;

		const allRegs = await Registration.find({ eventId: { $in: eventIds } }).lean();

		const pendingRegistrationsCount = allRegs.filter(r => r.status === 'WAITING_PAYMENT' || r.status === 'waiting_payment').length;
		const approvedParticipantsCount = allRegs.filter(r => r.status === 'APPROVED' || r.status === 'confirmed').length;
		const rejectedRequestsCount = allRegs.filter(r => r.status === 'REJECTED' || r.status === 'cancelled').length;

		return {
			upcomingEvents: upcomingEventsCount,
			pendingRegistrations: pendingRegistrationsCount,
			approvedParticipants: approvedParticipantsCount,
			rejectedRequests: rejectedRequestsCount,
			revenue: 0
		};
	},
};

module.exports = eventsService;
