'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const attachmentSchema = new Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video', 'document'], required: true },
  name: { type: String },
  size: { type: Number },
}, { _id: false });

const messageSchema = new Schema(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
    senderId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content:   { type: String, trim: true },
    type:      { type: String, enum: ['text', 'reel_share', 'system'], default: 'text' },
    attachments: [attachmentSchema],
    reelRef: {
      reelId: { type: String },
      thumbnailUrl: { type: String },
    },
    replyTo: {
      messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
      senderName: { type: String },
      preview: { type: String },
    },
    reactionCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    pinned:    { type: Boolean, default: false },
    editedAt:  { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// High-performance indexes:
// O(1) query for channel messaging history pagination (order by createdAt descending)
messageSchema.index({ channelId: 1, createdAt: -1 });

module.exports = model('Message', messageSchema);
