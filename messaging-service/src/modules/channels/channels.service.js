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
    return repository.findForUser(userId, { limit: 50 });
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
      type:        'DM',
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

    if (channel.type === 'DM') {
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
};

module.exports = channelsService;
