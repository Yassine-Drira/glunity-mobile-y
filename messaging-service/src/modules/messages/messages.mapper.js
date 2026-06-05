'use strict';

const toMessageResponse = (msg) => {
  if (!msg) return null;
  const sender = msg.senderId;
  return {
    id:              (msg._id || msg.id).toString(),
    channelId:       msg.channelId?.toString(),
    senderId:        sender?._id?.toString() ?? msg.senderId?.toString(),
    senderName:      sender?.fullName ?? 'Unknown',
    senderAvatarUrl: sender?.avatar?.url ?? null,
    content:         msg.deletedAt ? null : msg.content,
    type:            msg.type ?? 'text',
    attachments:     msg.attachments ?? [],
    reelRef:         msg.reelRef ?? null,
    replyTo:         (msg.replyTo && msg.replyTo.messageId) ? {
      messageId: msg.replyTo.messageId.toString(),
      senderName: msg.replyTo.senderName ?? 'User',
      preview: msg.replyTo.preview ?? null,
    } : null,
    reactionCounts:  msg.reactionCounts
      ? Object.fromEntries(
          msg.reactionCounts instanceof Map
            ? msg.reactionCounts
            : Object.entries(msg.reactionCounts)
        )
      : {},
    editedAt:  msg.editedAt  ?? null,
    deletedAt: msg.deletedAt ?? null,
    createdAt: msg.createdAt,
  };
};

const toMessageListResponse = (items, { cursor, hasMore } = {}) => ({
  success: true,
  data:    items.map(toMessageResponse),
  meta:    { cursor: cursor ?? null, hasMore: hasMore ?? false },
});

module.exports = { toMessageResponse, toMessageListResponse };
