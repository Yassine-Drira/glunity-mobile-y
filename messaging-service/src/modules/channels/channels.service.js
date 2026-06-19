'use strict';

const mongoose   = require('mongoose');
const repository = require('./channels.repository');

// Roles that can be assigned via the API (owner is set at creation time only)
const ASSIGNABLE_ROLES = ['admin', 'member'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function assertParticipant(channel, userId, errorMsg = 'Forbidden') {
  const isMember = channel.participants.some(
    (p) => p.userId.toString() === userId.toString()
  );
  if (!isMember) throw createError(errorMsg, 403, 'FORBIDDEN');
  return channel.participants.find((p) => p.userId.toString() === userId.toString());
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

const channelsService = {

  // ── GET /api/channels ──────────────────────────────────────────────────────
  /**
   * Return all channels the authenticated user belongs to,
   * sorted by last message activity (newest first).
   */
  async listForUser(userId) {
    const channels = await repository.findForUser(userId, { limit: 50 });
    const User = require('../../database/models/user.model');
    const userObj = await User.findById(userId).select('pinnedGroups').lean();
    const pinnedIds = (userObj && userObj.pinnedGroups) ? userObj.pinnedGroups.map(id => id.toString()) : [];

    const Message = require('../../database/models/message.model');
    return Promise.all(
      channels.map(async (channel) => {
        const myEntry = (channel.participants ?? []).find(
          (p) => p.userId?.toString() === userId.toString()
        );
        const lastReadAt = myEntry?.lastReadAt || new Date(0);
        const unreadCount = await Message.countDocuments({
          channelId: channel._id,
          deletedAt: { $in: [null, undefined] },
          createdAt: { $gt: lastReadAt },
        });
        const channelIdStr = channel._id.toString();
        return {
          ...channel,
          unreadCount,
          isPinned: pinnedIds.includes(channelIdStr),
        };
      })
    );
  },

  // ── POST /api/channels ─────────────────────────────────────────────────────
  /**
   * Create a new group channel.
   * The creator is automatically assigned 'owner'. All other participantIds
   * receive 'member'. Duplicates and the creator's own ID in participantIds
   * are safely deduplicated.
   */
  async createGroup(userId, { name, description, participantIds = [] } = {}) {
    if (!name || !name.trim()) {
      throw createError('Group name is required', 400, 'VALIDATION_ERROR');
    }
    if (name.trim().length > 100) {
      throw createError('Group name cannot exceed 100 characters', 400, 'VALIDATION_ERROR');
    }

    // Validate that all participant IDs are valid ObjectIds
    const sanitized = participantIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    // Deduplicate and ensure the creator is always included
    const uniqueIds = [
      ...new Set([userId.toString(), ...sanitized.map(String)]),
    ];

    const participants = uniqueIds.map((uid) => ({
      userId: new mongoose.Types.ObjectId(uid),
      role:   uid === userId.toString() ? 'owner' : 'member',
    }));

    return repository.create({
      name:        name.trim(),
      description: description?.trim() || undefined,
      type:        'group',
      isPrivate:   true,
      participants,
      createdById: userId,
    });
  },

  // ── GET /api/channels/:id ─────────────────────────────────────────────────
  /**
   * Return a single channel by ID. Caller must be a participant.
   */
  async getById(channelId, requesterId) {
    if (!mongoose.Types.ObjectId.isValid(String(channelId))) {
      throw createError('Invalid channelId', 400, 'VALIDATION_ERROR');
    }
    const channel = await repository.findById(channelId);
    if (!channel) throw createError('Channel not found', 404, 'NOT_FOUND');
    assertParticipant(channel, requesterId, 'You are not a participant of this channel');
    return channel;
  },

  // ── POST /api/channels/dm ──────────────────────────────────────────────────
  /**
   * Get or create a 1-on-1 DM channel between the authenticated user and
   * targetUserId. If a DM already exists between the two, it is returned
   * without modification (idempotent).
   *
   * Privacy guarantee: a DM channel has isPrivate=true and exactly 2
   * participants. The repository query enforces $size===2, so neither user
   * can be added to a group channel accidentally.
   *
   * @returns {{ channel, created: boolean }}
   */
  async getOrCreateDM(userId, targetUserId) {
    if (!targetUserId || !mongoose.Types.ObjectId.isValid(String(targetUserId))) {
      throw createError('A valid targetUserId is required', 400, 'VALIDATION_ERROR');
    }
    if (userId.toString() === targetUserId.toString()) {
      throw createError('Cannot create a DM with yourself', 400, 'VALIDATION_ERROR');
    }

    const existing = await repository.findDM(userId, targetUserId);
    if (existing) return { channel: existing, created: false };

    const channel = await repository.create({
      type:        'direct',
      isPrivate:   true,
      participants: [
        { userId: new mongoose.Types.ObjectId(String(userId)),       role: 'member' },
        { userId: new mongoose.Types.ObjectId(String(targetUserId)), role: 'member' },
      ],
      createdById: userId,
    });
    return { channel, created: true };
  },

  // ── PATCH /api/channels/:id/participants/:uid/role ─────────────────────────
  /**
   * Change the role of a participant.
   *
   * Rules:
   *  - Only the channel owner or an admin may call this.
   *  - 'owner' cannot be assigned via the API (prevents privilege escalation).
   *  - An admin cannot promote another member to admin (owner-only action).
   *  - The channel owner's role is immutable.
   *  - The target must already be a participant.
   */
  async changeParticipantRole(channelId, requesterId, targetUserId, newRole) {
    // ── Input validation ──────────────────────────────────────────────────
    if (!newRole) {
      throw createError('role is required', 400, 'VALIDATION_ERROR');
    }
    if (!ASSIGNABLE_ROLES.includes(newRole)) {
      throw createError(
        `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
    if (!mongoose.Types.ObjectId.isValid(String(channelId))) {
      throw createError('Invalid channelId', 400, 'VALIDATION_ERROR');
    }
    if (!mongoose.Types.ObjectId.isValid(String(targetUserId))) {
      throw createError('Invalid targetUserId', 400, 'VALIDATION_ERROR');
    }

    // ── Fetch channel ─────────────────────────────────────────────────────
    const channel = await repository.findById(channelId);
    if (!channel) throw createError('Channel not found', 404, 'NOT_FOUND');

    if (channel.type === 'DM' || channel.type === 'direct') {
      throw createError('Cannot change roles in a DM channel', 403, 'FORBIDDEN');
    }

    // ── Authorise requester ───────────────────────────────────────────────
    const requester = assertParticipant(
      channel, requesterId,
      'You are not a participant of this channel'
    );

    if (!['owner', 'admin'].includes(requester.role)) {
      throw createError('Only admins or owners can change participant roles', 403, 'FORBIDDEN');
    }

    // Admins cannot assign admin role — only owners can
    if (requester.role === 'admin' && newRole === 'admin') {
      throw createError('Only owners can promote members to admin', 403, 'FORBIDDEN');
    }

    // ── Validate target ───────────────────────────────────────────────────
    const target = channel.participants.find(
      (p) => p.userId.toString() === targetUserId.toString()
    );
    if (!target) {
      throw createError('Target user is not a participant of this channel', 404, 'NOT_FOUND');
    }
    if (target.role === 'owner') {
      throw createError("Cannot change the owner's role", 403, 'FORBIDDEN');
    }
    if (target.userId.toString() === requesterId.toString()) {
      throw createError('You cannot change your own role', 400, 'VALIDATION_ERROR');
    }

    // ── Apply change ──────────────────────────────────────────────────────
    const updated = await repository.updateParticipantRole(channelId, targetUserId, newRole);
    if (!updated) throw createError('Role update failed unexpectedly', 500, 'INTERNAL_ERROR');

    return updated;
  },

  // ── POST /api/channels/:id/members ────────────────────────────────────────
  /**
   * Add one or more members to a group channel.
   * Caller must be owner or admin.
   * Already-present participants are silently skipped (idempotent).
   *
   * Body: { memberIds: ObjectId[] }
   */
  async addMembers(channelId, requesterId, memberIds = []) {
    if (!mongoose.Types.ObjectId.isValid(String(channelId))) {
      throw createError('Invalid channelId', 400, 'VALIDATION_ERROR');
    }
    const channel = await repository.findById(channelId);
    if (!channel) throw createError('Channel not found', 404, 'NOT_FOUND');
    if (channel.type === 'direct') {
      throw createError('Cannot add members to a DM channel', 403, 'FORBIDDEN');
    }

    const requester = assertParticipant(channel, requesterId, 'You are not a participant of this channel');
    const isChannelOwner = channel.createdById && channel.createdById.toString() === requesterId.toString();
    const hasAdminRights = ['owner', 'admin'].includes(requester.role) || isChannelOwner;
    if (!hasAdminRights) {
      throw createError('Only admins or owners can add members', 403, 'FORBIDDEN');
    }

    const existing = new Set(channel.participants.map((p) => p.userId.toString()));
    const toAdd = memberIds
      .filter((id) => mongoose.Types.ObjectId.isValid(String(id)) && !existing.has(String(id)))
      .map((id) => ({ userId: new mongoose.Types.ObjectId(String(id)), role: 'member' }));

    if (toAdd.length === 0) return channel; // nothing to add

    const Channel = require('../../database/models/channel.model');
    const updated = await Channel.findByIdAndUpdate(
      channelId,
      { $push: { participants: { $each: toAdd } } },
      { new: true }
    );
    return updated;
  },

  // ── DELETE /api/channels/:id/members/:uid ─────────────────────────────────
  /**
   * Remove a participant from a group channel.
   * Caller must be owner or admin. Owner cannot be removed.
   *
   * Params: uid – the userId to remove
   */
  async removeMember(channelId, requesterId, targetUserId) {
    if (!mongoose.Types.ObjectId.isValid(String(channelId))) {
      throw createError('Invalid channelId', 400, 'VALIDATION_ERROR');
    }
    if (!mongoose.Types.ObjectId.isValid(String(targetUserId))) {
      throw createError('Invalid targetUserId', 400, 'VALIDATION_ERROR');
    }

    const channel = await repository.findById(channelId);
    if (!channel) throw createError('Channel not found', 404, 'NOT_FOUND');
    if (channel.type === 'direct') {
      throw createError('Cannot remove members from a DM channel', 403, 'FORBIDDEN');
    }

    const requester = assertParticipant(channel, requesterId, 'You are not a participant of this channel');

    // Allow self-leave (any role) or admin/owner removing others
    const isSelf = requesterId.toString() === targetUserId.toString();
    const isChannelOwner = channel.createdById && channel.createdById.toString() === requesterId.toString();
    const hasAdminRights = ['owner', 'admin'].includes(requester.role) || isChannelOwner;
    if (!isSelf && !hasAdminRights) {
      throw createError('Only admins or owners can remove members', 403, 'FORBIDDEN');
    }

    const target = channel.participants.find((p) => p.userId.toString() === targetUserId.toString());
    if (!target) throw createError('Target user is not a participant', 404, 'NOT_FOUND');
    if (target.role === 'owner' && !isSelf) {
      throw createError('Cannot remove the channel owner', 403, 'FORBIDDEN');
    }

    const Channel = require('../../database/models/channel.model');
    const updated = await Channel.findByIdAndUpdate(
      channelId,
      { $pull: { participants: { userId: new mongoose.Types.ObjectId(String(targetUserId)) } } },
      { new: true }
    );
    return updated;
  },

  // ── PATCH /api/channels/:id ────────────────────────────────────────────────

  /**
   * Update a group channel's name and/or avatar photo.
   * Caller must be owner or admin.
   *
   * @param {string} channelId
   * @param {string} userId       – requester (must be owner or admin)
   * @param {object} updates      – { name?, avatarUrl? }
   * @returns {Channel}           – updated channel document
   */
  async updateChannel(channelId, userId, updates = {}) {
    const Channel = require('../../database/models/channel.model');
    const channel = await Channel.findById(channelId);
    if (!channel) throw createError('Channel not found', 404, 'NOT_FOUND');

    const participant = channel.participants.find(
      (p) => p.userId.toString() === userId.toString()
    );
    if (!participant) throw createError('Forbidden', 403, 'FORBIDDEN');
    
    const isChannelOwner = channel.createdById && channel.createdById.toString() === userId.toString();
    const hasAdminRights = ['owner', 'admin'].includes(participant.role) || isChannelOwner;
    if (!hasAdminRights) {
      throw createError('Only admins or owners can update channel info', 403, 'FORBIDDEN');
    }

    const { name, avatarUrl } = updates;

    if (name !== undefined) {
      const trimmed = (name || '').trim();
      if (!trimmed) throw createError('Group name cannot be empty', 400, 'VALIDATION_ERROR');
      if (trimmed.length > 100) throw createError('Group name cannot exceed 100 characters', 400, 'VALIDATION_ERROR');
      channel.name = trimmed;
    }

    if (avatarUrl !== undefined && avatarUrl !== null) {
      channel.avatarUrl = avatarUrl.trim();
    }

    await channel.save();
    return channel;
  },

  async deleteChannel(channelId, userId) {
    const Channel = require('../../database/models/channel.model');
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw createError('Channel not found', 404, 'NOT_FOUND');
    }
    const isMember = channel.participants.some(p => p.userId.toString() === userId.toString());
    if (!isMember) {
      throw createError('Forbidden', 403, 'FORBIDDEN');
    }

    channel.deletedAt = new Date();
    await channel.save();
    return channel;
  },

  async clearMessages(channelId, userId) {
    const Channel = require('../../database/models/channel.model');
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw createError('Channel not found', 404, 'NOT_FOUND');
    }
    const isMember = channel.participants.some(p => p.userId.toString() === userId.toString());
    if (!isMember) {
      throw createError('Forbidden', 403, 'FORBIDDEN');
    }

    const Message = require('../../database/models/message.model');
    await Message.deleteMany({ channelId });

    channel.lastMessage = null;
    channel.messageCount = 0;
    channel.pinnedMessages = [];
    await channel.save();
    return channel;
  },

  async toggleMute(channelId, userId) {
    const Channel = require('../../database/models/channel.model');
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw createError('Channel not found', 404, 'NOT_FOUND');
    }
    const participant = channel.participants.find(p => p.userId.toString() === userId.toString());
    if (!participant) {
      throw createError('Forbidden', 403, 'FORBIDDEN');
    }

    participant.muted = !participant.muted;
    await channel.save();
    return channel;
  },
};

module.exports = channelsService;
