'use strict';

/**
 * Read-Receipt Service — messaging-service
 *
 * Owns two responsibilities:
 *  1. markRead  – upsert the user's read position in a channel
 *  2. unreadCounts – MongoDB aggregation that returns unread message
 *     counts per channel for the authenticated user
 */

const mongoose    = require('mongoose');
const Channel     = require('../../database/models/channel.model');
const Message     = require('../../database/models/message.model');
const ReadReceipt = require('../../database/models/read-receipt.model');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createError(msg, status, code) {
  const err = new Error(msg);
  err.status = status;
  if (code) err.code = code;
  return err;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

const readReceiptService = {

  // ── POST /api/channels/:id/read ──────────────────────────────────────────
  /**
   * Upsert the read position for the authenticated user in a channel.
   *
   * Idempotent — safe to call on every scroll/focus event from the client.
   * Only advances the pointer forward (ignores requests where the supplied
   * messageId is older than the current lastReadMsgId).
   *
   * @param {string|ObjectId} channelId
   * @param {string|ObjectId} userId
   * @param {string|ObjectId} lastReadMsgId – the newest message the user has seen
   * @returns {Promise<ReadReceipt>}
   */
  async markRead(channelId, userId, lastReadMsgId) {
    if (!mongoose.Types.ObjectId.isValid(String(channelId))) {
      throw createError('Invalid channelId', 400, 'VALIDATION_ERROR');
    }
    if (!mongoose.Types.ObjectId.isValid(String(lastReadMsgId))) {
      throw createError('lastReadMsgId must be a valid message ObjectId', 400, 'VALIDATION_ERROR');
    }

    // Verify the message belongs to this channel (prevents poisoning the receipt)
    const msgExists = await Message.exists({
      _id: lastReadMsgId,
      channelId,
      deletedAt: null,
    });
    if (!msgExists) {
      throw createError('Message not found in this channel', 404, 'NOT_FOUND');
    }

    // Only advance the pointer — never move it backwards
    return ReadReceipt.findOneAndUpdate(
      { channelId, userId },
      [
        {
          $set: {
            lastReadMsgId: {
              $cond: {
                if: {
                  $or: [
                    { $eq: ['$lastReadMsgId', null] },
                    { $gt: [new mongoose.Types.ObjectId(String(lastReadMsgId)), '$lastReadMsgId'] },
                  ],
                },
                then: new mongoose.Types.ObjectId(String(lastReadMsgId)),
                else: '$lastReadMsgId',
              },
            },
            lastReadAt: {
              $cond: {
                if: {
                  $or: [
                    { $eq: ['$lastReadMsgId', null] },
                    { $gt: [new mongoose.Types.ObjectId(String(lastReadMsgId)), '$lastReadMsgId'] },
                  ],
                },
                then: new Date(),
                else: '$lastReadAt',
              },
            },
          },
        },
      ],
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  },

  // ── GET /api/channels/unread ─────────────────────────────────────────────
  /**
   * Return the unread message count for every channel the user participates in.
   *
   * Pipeline:
   *  1. Find all channels the user is a participant of.
   *  2. Left-join ReadReceipt to get the user's last-read position.
   *  3. Count non-deleted messages in each channel with _id > lastReadMsgId.
   *     When no receipt exists, all messages in the channel are unread.
   *  4. Project to { channelId, unreadCount }.
   *
   * Uses the (channelId, createdAt: -1) index on Message via the $lookup
   * pipeline stage's match, so the count scan is bounded by channel.
   *
   * @param {string|ObjectId} userId
   * @returns {Promise<Array<{ channelId: string, unreadCount: number }>>}
   */
  async getUnreadCounts(userId) {
    const userObjId = new mongoose.Types.ObjectId(String(userId));

    const results = await Channel.aggregate([
      // ── Stage 1: channels where user is a participant ──────────────────
      {
        $match: {
          'participants.userId': userObjId,
          deletedAt: null,
        },
      },
      { $project: { _id: 1 } },

      // ── Stage 2: left-join the user's read receipt ─────────────────────
      {
        $lookup: {
          from:     'readreceipts',
          let:      { channelId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$channelId', '$$channelId'] },
                    { $eq: ['$userId',    userObjId]    },
                  ],
                },
              },
            },
            { $limit: 1 },
            { $project: { lastReadMsgId: 1 } },
          ],
          as: 'receipt',
        },
      },
      {
        $addFields: {
          lastReadMsgId: { $arrayElemAt: ['$receipt.lastReadMsgId', 0] },
        },
      },

      // ── Stage 3: count unread messages per channel ─────────────────────
      {
        $lookup: {
          from:     'messages',
          let:      { channelId: '$_id', lastRead: '$lastReadMsgId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$channelId', '$$channelId'] },
                    { $eq: ['$deletedAt', null]          },
                    // When no receipt exists (lastRead = undefined/null)
                    // ALL messages are unread → skip the _id filter.
                    {
                      $cond: {
                        if:   { $ifNull: ['$$lastRead', false] },
                        then: { $gt: ['$_id', '$$lastRead'] },
                        else: true,
                      },
                    },
                  ],
                },
              },
            },
            { $count: 'n' },
          ],
          as: 'unreadResult',
        },
      },

      // ── Stage 4: project clean output ──────────────────────────────────
      {
        $project: {
          _id:         0,
          channelId:   { $toString: '$_id' },
          unreadCount: {
            $ifNull: [{ $arrayElemAt: ['$unreadResult.n', 0] }, 0],
          },
        },
      },
    ]);

    return results;
  },
};

module.exports = readReceiptService;
