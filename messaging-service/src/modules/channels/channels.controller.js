'use strict';

const service      = require('./channels.service');
const mapper       = require('./channels.mapper');
const asyncHandler = require('../../common/utils/async-handler');

const channelsController = {

  // ── GET /api/channels ──────────────────────────────────────────────────────
  /**
   * Returns all channels the authenticated user participates in,
   * sorted by most recent activity.
   */
  list: asyncHandler(async (req, res) => {
    const channels = await service.listForUser(req.user._id);
    res.status(200).json(mapper.toChannelListResponse(channels, req.user._id));
  }),

  // ── POST /api/channels ─────────────────────────────────────────────────────
  /**
   * Create a new group channel.
   *
   * Body: { name: string, description?: string, participantIds?: ObjectId[] }
   */
  createGroup: asyncHandler(async (req, res) => {
    const { name, description, participantIds } = req.body;
    const channel = await service.createGroup(req.user._id, {
      name,
      description,
      participantIds: Array.isArray(participantIds) ? participantIds : [],
    });
    res.status(201).json({
      success: true,
      data:    mapper.toChannelResponse(channel, req.user._id),
    });
  }),

  // ── POST /api/channels/dm ──────────────────────────────────────────────────
  /**
   * Get or create a 1-on-1 DM channel with another user.
   * Idempotent: returns the existing channel if it already exists.
   *
   * Body: { targetUserId: ObjectId }
   * Response: 201 on creation, 200 if it already existed.
   */
  getOrCreateDM: asyncHandler(async (req, res) => {
    const { targetUserId } = req.body;
    const { channel, created } = await service.getOrCreateDM(req.user._id, targetUserId);
    res.status(created ? 201 : 200).json({
      success: true,
      created,
      data:    mapper.toChannelResponse(channel, req.user._id),
    });
  }),

  // ── PATCH /api/channels/:id/participants/:uid/role ─────────────────────────
  /**
   * Change the role of a participant in a group channel.
   *
   * Params: id (channelId), uid (targetUserId)
   * Body:   { role: 'admin' | 'member' }
   *
   * Auth rules (enforced in service):
   *  - Requester must be owner or admin
   *  - Cannot assign 'owner' role
   *  - Admins cannot promote to admin (owner-only)
   *  - Cannot change the owner's role
   *  - Cannot change your own role
   */
  changeRole: asyncHandler(async (req, res) => {
    const { id: channelId, uid: targetUserId } = req.params;
    const { role } = req.body;

    const channel = await service.changeParticipantRole(
      channelId,
      req.user._id,
      targetUserId,
      role
    );
    res.status(200).json({
      success: true,
      data:    mapper.toChannelResponse(channel, req.user._id),
    });
  }),
};

module.exports = channelsController;
