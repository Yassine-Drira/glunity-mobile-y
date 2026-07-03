'use strict';

/**
 * reels.scoring.js
 *
 * Pure, side-effect-free ranking formula for the reels feed.
 *
 * Score formula (as specified):
 *
 *   score = (views * 0.25) + (likes * 3) + (comments * 5) + freshnessBoost
 *
 * Freshness boost:
 *   freshnessBoost = max(0, 100 - hoursSinceUpload)
 *
 * Trending score (time-decay prevents old viral videos from staying top forever):
 *   trendingScore = (engagementScore + freshnessBoost) / (daysSinceUpload + 2)^1.5
 */

/**
 * Returns hours elapsed since a given date.
 * @param {Date|string} createdAt
 * @returns {number}
 */
function hoursSince(createdAt) {
	return (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
}

/**
 * Returns days elapsed since a given date.
 * @param {Date|string} createdAt
 * @returns {number}
 */
function daysSince(createdAt) {
	return (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
}

/**
 * Freshness boost: full 100 points for brand-new content, decays to 0
 * after 100 hours (~4 days).
 * @param {Date|string} createdAt
 * @returns {number}  value in [0, 100]
 */
function freshnessBoost(createdAt) {
	return Math.max(0, 100 - hoursSince(createdAt));
}

/**
 * Raw engagement score (before time decay).
 * Weights:
 *   view    = 0.25  (passive signal)
 *   like    = 3     (active approval)
 *   share   = 2     (distribution intent — between like and comment)
 *   comment = 5     (highest intent — user spent time writing)
 * @param {number} views
 * @param {number} likes
 * @param {number} shares
 * @param {number} comments
 * @returns {number}
 */
function engagementScore(views, likes, shares, comments) {
	return views * 0.25 + likes * 3 + shares * 2 + comments * 5;
}

/**
 * Full trending score with time decay.
 * Older videos are penalised by a power-law denominator so they slowly
 * sink unless they keep receiving engagement.
 *
 * @param {{ viewsCount: number, likesCount: number, sharesCount: number, commentsCount: number, createdAt: Date|string }} reel
 * @returns {number}
 */
function computeTrendingScore(reel) {
	const engagement = engagementScore(
		reel.viewsCount    || 0,
		reel.likesCount    || 0,
		reel.sharesCount   || 0,
		reel.commentsCount || 0
	);
	const freshness = freshnessBoost(reel.createdAt);
	const decay     = Math.pow(daysSince(reel.createdAt) + 2, 1.5);
	return (engagement + freshness) / decay;
}

module.exports = {
	computeTrendingScore,
	engagementScore,
	freshnessBoost,
	hoursSince,
	daysSince,
};
