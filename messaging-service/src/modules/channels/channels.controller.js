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

  // ── GET /api/channels/:id ──────────────────────────────────────────────
  getById: asyncHandler(async (req, res) => {
    const { id: channelId } = req.params;
    const channel = await service.getById(channelId, req.user._id);
    res.status(200).json({
      success: true,
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

  // \u2500\u2500 PATCH /api/channels/:id \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  /**
   * Update a group channel's name and/or avatar photo.
   * Body: { name?: string, avatarUrl?: string }
   * Caller must be owner or admin.
   */
  updateChannel: asyncHandler(async (req, res) => {
    const { id: channelId } = req.params;
    const { name, avatarUrl, icon } = req.body;
    // Accept either avatarUrl or icon from clients
    const updates = { name, avatarUrl: avatarUrl || icon };
    const channel = await service.updateChannel(channelId, req.user._id, updates);
    const mapped  = mapper.toChannelResponse(channel, req.user._id);

    // Broadcast update to all participants so chat lists refresh in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${channelId}`).emit('channel:updated', {
        channelId,
        name:      mapped.name,
        avatarUrl: mapped.avatarUrl,
      });
    }

    res.status(200).json({ success: true, data: mapped });
  }),

  deleteChannel: asyncHandler(async (req, res) => {
    const { id: channelId } = req.params;
    const channel = await service.deleteChannel(channelId, req.user._id);

    // Emit socket event for real-time deletion sync to the requesting user only
    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('channel:deleted', { channelId });
    }

    res.status(200).json({
      success: true,
      message: 'Channel deleted successfully',
    });
  }),

  clearMessages: asyncHandler(async (req, res) => {
    const { id: channelId } = req.params;
    const channel = await service.clearMessages(channelId, req.user._id);

    // Emit socket event for real-time clear sync to the requesting user only
    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('channel:cleared', { channelId });
    }

    res.status(200).json({
      success: true,
      message: 'Messages cleared successfully',
      data:    mapper.toChannelResponse(channel, req.user._id),
    });
  }),

  toggleMute: asyncHandler(async (req, res) => {
    const { id: channelId } = req.params;
    const channel = await service.toggleMute(channelId, req.user._id);
    res.status(200).json({
      success: true,
      data:    mapper.toChannelResponse(channel, req.user._id),
    });
  }),

  // ── POST /api/channels/:id/members ────────────────────────────────────────
  /**
   * Add one or more members to a group channel.
   * Body: { memberIds: ObjectId[] }  or  { members: ObjectId[] } (alias)
   * Caller must be owner or admin.
   */
  addMembers: asyncHandler(async (req, res) => {
    const { id: channelId } = req.params;
    const memberIds = req.body.memberIds || req.body.members || [];
    const channel = await service.addMembers(channelId, req.user._id, memberIds);

    // Emit real-time channel updates
    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${channelId}`).emit('channel:updated', mapper.toChannelResponse(channel, req.user._id));
    }

    res.status(200).json({
      success: true,
      data:    mapper.toChannelResponse(channel, req.user._id),
    });
  }),

  // ── DELETE /api/channels/:id/members/:uid ─────────────────────────────────
  /**
   * Remove a participant from a group channel.
   * Caller must be owner or admin (or the participant themselves — self-leave).
   */
  removeMember: asyncHandler(async (req, res) => {
    const { id: channelId, uid: targetUserId } = req.params;
    const channel = await service.removeMember(channelId, req.user._id, targetUserId);

    // Emit real-time channel updates
    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${channelId}`).emit('channel:updated', mapper.toChannelResponse(channel, req.user._id));
    }

    res.status(200).json({
      success: true,
      data:    mapper.toChannelResponse(channel, req.user._id),
    });
  }),
};

module.exports = channelsController;
