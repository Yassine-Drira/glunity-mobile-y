'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-mappers
// ─────────────────────────────────────────────────────────────────────────────

const toParticipant = (p) => ({
  userId: p.userId?.toString() ?? null,
  role:   p.role   ?? 'member',
  muted:  p.muted  ?? false,
});

const toLastMessage = (lm) => {
  if (!lm || !lm.messageId) return null;
  return {
    messageId:  lm.messageId?.toString(),
    senderId:   lm.senderId?.toString()   ?? null,
    senderName: lm.senderName             ?? null,
    content:    lm.content                ?? '',
    type:       lm.type                   ?? 'text',
    createdAt:  lm.createdAt              ?? null,
  };
};

const toPinnedMessage = (p) => ({
  messageId: p.messageId?.toString() ?? null,
  pinnedAt:  p.pinnedAt  ?? null,
  pinnedBy:  p.pinnedBy?.toString()  ?? null,
});

// ─────────────────────────────────────────────────────────────────────────────
// Primary mapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape a single Channel document for the API response.
 *
 * @param {object}           channel      – lean Mongoose document
 * @param {string|ObjectId}  currentUserId – used to derive myRole / myMuted
 */
const toChannelResponse = (channel, currentUserId) => {
  if (!channel) return null;

  const myEntry = currentUserId
    ? (channel.participants ?? []).find(
        (p) => p.userId?.toString() === currentUserId.toString()
      )
    : null;

  const clearedAt = myEntry?.clearedAt;
  const showLastMessage = channel.lastMessage && (!clearedAt || new Date(channel.lastMessage.createdAt) > new Date(clearedAt));

  return {
    id:             (channel._id ?? channel.id).toString(),
    name:           channel.name           ?? null,
    description:    channel.description    ?? null,
    avatarUrl:      channel.avatarUrl      ?? null,
    type:           channel.type,
    isPrivate:      channel.isPrivate      ?? true,
    messageCount:   channel.messageCount   ?? 0,
    participants:   (channel.participants  ?? []).map(toParticipant),
    lastMessage:    showLastMessage ? toLastMessage(channel.lastMessage) : null,
    pinnedMessages: (channel.pinnedMessages ?? []).map(toPinnedMessage),
    unreadCount:    channel.unreadCount    ?? 0,
    isPinned:       channel.isPinned       ?? false,
    // Convenience fields for the requesting user — saves the client a find()
    myRole:  myEntry?.role  ?? null,
    myMuted: myEntry?.muted ?? false,
    createdById: channel.createdById?.toString() ?? null,
    createdAt:   channel.createdAt  ?? null,
    updatedAt:   channel.updatedAt  ?? null,
  };
};

/**
 * Shape a paginated list of channels.
 */
const toChannelListResponse = (channels, currentUserId) => ({
  success: true,
  data:    (channels ?? []).map((c) => toChannelResponse(c, currentUserId)),
  meta:    { total: channels?.length ?? 0 },
});

module.exports = { toChannelResponse, toChannelListResponse };
