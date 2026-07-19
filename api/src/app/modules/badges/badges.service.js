'use strict';

const repository = require('./badges.repository');
const User = require('../../../database/models/user.model');
const Badge = require('../../../database/models/badge.model');
const notificationsService = require('../notifications/notifications.service');

const badgesService = {
	async list({ limit = 50, skip = 0 } = {}) {
		const items = await repository.findMany({ limit, skip });
		return { items };
	},

	async getById(id) {
		const badge = await repository.findById(id);
		if (!badge) {
			const error = new Error('Badge not found');
			error.status = 404;
			throw error;
		}
		return badge;
	},

	async create(payload) {
		return repository.create(payload);
	},

	async awardPointsAndCheckBadges(userId, pointsToAdd) {
		const user = await User.findById(userId);
		if (!user) return null;

		user.points = (user.points || 0) + pointsToAdd;

		// Fetch all seeded badges
		const allBadges = await Badge.find();
		
		// Find badges the user qualifies for but doesn't already have
		const earnedBadgeIds = (user.badges || []).map(b => b.toString());
		const newBadgesToAward = [];

		for (const badge of allBadges) {
			if (user.points >= badge.pointsRequired && !earnedBadgeIds.includes(badge._id.toString())) {
				newBadgesToAward.push(badge);
			}
		}

		if (newBadgesToAward.length > 0) {
			for (const badge of newBadgesToAward) {
				user.badges.push(badge._id);
				
				// Create notification for the user
				await notificationsService.create({
					userId: user._id,
					title: `New Badge Unlocked: ${badge.name}! 🛡️`,
					body: `Congratulations! You unlocked the "${badge.name}" badge. ${badge.description}`,
					type: 'achievement',
					isRead: false,
					metadata: {
						badgeId: badge._id.toString(),
						badgeName: badge.name,
						badgeIcon: badge.icon,
						pointsRequired: badge.pointsRequired
					}
				});
			}
		}

		await user.save();
		return user;
	},
};

module.exports = badgesService;
