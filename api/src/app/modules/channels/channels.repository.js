'use strict';

const Channel = require('../../../database/models/channel.model');
const Message = require('../../../database/models/message.model');

const channelsRepository = {
	findMany({ userId, limit = 50, skip = 0 } = {}) {
		const query = userId
			? {
					$and: [
						{ deletedAt: { $in: [null, undefined] } },
						{
							$or: [
								{ isPrivate: { $ne: true } },
								{
									participants: {
										$elemMatch: {
											userId: userId,
											deletedAt: { $in: [null, undefined] }
										}
									}
								}
							]
						}
					]
				}
			: { isPrivate: { $ne: true }, deletedAt: { $in: [null, undefined] } };
		return Channel.find(query)
			.populate({
				path: 'pinnedMessages.messageId',
				select: 'content senderId createdAt',
				populate: { path: 'senderId', select: 'fullName avatar' }
			})
			.sort({ 'lastMessage.createdAt': -1, updatedAt: -1 })
			.limit(limit)
			.skip(skip)
			.lean();
	},

	findById(id) {
		return Channel.findOne({ _id: id, deletedAt: { $in: [null, undefined] } })
			.populate({
				path: 'pinnedMessages.messageId',
				select: 'content senderId createdAt',
				populate: { path: 'senderId', select: 'fullName avatar' }
			})
			.lean();
	},

	findDirectChannel(user1Id, user2Id) {
		return Channel.findOne({
			isPrivate: true,
			'participants.userId': { $all: [user1Id, user2Id] },
			deletedAt: { $in: [null, undefined] }
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
