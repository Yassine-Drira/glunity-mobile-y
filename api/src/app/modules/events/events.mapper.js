'use strict';

function toEventDto(doc) {
	if (!doc) return null;
	const id = doc._id ? String(doc._id) : doc.id;
	const attendeesCount = typeof doc.attendeesCount === 'number'
		? doc.attendeesCount
		: (doc.attendees || []).length;
	return {
		id,
		title: doc.title,
		type: doc.type,
		description: doc.description || '',
		imageUrl: (doc.images && doc.images[0] && doc.images[0].url) || '',
		createdBy: doc.createdBy ? (doc.createdBy._id ? String(doc.createdBy._id) : String(doc.createdBy)) : undefined,
		location: doc.location?.name || doc.location?.address || '',
		locationLat: doc.location?.lat,
		locationLng: doc.location?.lng,
		date: doc.startsAt ? doc.startsAt.toISOString() : '',
		startsAt: doc.startsAt,
		endsAt: doc.endsAt,
		organizer: doc.organizer || {},
		attendeesCount,
		pendingRequestsCount: doc.pendingRequestsCount || 0,
		attendees: Array.isArray(doc.attendees)
			? doc.attendees.map(a => (a && a._id) ? String(a._id) : String(a))
			: [],
		maxCapacity: doc.maxCapacity || 0,
		price: doc.price || 0,
		currency: doc.currency || 'TND',
		isCancelled: doc.isCancelled || false,
		status: doc.status || 'active',
		format: doc.format || 'presentiel',
		meetingUrl: doc.meetingUrl || '',
		platform: doc.platform || '',
		accessCode: doc.accessCode || '',
		instructions: doc.instructions || '',
		parkingInfo: doc.parkingInfo || '',
		ticketName: doc.ticketName || '',
		ticketDescription: doc.ticketDescription || '',
		maxTicketsPerParticipant: doc.maxTicketsPerParticipant,
		salesStart: doc.salesStart,
		salesEnd: doc.salesEnd,
		refundPolicy: doc.refundPolicy || '',
		paymentMethod: doc.paymentMethod || 'online',
		payPlaceName: doc.payPlaceName || '',
		payAddress: doc.payAddress || '',
		payCity: doc.payCity || '',
		payCountry: doc.payCountry || '',
		payLat: doc.payLat,
		payLng: doc.payLng,
		payInstructions: doc.payInstructions || '',
		payDeadline: doc.payDeadline,
		locationDetails: doc.location || { name: '', address: '', city: '', country: '', lat: null, lng: null },
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

