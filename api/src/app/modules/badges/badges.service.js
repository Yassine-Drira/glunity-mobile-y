'use strict';

const repository = require('./badges.repository');

const badgesService = {
	async list({ limit = 50, skip = 0 } = {}) {
		const items = await repository.findMany({ limit, skip });
		return { items };
	},

	async getById(id) {
		const badge = await repository.findById(id);
		if (!badge) {
			const error = new Error('Badge not found');
			error.status = 404;
			throw error;
		}
		return badge;
	},

	async create(payload) {
		return repository.create(payload);
	},
};

module.exports = badgesService;
