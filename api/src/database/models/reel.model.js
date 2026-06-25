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
		status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'ready', index: true },
		category: { type: String, enum: ['all', 'recipes', 'tips', 'products', 'lifestyle'], default: 'all', index: true },
		channelRef: { type: Types.ObjectId, ref: 'Channel', default: null, index: true },
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

// Index compound for performant paginated feed queries
reelSchema.index({ status: 1, createdAt: -1 });

const Reel = model('Reel', reelSchema);
module.exports = Reel;
