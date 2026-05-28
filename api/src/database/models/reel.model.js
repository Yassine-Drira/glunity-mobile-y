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
		likedBy: [{ type: Types.ObjectId, ref: 'User' }],
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// Virtual property to dynamically compute total likes
reelSchema.virtual('likeCount').get(function() {
	return this.likedBy ? this.likedBy.length : 0;
});

const Reel = model('Reel', reelSchema);
module.exports = Reel;
