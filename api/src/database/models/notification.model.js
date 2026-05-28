'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const NOTIFICATION_TYPES = ['system', 'event', 'product', 'community'];

const notificationSchema = new Schema(
	{
		userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
		title: { type: String, required: true, trim: true },
		body: { type: String, required: true, trim: true },
		type: { type: String, enum: NOTIFICATION_TYPES, default: 'system', index: true },
		isRead: { type: Boolean, default: false, index: true },
		metadata: { type: Schema.Types.Mixed },
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: { virtuals: true, versionKey: false },
		toObject: { virtuals: true, versionKey: false },
	},
);

const Notification = model('Notification', notificationSchema);
module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
