'use strict';

const Event = require('../../../database/models/event.model');
const Registration = require('../../../database/models/registration.model');

const eventsRepository = {
	async findMany({ search, type, limit = 50, skip = 0, includeUnpublished = false } = {}) {
		// By default only return published events. Callers can set includeUnpublished=true to override.
		const query = {};
		if (!includeUnpublished) {
			query.isPublished = true;
			query.isCancelled = { $ne: true };
			query.status = { $ne: 'cancelled' };
		}
		if (search && String(search).trim()) query.$text = { $search: String(search).trim() };
		if (type && String(type).trim()) query.type = String(type).trim().toLowerCase();
		const pipeline = [
			{ $match: query },
			{ $sort: { startsAt: 1 } },
			{ $skip: skip },
			{ $limit: limit },
			{
				$lookup: {
					from: 'registrations',
					let: { eventId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$eventId', '$$eventId'] },
										{ $in: ['$status', ['WAITING_PAYMENT', 'waiting_payment', 'pending']] }
									]
								}
							}
						}
					],
					as: 'pendingRequests'
				}
			},
			{
				$addFields: {
					attendeesCount: { $size: { $ifNull: ['$attendees', []] } },
					pendingRequestsCount: { $size: '$pendingRequests' }
				}
			},
			{ $project: { attendees: 0, pendingRequests: 0 } },
		];

		const [items, total] = await Promise.all([
			Event.aggregate(pipeline),
			Event.countDocuments(query),
		]);
		return { items, total };
	},

	async findById(id) {
		const doc = await Event.findById(id).lean();
		if (doc) {
			doc.pendingRequestsCount = await Registration.countDocuments({
				eventId: id,
				status: { $in: ['WAITING_PAYMENT', 'waiting_payment', 'pending'] }
			});
		}
		return doc;
	},

	create(payload) {
		return Event.create(payload);
	},

	findByIdAndUpdateRemoved(eventId, update) {
		return Event.findByIdAndUpdate(eventId, { $set: update }, { returnDocument: 'after' }).lean();
	},

	join(eventId, userId) {
		return Event.findByIdAndUpdate(
			eventId,
			{ $addToSet: { attendees: userId } },
			{ returnDocument: 'after' }
		).lean();
	},

	leave(eventId, userId) {
		return Event.findByIdAndUpdate(
			eventId,
			{ $pull: { attendees: userId } },
			{ returnDocument: 'after' }
		).lean();
	},

	cancel(eventId) {
		return Event.findByIdAndUpdate(
			eventId,
			{ $set: { isPublished: false, isCancelled: true, status: 'cancelled' } },
			{ returnDocument: 'after' }
		).lean();
	},
};

module.exports = eventsRepository;
