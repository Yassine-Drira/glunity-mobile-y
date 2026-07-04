'use strict';

function toNotificationDto(doc) {
	if (!doc) return null;
	const id = doc._id ? String(doc._id) : doc.id;
	
	const actor = doc.actorId || {};
	const reel = doc.reelId || {};
	const comment = doc.commentId || {};
	const reply = doc.replyId || {};

	return {
		id,
		userId: doc.recipientId ? String(doc.recipientId) : (doc.userId ? String(doc.userId) : null),
		recipientId: doc.recipientId ? String(doc.recipientId) : null,
		actorId: actor._id ? String(actor._id) : (doc.actorId ? String(doc.actorId) : null),
		actor: actor._id ? {
			id: String(actor._id),
			fullName: actor.fullName || 'User',
			avatarUrl: actor.avatar?.url || null
		} : null,
		reelId: reel._id ? String(reel._id) : (doc.reelId ? String(doc.reelId) : null),
		reel: reel._id ? {
			id: String(reel._id),
			thumbnailUrl: reel.thumbnailUrl || null
		} : null,
		commentId: comment._id ? String(comment._id) : (doc.commentId ? String(doc.commentId) : null),
		comment: comment._id ? {
			id: String(comment._id),
			text: comment.text || null
		} : null,
		replyId: reply._id ? String(reply._id) : (doc.replyId ? String(doc.replyId) : null),
		reply: reply._id ? {
			id: String(reply._id),
			text: reply.text || null
		} : null,
		type: doc.type,
		message: doc.message || doc.body || '',
		title: doc.title || (actor.fullName ? actor.fullName : 'GlUnity'),
		body: doc.body || doc.message || '',
		isRead: doc.isRead,
		readAt: doc.readAt ? doc.readAt.toISOString() : null,
		metadata: doc.metadata || {},
		createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
		updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
	};
}

module.exports = {
	toNotificationDto,
	toNotificationListResponse(items) {
		return {
			success: true,
			data: (items || []).map(toNotificationDto),
		};
	},
	toNotificationResponse(doc) {
		return {
			success: true,
			data: toNotificationDto(doc),
		};
	},
};
