'use strict';

const Notification = require('../../../database/models/notification.model');

const notificationsRepository = {
	findManyByUser(userId, { limit = 50, skip = 0 } = {}) {
		return Notification.find({ $or: [{ userId }, { recipientId: userId }], isArchived: { $ne: true } })
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
			{ $or: [{ userId }, { recipientId: userId }], isRead: false },
			{ $set: { isRead: true } }
		);
	},

	archive(id, userId) {
		return Notification.findOneAndUpdate(
			{ _id: id, $or: [{ userId }, { recipientId: userId }] },
			{ $set: { isArchived: true } },
			{ returnDocument: 'after' }
		)
		.populate('actorId', 'fullName avatar')
		.populate('reelId', 'thumbnailUrl')
		.populate('commentId', 'text')
		.populate('replyId', 'text')
		.lean();
	},

	archiveAll(userId) {
		return Notification.updateMany(
			{ $or: [{ userId }, { recipientId: userId }], isArchived: { $ne: true } },
			{ $set: { isArchived: true } }
		);
	},

	delete(id, userId) {
		return Notification.findOneAndDelete({ _id: id, $or: [{ userId }, { recipientId: userId }] });
	},

	deleteAll(userId) {
		return Notification.deleteMany({ $or: [{ userId }, { recipientId: userId }] });
	},

	countUnread(recipientId) {
		return Notification.countDocuments({
			$or: [{ userId: recipientId }, { recipientId }],
			isRead: false,
			isArchived: { $ne: true }
		});
	},
};

module.exports = notificationsRepository;

