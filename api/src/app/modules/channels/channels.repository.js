'use strict';

const Channel = require('../../../database/models/channel.model');
const Message = require('../../../database/models/message.model');

const channelsRepository = {
	findMany({ userId, limit = 50, skip = 0 } = {}) {
		const query = userId 
			? { $or: [{ isPrivate: { $ne: true } }, { participants: userId }] }
			: { isPrivate: { $ne: true } };
		return Channel.find(query)
			.limit(limit)
			.skip(skip)
			.lean();
	},

	findById(id) {
		return Channel.findById(id).lean();
	},

	findDirectChannel(user1Id, user2Id) {
		return Channel.findOne({
			isPrivate: true,
			participants: { $all: [user1Id, user2Id] }
		}).lean();
	},

	create(payload) {
		return Channel.create(payload);
	},

	update(id, payload) {
		return Channel.findByIdAndUpdate(id, { $set: payload }, { new: true }).lean();
	},

	findMessages(channelId, { limit = 50, skip = 0 } = {}) {
		return Message.find({ channelId })
			.populate('senderId', 'fullName avatar')
			.sort({ createdAt: 1 })
			.limit(limit)
			.skip(skip)
			.lean();
	},

	createMessage(payload) {
		return Message.create(payload);
	},
};

module.exports = channelsRepository;
