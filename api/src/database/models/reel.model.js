'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const reelSchema = new Schema(
	{
		authorId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
		videoUrl: { type: String, required: true }, // CDN HLS (.m3u8) or MP4 URL
		thumbnailUrl: { type: String, required: true }, // Video preview poster URL
		caption: { type: String, trim: true, default: '' },
		duration: { type: Number, default: 0 }, // Video length in seconds
		viewsCount: { type: Number, default: 0 },
		likesCount: { type: Number, default: 0 },
		commentsCount: { type: Number, default: 0 },
		sharesCount: { type: Number, default: 0 },
		savedCount: { type: Number, default: 0 }, // How many users saved this reel
		// ── Ranking ──────────────────────────────────────────────────────────────
		// Pre-computed trending score. Recomputed after every interaction so that
		// the feed query is a simple sort — no in-query arithmetic.
		trendingScore: { type: Number, default: 0, index: true },
		status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'ready', index: true },
		category: { type: String, enum: ['all', 'recipes', 'tips', 'products', 'lifestyle'], default: 'all', index: true },
		channelRef: { type: Types.ObjectId, ref: 'Channel', default: null, index: true },
		taggedUsers: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
		audioTitle: { type: String, default: null },
		audioArtist: { type: String, default: null },
		audioUrl: { type: String, default: null },
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// ── Indexes for ranked feed queries ─────────────────────────────────────────
// Primary: global feed ordered by trendingScore
reelSchema.index({ status: 1, trendingScore: -1 });
// Category-scoped feed
reelSchema.index({ status: 1, category: 1, trendingScore: -1 });
// Author profile — always chronological
reelSchema.index({ status: 1, authorId: 1, createdAt: -1 });
// Keep the old date index so profile pages still work efficiently
reelSchema.index({ status: 1, createdAt: -1 });

const Reel = model('Reel', reelSchema);
module.exports = Reel;
