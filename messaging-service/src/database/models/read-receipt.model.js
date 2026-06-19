'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const readReceiptSchema = new Schema(
  {
    channelId: {
      type:     Schema.Types.ObjectId,
      ref:      'Channel',
      required: true,
    },
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    /** The ObjectId of the latest message this user has read in the channel.
     *  Used to compute unread count:
     *    Message.countDocuments({ channelId, _id: { $gt: lastReadMsgId } })
     */
    lastReadMsgId: {
      type:     Schema.Types.ObjectId,
      ref:      'Message',
      required: true,
    },
    /** Wall-clock time when the read event was recorded.
     *  Allows "seen at HH:MM" delivery receipts on the client. */
    lastReadAt: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,   // createdAt, updatedAt for auditing
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

/**
 * PRIMARY UNIQUE CONSTRAINT
 * One read-receipt document per (channel, user) pair.
 * Uses upsert pattern in service layer: findOneAndUpdate with { upsert: true }.
 * This is the most-queried shape: "what's the last-read position of every
 * participant in channel X?"
 */
readReceiptSchema.index(
  { channelId: 1, userId: 1 },
  { unique: true, name: 'unique_receipt_per_channel_per_user' }
);

/**
 * USER-CENTRIC LOOKUP
 * "Fetch all channels and their read positions for user X" — used to build
 * the channel-list with unread badges.
 */
readReceiptSchema.index({ userId: 1, lastReadAt: -1 });

// ── Statics ───────────────────────────────────────────────────────────────────

/**
 * Upsert the read position for a single user in a channel.
 * Safe to call on every scroll/focus event; the unique index guarantees
 * at most one document per (channelId, userId).
 *
 * @param {ObjectId|string} channelId
 * @param {ObjectId|string} userId
 * @param {ObjectId|string} messageId  – the newest message the user has seen
 * @returns {Promise<ReadReceipt>}
 */
readReceiptSchema.statics.markRead = function (channelId, userId, messageId) {
  const now = new Date();
  return this.findOneAndUpdate(
    { channelId, userId },
    {
      $set: {
        lastReadMsgId: messageId,
        lastReadAt:    now,
      },
    },
    {
      upsert:         true,
      new:            true,
      setDefaultsOnInsert: true,
    }
  );
};

/**
 * Return unread message count for a user in a channel.
 * Delegates to Message model to keep cross-model logic in one place.
 *
 * @param {ObjectId|string} channelId
 * @param {ObjectId|string} userId
 * @returns {Promise<number>}
 */
readReceiptSchema.statics.getUnreadCount = async function (channelId, userId) {
  const Message = require('./message.model');
  const Channel = require('./channel.model');

  const channel = await Channel.findById(channelId).lean();
  const participant = channel?.participants?.find(p => p.userId.toString() === userId.toString());
  const clearedAt = participant?.clearedAt;

  const receipt = await this.findOne({ channelId, userId }).lean();

  const query = {
    channelId,
    deletedAt: { $in: [null, undefined] },
  };

  if (clearedAt) {
    query.createdAt = { $gt: clearedAt };
  }

  if (!receipt) {
    // User has never opened this channel — count all non-deleted messages.
    return Message.countDocuments(query);
  }

  query._id = { $gt: receipt.lastReadMsgId };
  return Message.countDocuments(query);
};

const ReadReceipt = model('ReadReceipt', readReceiptSchema);
module.exports = ReadReceipt;
