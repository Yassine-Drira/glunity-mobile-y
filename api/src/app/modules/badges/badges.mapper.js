'use strict';

const toBadgeResponse = (badge) => {
	if (!badge) return null;
	return {
		id: badge._id || badge.id,
		name: badge.name,
		description: badge.description,
		icon: badge.icon,
		pointsRequired: badge.pointsRequired,
	};
};

const toBadgeListResponse = (badges) => {
	return {
		success: true,
		data: badges.map(toBadgeResponse),
	};
};

module.exports = {
	toBadgeResponse,
	toBadgeListResponse,
};
