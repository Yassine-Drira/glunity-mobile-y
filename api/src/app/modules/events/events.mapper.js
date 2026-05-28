'use strict';

function toEventDto(doc) {
	if (!doc) return null;
	const id = doc._id ? String(doc._id) : doc.id;
	return {
		id,
		title: doc.title,
		type: doc.type,
		description: doc.description || '',
		imageUrl: (doc.images && doc.images[0] && doc.images[0].url) || '',
		location: doc.location?.name || doc.location?.address || '',
		locationLat: doc.location?.lat,
		locationLng: doc.location?.lng,
		date: doc.startsAt ? doc.startsAt.toISOString() : '',
		startsAt: doc.startsAt,
		endsAt: doc.endsAt,
		organizer: doc.organizer || {},
		attendeesCount: (doc.attendees || []).length,
		attendees: (doc.attendees || []).map(a => (a && a._id) ? String(a._id) : String(a)),
		maxCapacity: doc.maxCapacity || 0,
		price: doc.price || 0,
		currency: doc.currency || 'USD',
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

module.exports = {
	toEventDto,
	toEventListResponse(items, total) {
		return { success: true, data: items.map(toEventDto), meta: { total, count: items.length } };
	},
	toEventResponse(doc) {
		return { success: true, data: toEventDto(doc) };
	},
};

