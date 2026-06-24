'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const participantSchema = new Schema(
	{
		userId:     { type: Types.ObjectId, ref: 'User', required: true },
		role:       { type: String, enum: ['owner', 'admin', 'writer', 'member'], default: 'member' },
		muted:      { type: Boolean, default: false },
		muteOption: { type: String, enum: ['all', 'mute_1h', 'mute_8h', 'mute_24h', 'mute_indefinite'], default: 'all' },
		muteExpiresAt: { type: Date, default: null },
		lastReadAt: { type: Date, default: null },
		clearedAt:  { type: Date, default: null },
		deletedAt:  { type: Date, default: null },
	},
	{ _id: false }
);

const channelSchema = new Schema(
	{
		name:        { type: String, required: true, trim: true },   // unique index removed — groups may share names
		description: { type: String, default: '' },
		icon:        { type: String, default: 'chatbubbles-outline' },
		isPrivate:   { type: Boolean, default: false },
		type:        { type: String, enum: ['DM', 'direct', 'group', 'social', 'channel'], default: 'group' },
		coverImageUrl: { type: String, default: null },

		participants: [participantSchema],

		lastMessage: {
			messageId: { type: Types.ObjectId, ref: 'Message' },
			senderId:  { type: Types.ObjectId, ref: 'User' },
			senderName: String,
			content:   String,
			createdAt: Date,
		},

		pinnedMessages: [
			{
				messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
				pinnedAt:  { type: Date, default: Date.now },
				pinnedBy:  { type: Schema.Types.ObjectId, ref: 'User' }
			}
		],
		deletedAt: { type: Date, default: null },
	},
	{
		timestamps: true,
		versionKey: false,
	}
);

// Drop any legacy unique name index on startup (won't error if already absent)
channelSchema.on('index', () => {});

const Channel = model('Channel', channelSchema);

// Ensure the old unique index is gone after model registration
Channel.collection.dropIndex('name_1').catch(() => {});

module.exports = Channel;
