"use strict";

const { body, query, param } = require('express-validator');
const { EVENT_TYPES } = require('../../../database/models/event.model');

const listEventsSchema = [
	query('search').optional().isString().isLength({ max: 200 }),
	query('type').optional().isIn(EVENT_TYPES).withMessage(`type must be one of: ${EVENT_TYPES.join(', ')}`),
	query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
	query('skip').optional().isInt({ min: 0 }).toInt(),
];

const createEventSchema = [
	body('title').isString().trim().isLength({ min: 2, max: 200 }),
	body('type').optional().isIn(EVENT_TYPES),
	body('description').optional().isString().isLength({ max: 2000 }),
	// imageUrl can be a remote URL or a data URI (base64) coming from mobile client.
	// Allow larger payloads to accommodate base64 images from mobile clients.
	body('imageUrl')
		.optional()
		.isString().withMessage('imageUrl must be a string')
		.isLength({ max: 10000000 }).withMessage('imageUrl is too long')
		.custom((v) => {
			if (!v) return true;
			if (typeof v !== 'string') return false;
			if (v.startsWith('data:')) return true; // allow data URIs (base64)
			try {
				new URL(v);
				return true;
			} catch (e) {
				return false;
			}
		}).withMessage('imageUrl must be a valid URL or data URI'),
	body('startsAt').exists().isISO8601().toDate().custom((val) => {
		// startsAt must be in the future
		const dt = new Date(val);
		if (isNaN(dt.getTime())) return false;
		return dt.getTime() > Date.now();
	}).withMessage('startsAt must be a future date/time'),
	body('endsAt').optional().isISO8601().toDate(),
	body('location').optional().isObject(),
	body('location.name').optional().isString().isLength({ max: 200 }),
	body('location.address').optional().isString().isLength({ max: 300 }),
	body('location.city').optional().isString().isLength({ max: 80 }),
	body('location.country').optional().isString().isLength({ max: 80 }),
	body('location.lat').optional().isFloat().toFloat(),
	body('location.lng').optional().isFloat().toFloat(),
	body('maxCapacity').optional().isInt({ min: 0 }).toInt(),
	body('price').optional().isFloat({ min: 0 }).toFloat(),
];

const getEventSchema = [param('id').isMongoId().withMessage('Invalid event id')];

module.exports = {
	listEventsSchema,
	createEventSchema,
	getEventSchema,
};

