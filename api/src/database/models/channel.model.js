'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const channelSchema = new Schema(
	{
		name: { type: String, required: true, unique: true, trim: true },
		description: { type: String, default: '' },
		icon: { type: String, default: 'chatbubbles-outline' },
		isPrivate: { type: Boolean, default: false },
		participants: [{ type: Types.ObjectId, ref: 'User' }],
	},
	{
		timestamps: true,
		versionKey: false,
	}
);

const Channel = model('Channel', channelSchema);
module.exports = Channel;
