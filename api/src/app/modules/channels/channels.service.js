'use strict';

const repository = require('./channels.repository');

const channelsService = {
	async list({ limit = 50, skip = 0 } = {}) {
		const items = await repository.findMany({ limit, skip });
		return { items };
	},

	async getById(id) {
		const channel = await repository.findById(id);
		if (!channel) {
			const error = new Error('Channel not found');
			error.status = 404;
			throw error;
		}
		return channel;
	},

	async create(payload) {
		return repository.create(payload);
	},

	async listMessages(channelId, { limit = 50, skip = 0 } = {}) {
		const items = await repository.findMessages(channelId, { limit, skip });
		return { items };
	},

	async postMessage(payload) {
		const msg = await repository.createMessage(payload);
		return msg.populate('senderId', 'fullName avatar');
	},
};

module.exports = channelsService;
