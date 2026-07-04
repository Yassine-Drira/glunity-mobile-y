'use strict';

const Reel = require('../../../database/models/reel.model');
const ReelLike = require('../../../database/models/reel-like.model');
const ReelComment = require('../../../database/models/reel-comment.model');
const ReelView = require('../../../database/models/reel-view.model');

const reelsRepository = {
	/**
	 * Fetch the ranked feed, sorted by trendingScore DESC.
	 * For author profile pages (authorId set) we keep chronological order.
	 *
	 * The last 20% of each page is filled with the most recently uploaded
	 * reels (createdAt DESC) to give new creators exposure even before they
	 * accumulate enough engagement to rise organically.
	 */
	async findFeed({ limit = 20, skip = 0, category, authorId } = {}) {
		const filter = { status: 'ready' };
		if (category && category !== 'all') {
			filter.category = category;
		}
		if (authorId) {
			filter.authorId = authorId;
		}

		// Author profile pages stay chronological while the general feed uses
		// the ranked+fresh blend and pagination logic.
		if (authorId) {
			return Reel.find(filter)
				.populate('authorId', 'fullName avatar profileType')
				.populate('taggedUsers', 'fullName avatar profileType')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean();
		}

		const totalCount = await Reel.countDocuments(filter);
		if (totalCount === 0) {
			return [];
		}

		const safeSkip = skip;
		let reels = await Reel.find(filter)
			.populate('authorId', 'fullName avatar profileType')
			.populate('taggedUsers', 'fullName avatar profileType')
			.sort({ createdAt: -1 })
			.skip(safeSkip)
			.limit(limit)
			.lean();

		// If we run out of fresh content, fill the remainder with additional
		// recent reels so the feed does not feel empty on deeper pages.
		if (reels.length < limit && totalCount > reels.length) {
			const needed = limit - reels.length;
			const extraReels = await Reel.find(filter)
				.populate('authorId', 'fullName avatar profileType')
				.populate('taggedUsers', 'fullName avatar profileType')
				.sort({ createdAt: -1 })
				.skip(safeSkip + limit)
				.limit(needed)
				.lean();
			reels = [...reels, ...extraReels];
		}

		// ── Ranked feed ──────────────────────────────────────────────────────
		// Allocate ~80 % of slots to ranked results, ~20 % to fresh uploads
		const rankedLimit = Math.max(1, Math.floor(limit * 0.8));
		const freshLimit  = limit - rankedLimit;

		const [ranked, fresh] = await Promise.all([
			Reel.find(filter)
				.populate('authorId', 'fullName avatar profileType')
				.sort({ trendingScore: -1 })
				.skip(skip)
				.limit(rankedLimit)
				.lean(),

			// Always pull from page 0 for the fresh slot so new uploads appear
			// even on deeper pages of the feed.
			Reel.find(filter)
				.populate('authorId', 'fullName avatar profileType')
				.sort({ createdAt: -1 })
				.limit(freshLimit)
				.lean(),
		]);

		// Merge: deduplicate fresh entries that already appear in ranked
		const seenIds = new Set(ranked.map(r => r._id.toString()));
		const uniqueFresh = fresh.filter(r => !seenIds.has(r._id.toString()));

		return [...ranked, ...uniqueFresh].slice(0, limit);
	},

	findById(id) {
		return Reel.findById(id)
			.populate('authorId', 'fullName avatar profileType')
			.populate('taggedUsers', 'fullName avatar profileType')
			.lean();
	},

	createReel(payload) {
		return Reel.create(payload);
	},

	updateReel(id, payload) {
		return Reel.findByIdAndUpdate(id, { $set: payload }, { new: true })
			.populate('authorId', 'fullName avatar profileType')
			.populate('taggedUsers', 'fullName avatar profileType')
			.lean();
	},

	/**
	 * Persist a freshly computed trending score.
	 * @param {string} reelId
	 * @param {number} score
	 */
	updateScore(reelId, score) {
		return Reel.findByIdAndUpdate(reelId, { $set: { trendingScore: score } });
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
		return ReelComment.find({
			reelId,
			$or: [
				{ parentCommentId: null },
				{ parentCommentId: { $exists: false } }
			]
		})
			.populate('userId', 'fullName avatar')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();
	},

	findReplies(reelId, parentCommentId, { limit = 50, skip = 0 } = {}) {
		return ReelComment.find({
			reelId,
			parentCommentId
		})
			.populate('userId', 'fullName avatar')
			.sort({ createdAt: 1 })
			.skip(skip)
			.limit(limit)
			.lean();
	},

	createComment(reelId, userId, text, parentCommentId = null) {
		return ReelComment.create({ reelId, userId, text, parentCommentId });
	},

	incrementComments(reelId, amount) {
		return Reel.findByIdAndUpdate(reelId, { $inc: { commentsCount: amount } }, { new: true });
	},

	/**
	 * Increment view count. Returns the updated reel document.
	 */
	incrementViews(reelId) {
		return Reel.findByIdAndUpdate(reelId, { $inc: { viewsCount: 1 } }, { new: true });
	},

	incrementShares(reelId) {
		return Reel.findByIdAndUpdate(reelId, { $inc: { sharesCount: 1 } }, { new: true });
	},

	// ── View deduplication helpers ────────────────────────────────────────────

	/**
	 * Returns true if the given userId has already generated a view for this
	 * reel within the last 24 hours (determined by the TTL-indexed ReelView
	 * collection).
	 * @param {string} reelId
	 * @param {string} userId
	 * @returns {Promise<boolean>}
	 */
	async hasViewedToday(reelId, userId) {
		if (!userId) return false; // anonymous — always allow
		const exists = await ReelView.exists({ reelId, userId });
		return !!exists;
	},

	/**
	 * Record a view event. The TTL index on ReelView will auto-purge this
	 * document after 24 hours, resetting the per-user quota.
	 */
	recordViewEvent(reelId, userId) {
		if (!userId) return Promise.resolve(); // no dedup for anonymous
		return ReelView.create({ reelId, userId });
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

