'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const messageSchema = new Schema(
  {
    channelId: { type: Types.ObjectId, ref: 'Channel', required: true, index: true },
    senderId:  { type: Types.ObjectId, ref: 'User',    required: true, index: true },
    content:   { type: String, trim: true, default: '' },
    type:      {
      type: String,
      enum: ['text', 'media', 'reel', 'system'],
      default: 'text',
    },

    // ── Media attachments ──────────────────────────────────────────────────
    attachments: [
      {
        url:       { type: String, required: true },
        type:      { type: String, enum: ['image', 'video', 'file', 'audio'], required: true },
        filename:  String,
        size:      Number,          // bytes
        thumbnail: String,          // pre-generated thumbnail URL
        duration:  Number,          // seconds (video/reel only)
      },
    ],

    // ── Reel share reference ───────────────────────────────────────────────
    reelRef: {
      reelId:       { type: Types.ObjectId },
      thumbnailUrl: String,
      title:        String,
      duration:     Number,
      ownerName:    String,
      ownerAvatar:  String,
      isDeleted:    { type: Boolean, default: false },
    },

    // ── Reply threading ────────────────────────────────────────────────────
    replyTo: {
      messageId:  { type: Types.ObjectId, ref: 'Message' },
      senderId:   { type: Types.ObjectId, ref: 'User' },
      senderName: String,
      preview:    String,           // first 80 chars of the parent message
    },

    // ── Aggregated reaction counts  e.g. { "❤️": 5, "👍": 3 } ─────────────
    reactionCounts: {
      type: Map,
      of:   Number,
      default: {},
    },

    // ── Lifecycle metadata ─────────────────────────────────────────────────
    editedAt:  { type: Date, default: null },
    deletedAt: { type: Date, default: null },   // soft delete
  },
  { timestamps: true, versionKey: false }
);

// Cursor-based pagination index (newest-first)
messageSchema.index({ channelId: 1, createdAt: -1 });
// Allow filtering out deleted messages efficiently
messageSchema.index({ deletedAt: 1 });

const Message = model('Message', messageSchema);
module.exports = Message;
