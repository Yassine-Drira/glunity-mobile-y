'use strict';

function toNotificationDto(doc) {
	if (!doc) return null;
	const id = doc._id ? String(doc._id) : doc.id;
	return {
		id,
		userId: doc.userId ? String(doc.userId) : null,
		title: doc.title,
		body: doc.body,
		type: doc.type,
		isRead: doc.isRead,
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
