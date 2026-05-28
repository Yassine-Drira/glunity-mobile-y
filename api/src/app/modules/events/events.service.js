'use strict';

const repo = require('./events.repository');
const AppError = require('../../common/errors/app-error');

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
		return doc.toObject();
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
