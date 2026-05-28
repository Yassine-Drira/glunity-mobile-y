'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const badgeSchema = new Schema(
	{
		name: { type: String, required: true, unique: true, trim: true },
		description: { type: String, required: true, trim: true },
		icon: { type: String, required: true, default: 'award' },
		pointsRequired: { type: Number, default: 0 },
	},
	{
		timestamps: true,
		versionKey: false,
	}
);

const Badge = model('Badge', badgeSchema);
module.exports = Badge;
