'use strict';

const asyncHandler      = require('../../common/utils/async-handler');
const reelShareService  = require('./reel-share.service');
const messageMapper     = require('../messages/messages.mapper');

const reelShareController = {

  // ── POST /api/channels/:id/reels ─────────────────────────────────────────
  /**
   * Share a reel into a channel.
   *
   * Body: { reelId: ObjectId, caption?: string }
   *
   * Steps (delegated to service):
   *  1. Assert sender is a participant of the channel.
   *  2. Validate reelId exists and fetch metadata.
   *  3. Persist a Message with type='reel' and populated reelRef.
   *  4. Update Channel.lastMessage + messageCount.
   *
   * Response: 201 with the new message shape (consistent with GET messages).
   */
  shareReel: asyncHandler(async (req, res) => {
    const { id: channelId } = req.params;
    const { reelId, caption = '' } = req.body;

    if (!reelId) {
      const err = new Error('reelId is required');
      err.status = 400;
      err.code   = 'VALIDATION_ERROR';
      throw err;
    }

    const message = await reelShareService.shareReel(
      channelId,
      req.user._id,
      reelId,
      caption
    );

    res.status(201).json({
      success: true,
      data:    messageMapper.toMessageResponse(message),
    });
  }),
};

module.exports = reelShareController;
