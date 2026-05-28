'use strict';

const Channel = require('../../../database/models/channel.model');
const Message = require('../../../database/models/message.model');

const channelsRepository = {
	findMany({ limit = 50, skip = 0 } = {}) {
		return Channel.find()
			.limit(limit)
			.skip(skip)
			.lean();
	},

	findById(id) {
		return Channel.findById(id).lean();
	},

	create(payload) {
		return Channel.create(payload);
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
