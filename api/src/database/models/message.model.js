'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const messageSchema = new Schema(
	{
		channelId: { type: Types.ObjectId, ref: 'Channel', required: true, index: true },
		senderId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
		content: { type: String, required: true, trim: true },
	},
	{
		timestamps: true,
		versionKey: false,
	}
);

const Message = model('Message', messageSchema);
module.exports = Message;
