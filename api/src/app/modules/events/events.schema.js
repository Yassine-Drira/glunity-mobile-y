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
	body('startsAt').exists().isISO8601().toDate(),
	body('endsAt').optional().isISO8601().toDate(),
	body('location').optional().isObject(),
	body('location.name').optional().isString().isLength({ max: 200 }),
	body('location.address').optional().isString().isLength({ max: 300 }),
	body('location.city').optional().isString().isLength({ max: 80 }),
	body('location.country').optional().isString().isLength({ max: 80 }),
	body('maxCapacity').optional().isInt({ min: 0 }).toInt(),
	body('price').optional().isFloat({ min: 0 }).toFloat(),
];

const getEventSchema = [param('id').isMongoId().withMessage('Invalid event id')];

module.exports = {
	listEventsSchema,
	createEventSchema,
	getEventSchema,
};

