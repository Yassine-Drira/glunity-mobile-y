'use strict';

const Reel = require('../../../database/models/reel.model');
const ReelLike = require('../../../database/models/reel-like.model');
const ReelComment = require('../../../database/models/reel-comment.model');

const reelsRepository = {
	async findFeed({ limit = 10, skip = 0, category, authorId } = {}) {
		const filter = { status: 'ready' };
		if (category && category !== 'all') {
			filter.category = category;
		}
		if (authorId) {
			filter.authorId = authorId;
		}
		
		const totalCount = await Reel.countDocuments(filter);
		if (totalCount === 0) {
			return [];
		}
		
		const safeSkip = authorId ? skip : (skip % totalCount);
		
		let reels = await Reel.find(filter)
			.populate('authorId', 'fullName avatar profileType')
			.sort(authorId ? { createdAt: -1 } : { viewsCount: -1, createdAt: -1 })
			.skip(safeSkip)
			.limit(limit)
			.lean();
			
		// If we run out of new feed, repeat already seen reels (only for general feed, not author profile)
		if (!authorId && reels.length < limit && totalCount > reels.length) {
			const needed = limit - reels.length;
			const extraReels = await Reel.find(filter)
				.populate('authorId', 'fullName avatar profileType')
				.sort({ viewsCount: -1, createdAt: -1 })
				.limit(needed)
				.lean();
				
			const existingIds = new Set(reels.map(r => r._id.toString()));
			for (const extra of extraReels) {
				if (!existingIds.has(extra._id.toString()) && reels.length < limit) {
					reels.push(extra);
				}
			}
		}
		
		return reels;
	},

	findById(id) {
		return Reel.findById(id)
			.populate('authorId', 'fullName avatar profileType')
			.lean();
	},

	createReel(payload) {
		return Reel.create(payload);
	},

	updateReel(id, payload) {
		return Reel.findByIdAndUpdate(id, { $set: payload }, { new: true })
			.populate('authorId', 'fullName avatar profileType')
			.lean();
	},

	deleteReel(id) {
		return Reel.findByIdAndDelete(id);
	},

	findLike(reelId, userId) {
		return ReelLike.findOne({ reelId, userId }).lean();
	},

	createLike(reelId, userId) {
		return ReelLike.create({ reelId, userId });
	},

	deleteLike(reelId, userId) {
		return ReelLike.findOneAndDelete({ reelId, userId });
	},

	incrementLikes(reelId, amount) {
		return Reel.findByIdAndUpdate(reelId, { $inc: { likesCount: amount } }, { new: true });
	},

	findComments(reelId, { limit = 50, skip = 0 } = {}) {
		return ReelComment.find({ reelId })
			.populate('userId', 'fullName avatar')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();
	},

	createComment(reelId, userId, text) {
		return ReelComment.create({ reelId, userId, text });
	},

	incrementComments(reelId, amount) {
		return Reel.findByIdAndUpdate(reelId, { $inc: { commentsCount: amount } }, { new: true });
	},

	incrementViews(reelId) {
		return Reel.findByIdAndUpdate(reelId, { $inc: { viewsCount: 1 } }, { new: true });
	},

	incrementShares(reelId) {
		return Reel.findByIdAndUpdate(reelId, { $inc: { sharesCount: 1 } }, { new: true });
	},

	async hasLiked(reelId, userId) {
		const likeExists = await ReelLike.exists({ reelId, userId });
		return !!likeExists;
	},

	async hasLikedMany(reelIds, userId) {
		if (!userId || !reelIds.length) return {};
		const likes = await ReelLike.find({
			reelId: { $in: reelIds },
			userId: userId
		}).select('reelId').lean();
		
		const likesMap = {};
		likes.forEach(like => {
			likesMap[like.reelId.toString()] = true;
		});
		return likesMap;
	}
};

module.exports = reelsRepository;
