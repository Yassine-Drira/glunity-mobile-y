'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const NOTIFICATION_TYPES = [
	'system',
	'event',
	'product',
	'community',
	'achievement',
	'REEL_LIKE',
	'REEL_COMMENT',
	'REEL_SHARE',
	'COMMENT_LIKE',
	'COMMENT_REPLY'
];

const notificationSchema = new Schema(
	{
		recipientId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
		userId: { type: Types.ObjectId, ref: 'User', required: true, index: true }, // Keep for compatibility
		actorId: { type: Types.ObjectId, ref: 'User', default: null, index: true },
		reelId: { type: Types.ObjectId, ref: 'Reel', default: null, index: true },
		commentId: { type: Types.ObjectId, ref: 'ReelComment', default: null, index: true },
		replyId: { type: Types.ObjectId, ref: 'ReelComment', default: null, index: true },
		title: { type: String, required: true, trim: true },
		body: { type: String, required: true, trim: true },
		message: { type: String, trim: true },
		type: { type: String, enum: NOTIFICATION_TYPES, default: 'system', index: true },
		isRead: { type: Boolean, default: false, index: true },
		readAt: { type: Date, default: null },
		metadata: { type: Schema.Types.Mixed },
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: { virtuals: true, versionKey: false },
		toObject: { virtuals: true, versionKey: false },
	},
);

// Backward and forward compatibility middleware hook.
// Use promise-style middleware to stay compatible with Mongoose callback changes.
notificationSchema.pre('validate', function() {
	if (this.userId && !this.recipientId) {
		this.recipientId = this.userId;
	} else if (this.recipientId && !this.userId) {
		this.userId = this.recipientId;
	}
	if (this.message && !this.body) {
		this.body = this.message;
	} else if (this.body && !this.message) {
		this.message = this.body;
	}
	if (!this.title) {
		this.title = 'GlUnity';
	}
});

// Highly efficient index for paginated recipient retrieval
notificationSchema.index({ recipientId: 1, createdAt: -1 });

const Notification = model('Notification', notificationSchema);
module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

