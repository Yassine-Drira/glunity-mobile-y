'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const reactionSchema = new Schema(
  {
    messageId: {
      type:     Schema.Types.ObjectId,
      ref:      'Message',
      required: true,
    },
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    /** Raw emoji character, e.g. '❤️', '👍', '😂'.
     *  Stored as a string; the client decides which emoji set to render. */
    emoji: {
      type:      String,
      required:  true,
      maxlength: [8, 'Emoji field cannot exceed 8 characters'],
      trim:      false, // don't trim — emoji can look like whitespace to some parsers
    },
  },
  {
    timestamps: true,   // createdAt useful for "first to react" analytics
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

/**
 * UNIQUE CONSTRAINT — one specific emoji per user per message.
 * Prevents duplicate reactions at the DB level (belt-and-suspenders over
 * the application-layer check).
 */
reactionSchema.index(
  { messageId: 1, userId: 1, emoji: 1 },
  { unique: true, name: 'unique_reaction_per_user_per_emoji' }
);

/**
 * MESSAGE REACTIONS LOOKUP
 * Covers: Reaction.find({ messageId }).populate('userId')
 * Used when fetching who reacted to a specific message.
 */
reactionSchema.index({ messageId: 1, emoji: 1 });

/**
 * USER REACTION HISTORY
 * Covers: Reaction.find({ userId, messageId }) — "did I already react?"
 */
reactionSchema.index({ userId: 1, messageId: 1 });

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * After a reaction is saved, bump the aggregated counter on the parent message.
 * This keeps Message.reactionCounts eventually-consistent with zero extra reads.
 */
reactionSchema.post('save', async function (doc) {
  try {
    const Message = require('./message.model');
    await Message.adjustReactionCount(doc.messageId, doc.emoji, +1);
  } catch (err) {
    // Non-critical — the Reaction row is the source of truth;
    // reactionCounts is a performance cache.
    console.error('[Reaction] post-save hook failed to update reactionCounts:', err.message);
  }
});

/**
 * After a reaction is removed, decrement the counter.
 * Uses findOneAndDelete so we have access to the deleted doc.
 */
reactionSchema.post('findOneAndDelete', async function (doc) {
  if (!doc) return;
  try {
    const Message = require('./message.model');
    await Message.adjustReactionCount(doc.messageId, doc.emoji, -1);
  } catch (err) {
    console.error('[Reaction] post-findOneAndDelete hook failed to update reactionCounts:', err.message);
  }
});

const Reaction = model('Reaction', reactionSchema);
module.exports = Reaction;
