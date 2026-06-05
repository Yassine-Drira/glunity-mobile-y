'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const participantSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
  muted: { type: Boolean, default: false },
  lastReadAt: { type: Date, default: Date.now },
}, { _id: false });

const channelSchema = new Schema(
  {
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ['direct', 'group', 'social'], default: 'direct' },
    participants: [participantSchema],
    lastMessage: {
      messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      senderName: String,
      content: String,
      createdAt: Date,
    },
    createdById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = model('Channel', channelSchema);
