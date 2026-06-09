'use strict';

const repository = require('./channels.repository');

const channelsService = {
	async list({ userId, limit = 50, skip = 0 } = {}) {
		const items = await repository.findMany({ userId, limit, skip });
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

	async getOrCreateDirectChannel(user1Id, user2Id) {
		let channel = await repository.findDirectChannel(user1Id, user2Id);
		if (!channel) {
			const User = require('../../../database/models/user.model');
			const [user1, user2] = await Promise.all([
				User.findById(user1Id),
				User.findById(user2Id)
			]);
			if (!user1 || !user2) {
				const error = new Error('User not found');
				error.status = 404;
				throw error;
			}
			const name = `DM-${[user1Id.toString(), user2Id.toString()].sort().join('-')}`;
			const description = `Direct Message between ${user1.fullName} and ${user2.fullName}`;
			
			channel = await repository.create({
				name,
				description,
				isPrivate: true,
				participants: [user1Id, user2Id]
			});
		}
		return channel;
	},

	async create(payload) {
		return repository.create(payload);
	},

	async update(id, payload) {
		// validate existence
		await this.getById(id);
		const updated = await repository.update(id, payload);
		return updated;
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
