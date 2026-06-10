'use strict';

const { Router } = require('express');
const auth                  = require('../../common/middleware/auth.middleware');
const controller            = require('./channels.controller');
const uploadController      = require('./upload.controller');
const readReceiptController = require('./read-receipt.controller');
const reelShareController   = require('./reel-share.controller');

// Messages sub-resource (cursor-based fetch, pin, unpin)
const messagesRoutes = require('../messages/messages.routes');

const router = Router();

// ── Channel endpoints ─────────────────────────────────────────────────────────

/**
 * GET /api/channels
 * List all channels the authenticated user belongs to, newest activity first.
 */
router.get('/', auth, controller.list);

/**
 * GET /api/channels/unread
 * Aggregation: unread message count per channel for the requesting user.
 * MUST be declared before /:id routes so Express doesn't match "unread" as an id.
 */
router.get('/unread', auth, readReceiptController.getUnreadCounts);

/**
 * POST /api/channels
 * Create a group channel.
 * Body: { name, description?, participantIds?: ObjectId[] }
 */
router.post('/', auth, controller.createGroup);

/**
 * POST /api/channels/dm
 * Get or create a DM with another user (idempotent).
 * Body: { targetUserId: ObjectId }
 * MUST be declared before /:id routes.
 */
router.post('/dm', auth, controller.getOrCreateDM);

/**
 * PATCH /api/channels/:id/participants/:uid/role
 * Change a participant role (admin/member). Caller must be owner or admin.
 */
router.patch('/:id/participants/:uid/role', auth, controller.changeRole);

/**
 * POST /api/channels/:id/upload
 * Upload a single media file (jpg, png, gif, webp, mp4, webm).
 * Multipart/form-data — field name: file, optional field: caption.
 * Max image 10 MB | Max video 50 MB.
 * Creates a Message with type='media' containing the attachment.
 */
router.post('/:id/upload', auth, ...uploadController.upload);

/**
 * POST /api/channels/:id/read
 * Mark the channel as read up to a specific message.
 * Body: { lastReadMsgId: ObjectId }
 */
router.post('/:id/read', auth, readReceiptController.markRead);

/**
 * POST /api/channels/:id/reels
 * Share a reel into a channel.
 * Body: { reelId: ObjectId, caption?: string }
 */
router.post('/:id/reels', auth, reelShareController.shareReel);

// ── Messages sub-resource ─────────────────────────────────────────────────────

/**
 * GET  /api/channels/:channelId/messages?cursor=<id>&limit=50&direction=before
 * POST /api/channels/:channelId/messages/:messageId/pin
 * DELETE /api/channels/:channelId/messages/:messageId/pin
 */
router.use('/:channelId/messages', messagesRoutes);

module.exports = router;
