'use strict';

const Event = require('../../../database/models/event.model');

const eventsRepository = {
	findMany({ search, type, limit = 50, skip = 0 } = {}) {
		const query = {};
		if (search && String(search).trim()) query.$text = { $search: String(search).trim() };
		if (type && String(type).trim()) query.type = String(type).trim().toLowerCase();
		return Event.find(query).sort({ startsAt: 1 }).limit(limit).skip(skip).lean();
	},

	findById(id) {
		return Event.findById(id).lean();
	},

	create(payload) {
		return Event.create(payload);
	},

	join(eventId, userId) {
		return Event.findByIdAndUpdate(
			eventId,
			{ $addToSet: { attendees: userId } },
			{ new: true }
		).lean();
	},

	leave(eventId, userId) {
		return Event.findByIdAndUpdate(
			eventId,
			{ $pull: { attendees: userId } },
			{ new: true }
		).lean();
	},
};

module.exports = eventsRepository;
