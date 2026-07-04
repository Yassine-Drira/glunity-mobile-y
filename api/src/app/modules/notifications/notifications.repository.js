'use strict';

const Notification = require('../../../database/models/notification.model');

const notificationsRepository = {
	findManyByUser(userId, { limit = 50, skip = 0 } = {}) {
		return Notification.find({ $or: [{ userId }, { recipientId: userId }] })
			.populate('actorId', 'fullName avatar')
			.populate('reelId', 'thumbnailUrl')
			.populate('commentId', 'text')
			.populate('replyId', 'text')
			.sort({ createdAt: -1 })
			.limit(limit)
			.skip(skip)
			.lean();
	},

	findById(id) {
		return Notification.findById(id)
			.populate('actorId', 'fullName avatar')
			.populate('reelId', 'thumbnailUrl')
			.populate('commentId', 'text')
			.populate('replyId', 'text')
			.lean();
	},

	create(payload) {
		return Notification.create(payload);
	},

	markAsRead(id, userId) {
		return Notification.findOneAndUpdate(
			{ _id: id, $or: [{ userId }, { recipientId: userId }] },
			{ $set: { isRead: true, readAt: new Date() } },
			{ returnDocument: 'after' }
		)
		.populate('actorId', 'fullName avatar')
		.populate('reelId', 'thumbnailUrl')
		.populate('commentId', 'text')
		.populate('replyId', 'text')
		.lean();
	},

	markAllAsRead(userId) {
		return Notification.updateMany(
			{ userId, isRead: false },
			{ $set: { isRead: true } }
		);
	},

	delete(id, userId) {
		return Notification.findOneAndDelete({ _id: id, userId });
	},

	deleteAll(userId) {
		return Notification.deleteMany({ $or: [{ userId }, { recipientId: userId }] });
	},

	countUnread(recipientId) {
		return Notification.countDocuments({
			$or: [{ userId: recipientId }, { recipientId }],
			isRead: false
		});
	},
};

module.exports = notificationsRepository;

