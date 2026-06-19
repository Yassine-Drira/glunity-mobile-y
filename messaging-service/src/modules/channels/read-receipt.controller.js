'use strict';

const asyncHandler       = require('../../common/utils/async-handler');
const readReceiptService = require('./read-receipt.service');

const readReceiptController = {

  // ── POST /api/channels/:id/read ──────────────────────────────────────────
  /**
   * Mark a channel as read up to a specific message.
   *
   * Body: { lastReadMsgId: ObjectId }
   *
   * Returns 200 with the updated read-receipt document.
   * The Socket.IO layer should emit a `receipt:updated` event to other
   * channel members AFTER calling this endpoint.
   */
  markRead: asyncHandler(async (req, res) => {
    const { id: channelId } = req.params;
    const { lastReadMsgId } = req.body;

    if (!lastReadMsgId) {
      const err = new Error('lastReadMsgId is required');
      err.status = 400;
      err.code   = 'VALIDATION_ERROR';
      throw err;
    }

    const receipt = await readReceiptService.markRead(
      channelId,
      req.user._id,
      lastReadMsgId
    );

    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('conversation:updated', {
        channelId: channelId.toString(),
        unreadCount: 0
      });
    }

    res.status(200).json({
      success: true,
      data: {
        channelId:     receipt.channelId.toString(),
        userId:        receipt.userId.toString(),
        lastReadMsgId: receipt.lastReadMsgId.toString(),
        lastReadAt:    receipt.lastReadAt,
      },
    });
  }),

  // ── GET /api/channels/unread ─────────────────────────────────────────────
  /**
   * Return unread message counts for all channels the user participates in.
   *
   * Response shape:
   * {
   *   success: true,
   *   data: [
   *     { channelId: '...', unreadCount: 12 },
   *     { channelId: '...', unreadCount: 0  },
   *     ...
   *   ]
   * }
   */
  getUnreadCounts: asyncHandler(async (req, res) => {
    const counts = await readReceiptService.getUnreadCounts(req.user._id);
    res.status(200).json({
      success: true,
      data:    counts,
    });
  }),
};

module.exports = readReceiptController;
