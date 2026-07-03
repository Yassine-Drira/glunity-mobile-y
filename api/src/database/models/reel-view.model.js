'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

/**
 * ReelView — tracks individual view events for deduplication.
 *
 * A record is created when an authenticated user successfully triggers
 * a view (>=3 s watch time, enforced on the client). The TTL index
 * automatically removes records after 24 hours, which resets the
 * per-user-per-reel view quota so the same user can generate a new
 * view the next day.
 *
 * Anonymous views (userId = null) are always counted and are not
 * deduplicated (no identity available).
 */
const reelViewSchema = new Schema(
	{
		reelId:   { type: Types.ObjectId, ref: 'Reel',  required: true, index: true },
		userId:   { type: Types.ObjectId, ref: 'User',  default: null,  index: true },
		viewedAt: { type: Date, default: Date.now },
	},
	{
		versionKey: false,
		timestamps: false,
	}
);

// Compound index — fast existence check for deduplication
reelViewSchema.index({ reelId: 1, userId: 1 });

// TTL index — Mongo automatically purges documents 24 hours after viewedAt
reelViewSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 86400 });

const ReelView = model('ReelView', reelViewSchema);
module.exports = ReelView;
