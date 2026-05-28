'use strict';

const Badge = require('../../../database/models/badge.model');

const badgesRepository = {
	findMany({ limit = 50, skip = 0 } = {}) {
		return Badge.find()
			.limit(limit)
			.skip(skip)
			.lean();
	},

	findById(id) {
		return Badge.findById(id).lean();
	},

	create(payload) {
		return Badge.create(payload);
	},
};

module.exports = badgesRepository;
