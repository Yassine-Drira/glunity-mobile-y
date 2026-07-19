'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['image', 'video', 'file', 'audio'],
      required: true,
    },
    filename: { type: String },
    size: { type: Number },          // bytes
    thumbnail: { type: String },          // pre-generated thumbnail URL
    duration: { type: Number },          // seconds (video / audio only)
    mimeType: { type: String },
  },
  { _id: false }
);

const reelRefSchema = new Schema(
  {
    reelId: { type: Schema.Types.ObjectId },
    thumbnailUrl: { type: String },
    title: { type: String, maxlength: 200 },
    duration: { type: Number },
    ownerName: { type: String },
    ownerAvatar: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { _id: false }
);

const replyToSchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String },
    /** First ~80 characters of the parent message, for inline preview. */
    preview: { type: String, maxlength: 100 },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────

const messageSchema = new Schema(
  {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Up to 4 000 characters of UTF-8 text (emoji-safe). */
    content: {
      type: String,
      trim: true,
      default: '',
      maxlength: [4000, 'Message content cannot exceed 4000 characters'],
    },

    type: {
      type: String,
      enum: ['text', 'media', 'reel', 'system'],
      default: 'text',
    },

    // ── Media ──────────────────────────────────────────────────────────────
    attachments: { type: [attachmentSchema], default: [] },

    // ── Reel share ─────────────────────────────────────────────────────────
    reelRef: { type: reelRefSchema, default: null },

    // ── Reply thread ───────────────────────────────────────────────────────
    replyTo: { type: replyToSchema, default: null },

    // ── Aggregated reactions { "❤️": 5, "👍": 3 } ──────────────────────────
    /** Updated atomically via Reaction model hooks (findOneAndUpdate + $inc).
     *  Avoids a real-time aggregate query on every render. */
    reactionCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    // ── Lifecycle ──────────────────────────────────────────────────────────
    pinned: { type: Boolean, default: false, index: true },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },   // null = not deleted (soft delete)
  },
  {
    timestamps: true,   // adds createdAt, updatedAt
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

/**
 * PRIMARY QUERY INDEX — cursor-based pagination (newest first).
 * Covers: Message.find({ channelId }).sort({ createdAt: -1 }).limit(N)
 * This is the most-hit query in any messaging system.
 */
messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ channelId: 1, _id: -1 });
messageSchema.index({ channelId: 1, createdAt: -1, _id: -1 });

/**
 * SOFT-DELETE FILTER
 * Allows the driver to use a partial index scan when filtering out deleted
 * messages. The sparse flag keeps it small (only documents with deletedAt ≠ null).
 */
messageSchema.index({ deletedAt: 1 }, { sparse: true, name: 'deletedAt_sparse_1' });

/**
 * PINNED MESSAGES LOOKUP
 * Supports: Message.find({ channelId, pinned: true })
 */
messageSchema.index({ channelId: 1, pinned: 1 }, { sparse: true });

/**
 * SENDER-LEVEL QUERIES
 * "Show me all messages sent by user X in channel Y" (moderation / analytics).
 */
messageSchema.index({ senderId: 1, channelId: 1, createdAt: -1 });

/**
 * REEL REFERENCE LOOKUP
 * Find messages that share a specific reel.
 */
messageSchema.index({ 'reelRef.reelId': 1 }, { sparse: true });

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Validate content requirement.
 * A message must have EITHER content OR at least one attachment OR a reelRef.
 *
 * Uses async/throw style (Mongoose 9 recommended) instead of the legacy
 * callback-style `function(next)` which can leave `next` undefined when
 * called from an async context, causing "next is not a function" errors.
 */
messageSchema.pre('validate', async function () {
  const hasContent = this.content && this.content.trim().length > 0;
  const hasAttachment = this.attachments && this.attachments.length > 0;
  const hasReel = this.reelRef && this.reelRef.reelId;
  const isSystemMsg = this.type === 'system';

  if (!hasContent && !hasAttachment && !hasReel && !isSystemMsg) {
    throw new Error('A message must contain content, at least one attachment, or a reel reference');
  }
});

// ── Virtual: isDeleted ────────────────────────────────────────────────────────

messageSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null && this.deletedAt !== undefined;
});

messageSchema.virtual('isEdited').get(function () {
  return this.editedAt !== null && this.editedAt !== undefined;
});

// ── Statics ───────────────────────────────────────────────────────────────────

/**
 * Atomically increment / decrement an emoji reaction counter.
 * Called by the Reaction model's post-save / post-delete hook.
 *
 * @param {ObjectId} messageId
 * @param {string}   emoji      – raw emoji character, e.g. '❤️'
 * @param {number}   delta      – +1 when added, -1 when removed
 */
messageSchema.statics.adjustReactionCount = function (messageId, emoji, delta) {
  const key = `reactionCounts.${emoji}`;
  return this.findByIdAndUpdate(
    messageId,
    { $inc: { [key]: delta } },
    { returnDocument: 'after' }
  );
};

const Message = model('Message', messageSchema);
module.exports = Message;
