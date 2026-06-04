'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const EVENT_TYPES = ['meetup', 'class', 'webinar', 'market', 'other'];

const eventSchema = new Schema(
	{
		title: { type: String, required: true, trim: true, maxlength: 200 },
		type: { type: String, enum: EVENT_TYPES, default: 'other', index: true },
		description: { type: String, trim: true, default: '' },
		// Basic date/time fields
		startsAt: { type: Date, required: true, index: true },
		endsAt: { type: Date },
		// Location: simple representation for now
		location: {
			name: { type: String, trim: true, default: '' },
			address: { type: String, trim: true, default: '' },
			city: { type: String, trim: true, default: '' },
			country: { type: String, trim: true, default: '' },
			lat: { type: Number },
			lng: { type: Number },
		},
		organizer: {
			name: { type: String, trim: true, default: '' },
			contact: { type: String, trim: true, default: '' },
			organizerId: { type: Types.ObjectId, ref: 'User' },
		},
		attendees: [{ type: Types.ObjectId, ref: 'User' }],
		maxCapacity: { type: Number, default: 0 },
		price: { type: Number, default: 0 },
		currency: { type: String, trim: true, default: 'TND' },
		images: [
			{
				url: { type: String, trim: true },
				publicId: { type: String, trim: true },
			},
		],
		isPublished: { type: Boolean, default: true, index: true },
		createdBy: { type: Types.ObjectId, ref: 'User' },
		// Finished state: event has already happened but kept for a short retention window
		isFinished: { type: Boolean, default: false, index: true },
		finishedAt: { type: Date },
		// Soft-remove metadata (event is never hard-deleted)
		removedBy: { type: Types.ObjectId, ref: 'User' },
		removedAt: { type: Date },
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: { virtuals: true, versionKey: false },
		toObject: { virtuals: true, versionKey: false },
	},
);

eventSchema.index({ title: 'text', 'location.name': 'text', 'description': 'text' });
eventSchema.index({ isPublished: 1, startsAt: 1, type: 1 });

const Event = model('Event', eventSchema);
module.exports = Event;
module.exports.EVENT_TYPES = EVENT_TYPES;
