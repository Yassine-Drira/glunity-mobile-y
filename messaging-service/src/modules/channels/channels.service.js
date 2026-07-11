'use strict';

const mongoose   = require('mongoose');
const repository = require('./channels.repository');
const logger     = require('../../bootstrap/logger.bootstrap');

// Roles that can be assigned via the API (owner is set at creation time only)
const ASSIGNABLE_ROLES = ['admin', 'writer', 'member'];

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
  if (!channel || !channel.participants) throw createError(errorMsg, 403, 'FORBIDDEN');
  const reqIdStr = String(userId);
  const isMember = channel.participants.some((p) => {
    if (!p) return false;
    const pId = p.userId ? String(p.userId) : String(p);
    return pId === reqIdStr;
  });
  if (!isMember) throw createError(errorMsg, 403, 'FORBIDDEN');
  return channel.participants.find((p) => {
    if (!p) return false;
    const pId = p.userId ? String(p.userId) : String(p);
    return pId === reqIdStr;
  });
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
    const Message = require('../../database/models/message.model');

    // ── 1. Fetch pinned groups for this user ─────────────────────────────────
    const userObj = await User.findById(userId).select('pinnedGroups').lean();
    const pinnedIds = (userObj && userObj.pinnedGroups)
      ? userObj.pinnedGroups.map(id => id.toString())
      : [];

    // ── 2. Collect ALL unique participant userIds across every channel ────────
    //       One bulk User.find() instead of N individual lookups.
    const allParticipantIds = new Set();
    for (const ch of channels) {
      for (const p of (ch.participants ?? [])) {
        if (p.userId) allParticipantIds.add(p.userId.toString());
      }
    }

    const userDocs = await User
      .find({ _id: { $in: [...allParticipantIds] } })
      .select('_id fullName avatar')
      .lean();

    const userMap = new Map(userDocs.map(u => [u._id.toString(), u]));

    // ── 3. Enrich channels ───────────────────────────────────────────────────
    return Promise.all(
      channels.map(async (channel) => {
        const myEntry = (channel.participants ?? []).find(
          (p) => p.userId?.toString() === userId.toString()
        );
        const lastReadAt = myEntry?.lastReadAt || new Date(0);

        // Parallel: unread count + populate participant profile snapshots
        const [unreadCount] = await Promise.all([
          Message.countDocuments({
            channelId: channel._id,
            deletedAt: { $in: [null, undefined] },
            createdAt: { $gt: lastReadAt },
          }),
        ]);

        // Inject fullName + avatarUrl into each participant so the client
        // can immediately display names without a secondary user-list fetch.
        const enrichedParticipants = (channel.participants ?? []).map(p => {
          const profile = userMap.get(p.userId?.toString());
          return profile
            ? {
                ...p,
                fullName:  profile.fullName ?? null,
                // User model stores avatar as { url, publicId } — flatten to string
                avatarUrl: profile.avatar?.url ?? null,
              }
            : p;
        });

        const channelIdStr = channel._id.toString();
        return {
          ...channel,
          participants: enrichedParticipants,
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
    
    const reqIdStr = String(requesterId);
    if (channel.bannedUsers && channel.bannedUsers.some(bId => String(bId) === reqIdStr)) {
      throw createError('You are banned from this channel', 403, 'FORBIDDEN');
    }
    
    const isMember = channel.participants && channel.participants.some((p) => {
      if (!p) return false;
      const pId = p.userId ? String(p.userId) : String(p);
      return pId === reqIdStr;
    });
    const isPublic = channel.isPrivate === false || channel.type === 'channel' || channel.type === 'social';
    if (!isMember && !isPublic) {
      throw createError('You are not a participant of this channel', 403, 'FORBIDDEN');
    }
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
    if (existing) {
      const Channel = require('../../database/models/channel.model');
      const channelObj = await Channel.findById(existing._id);
      let needsSave = false;
      if (channelObj && channelObj.participants) {
        const p = channelObj.participants.find(part => part.userId.toString() === userId.toString());
        if (p && p.deletedAt) {
          p.deletedAt = null;
          needsSave = true;
        }
      }
      if (needsSave) {
        await channelObj.save();
        return { channel: channelObj.toObject(), created: false };
      }
      return { channel: existing, created: false };
    }

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

    if (channel.type === 'channel') {
      if (requester.role !== 'owner') {
        throw createError('Only the channel owner can change participant roles', 403, 'FORBIDDEN');
      }
      if (newRole === 'admin') {
        throw createError('Admins cannot be created in announcement channels', 403, 'FORBIDDEN');
      }
    } else {
      if (!['owner', 'admin'].includes(requester.role)) {
        throw createError('Only admins or owners can change participant roles', 403, 'FORBIDDEN');
      }
      // Admins cannot assign admin role — only owners can
      if (requester.role === 'admin' && newRole === 'admin') {
        throw createError('Only owners can promote members to admin', 403, 'FORBIDDEN');
      }
      if (newRole === 'writer') {
        throw createError('Writers can only be created in announcement channels', 403, 'FORBIDDEN');
      }
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

    const oldRole = target.role;

    // ── Apply change ──────────────────────────────────────────────────────
    const updated = await repository.updateParticipantRole(channelId, targetUserId, newRole);
    if (!updated) throw createError('Role update failed unexpectedly', 500, 'INTERNAL_ERROR');

    const logger = require('../../bootstrap/logger.bootstrap');
    logger.info('[Permission Audit] Participant role changed', {
      channelId: channelId.toString(),
      channelType: channel.type,
      requesterId: requesterId.toString(),
      targetUserId: targetUserId.toString(),
      oldRole,
      newRole
    });

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
      { 
        $push: { participants: { $each: toAdd } },
        $pullAll: { bannedUsers: toAdd.map(p => p.userId) }
      },
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

  async banMember(channelId, requesterId, targetUserId) {
    if (!mongoose.Types.ObjectId.isValid(String(channelId))) {
      throw createError('Invalid channelId', 400, 'VALIDATION_ERROR');
    }
    if (!mongoose.Types.ObjectId.isValid(String(targetUserId))) {
      throw createError('Invalid targetUserId', 400, 'VALIDATION_ERROR');
    }

    const channel = await repository.findById(channelId);
    if (!channel) throw createError('Channel not found', 404, 'NOT_FOUND');
    if (channel.type === 'direct' || channel.type === 'DM') {
      throw createError('Cannot ban members from a DM channel', 403, 'FORBIDDEN');
    }

    const requester = assertParticipant(channel, requesterId, 'You are not a participant of this channel');

    const isSelf = requesterId.toString() === targetUserId.toString();
    const isChannelOwner = channel.createdById && channel.createdById.toString() === requesterId.toString();
    const hasAdminRights = ['owner', 'admin'].includes(requester.role) || isChannelOwner;
    if (!isSelf && !hasAdminRights) {
      throw createError('Only admins or owners can ban members', 403, 'FORBIDDEN');
    }

    const target = channel.participants.find((p) => p.userId.toString() === targetUserId.toString());
    if (!target) throw createError('Target user is not a participant', 404, 'NOT_FOUND');
    if (target.role === 'owner' && !isSelf) {
      throw createError('Cannot ban the channel owner', 403, 'FORBIDDEN');
    }

    const Channel = require('../../database/models/channel.model');
    const updated = await Channel.findByIdAndUpdate(
      channelId,
      { 
        $pull: { participants: { userId: new mongoose.Types.ObjectId(String(targetUserId)) } },
        $addToSet: { bannedUsers: new mongoose.Types.ObjectId(String(targetUserId)) }
      },
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
    const participant = channel.participants.find(p => p.userId.toString() === userId.toString());
    if (!participant) {
      throw createError('Forbidden', 403, 'FORBIDDEN');
    }

    logger.info('[channels.service] deleteChannel called', { channelId: String(channelId), userId: String(userId), channelType: channel.type });

    // If the requester is the channel owner for a multi-user channel,
    // treat this as a global soft-delete: mark the channel as deleted so
    // it disappears for everyone. For DMs/direct channels, deleting
    // only hides the channel for the requesting participant.
    const isOwner = participant.role === 'owner' || (channel.createdById && channel.createdById.toString() === userId.toString());
    const isDirect = (channel.type === 'direct' || channel.type === 'DM');

    // Announcement channels ('channel' type) may only be deleted by the owner.
    if (channel.type === 'channel' && !isOwner) {
      logger.warn('[channels.service] deleteChannel forbidden: only owner may delete announcement channel', { channelId: String(channelId), requesterId: String(userId) });
      throw createError('Only the channel owner can delete this channel', 403, 'FORBIDDEN');
    }

    if (isOwner && !isDirect) {
      // Soft-delete entire channel
      const now = new Date();
      channel.deletedAt = now;
      // Mark all participants as deleted/cleared so client caches are consistent
      channel.participants.forEach((p) => {
        p.deletedAt = now;
        p.clearedAt = now;
      });
      await channel.save();
      logger.info('[channels.service] channel soft-deleted by owner', { channelId: String(channelId), deletedAt: now.toISOString() });
      return channel;
    }

    // Otherwise, only hide the channel for the requesting participant
    participant.deletedAt = new Date();
    participant.clearedAt = new Date();
    await channel.save();
    logger.info('[channels.service] channel hidden for participant', { channelId: String(channelId), userId: String(userId), deletedAt: participant.deletedAt.toISOString() });
    return channel;
  },

  async clearMessages(channelId, userId) {
    const Channel = require('../../database/models/channel.model');
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw createError('Channel not found', 404, 'NOT_FOUND');
    }
    const participant = channel.participants.find(p => p.userId.toString() === userId.toString());
    if (!participant) {
      throw createError('Forbidden', 403, 'FORBIDDEN');
    }

    participant.clearedAt = new Date();
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
    if (participant.muted) {
      participant.muteOption = 'mute_indefinite';
    } else {
      participant.muteOption = 'all';
      participant.muteExpiresAt = null;
    }
    await channel.save();
    return channel;
  },

  async createChannel(userId, { name, description, avatarUrl, coverImageUrl } = {}) {
    if (!name || !name.trim()) {
      throw createError('Channel name is required', 400, 'VALIDATION_ERROR');
    }
    if (name.trim().length > 100) {
      throw createError('Channel name cannot exceed 100 characters', 400, 'VALIDATION_ERROR');
    }

    const participants = [{
      userId: new mongoose.Types.ObjectId(userId),
      role:   'owner',
    }];

    return repository.create({
      name:        name.trim(),
      description: description?.trim() || undefined,
      avatarUrl:   avatarUrl?.trim() || undefined,
      coverImageUrl: coverImageUrl?.trim() || undefined,
      type:        'channel',
      isPrivate:   false,
      participants,
      createdById: userId,
    });
  },

  async joinChannel(channelId, userId) {
    if (!mongoose.Types.ObjectId.isValid(String(channelId))) {
      throw createError('Invalid channelId', 400, 'VALIDATION_ERROR');
    }
    const Channel = require('../../database/models/channel.model');
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw createError('Channel not found', 404, 'NOT_FOUND');
    }
    if (channel.bannedUsers && channel.bannedUsers.some(bId => bId.toString() === userId.toString())) {
      throw createError('You are banned from this channel', 403, 'FORBIDDEN');
    }
    if (channel.type !== 'channel') {
      throw createError('Cannot join this channel directly', 403, 'FORBIDDEN');
    }

    const isMember = channel.participants.some(
      (p) => p.userId.toString() === userId.toString()
    );
    if (isMember) {
      return channel; // already a member, return channel idempotently
    }

    channel.participants.push({
      userId: new mongoose.Types.ObjectId(userId),
      role: 'member'
    });

    await channel.save();
    return channel;
  },

  async updateNotificationSettings(channelId, userId, option) {
    if (!mongoose.Types.ObjectId.isValid(String(channelId))) {
      throw createError('Invalid channelId', 400, 'VALIDATION_ERROR');
    }
    const VALID_OPTIONS = ['all', 'mute_1h', 'mute_8h', 'mute_24h', 'mute_indefinite'];
    if (!VALID_OPTIONS.includes(option)) {
      throw createError('Invalid notification option', 400, 'VALIDATION_ERROR');
    }

    const Channel = require('../../database/models/channel.model');
    const channel = await Channel.findById(channelId);
    if (!channel) throw createError('Channel not found', 404, 'NOT_FOUND');

    const participant = channel.participants.find(p => p.userId.toString() === userId.toString());
    if (!participant) throw createError('Forbidden', 403, 'FORBIDDEN');

    participant.muteOption = option;
    if (option === 'all') {
      participant.muted = false;
      participant.muteExpiresAt = null;
    } else if (option === 'mute_indefinite') {
      participant.muted = true;
      participant.muteExpiresAt = null;
    } else {
      participant.muted = true;
      const now = new Date();
      let hours = 1;
      if (option === 'mute_8h') hours = 8;
      if (option === 'mute_24h') hours = 24;
      participant.muteExpiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
    }

    await channel.save();
    return channel;
  },

  async discoverChannels(userId) {
    const Channel = require('../../database/models/channel.model');
    const channels = await Channel.find({
      type: 'channel',
      deletedAt: { $in: [null, undefined] },
      bannedUsers: { $ne: new mongoose.Types.ObjectId(String(userId)) }
    }).lean();

    const mapper = require('./channels.mapper');
    return channels.map(c => mapper.toChannelResponse(c, userId));
  },
};

module.exports = channelsService;
