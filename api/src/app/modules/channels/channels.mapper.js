'use strict';

// ── Sub-mappers ─────────────────────────────────────────────────────────────

const toParticipant = (p) => ({
	userId: p.userId?.toString() ?? null,
	role:   p.role   ?? 'member',
	muted:  p.muted  ?? false,
	muteOption: p.muteOption ?? 'all',
	muteExpiresAt: p.muteExpiresAt ?? null,
});

const toPinnedMessage = (pm) => {
	const msgObj = pm.messageId || {};
	return {
		messageId: msgObj._id || msgObj.id || pm.messageId,
		pinnedAt: pm.pinnedAt,
		pinnedBy: pm.pinnedBy,
		content: msgObj.content || '',
		senderName: msgObj.senderId?.fullName || 'Anonymous',
		senderAvatarUrl: msgObj.senderId?.avatar?.url || null,
		createdAt: msgObj.createdAt
	};
};

// ── Primary mapper ─────────────────────────────────────────────────────────────

const toChannelResponse = (channel, currentUserId) => {
	if (!channel) return null;

	const myEntry = currentUserId
		? (channel.participants ?? []).find(
				(p) => p.userId?.toString() === currentUserId.toString()
			)
		: null;

	// Provide a normalized avatarUrl for clients that expect an image URL
	const iconUrl = (channel.icon && typeof channel.icon === 'string' && (channel.icon.startsWith('http') || channel.icon.startsWith('/'))) ? channel.icon : null;

	return {
		id:             (channel._id ?? channel.id).toString(),
		name:           channel.name           ?? null,
		description:    channel.description    ?? null,
		icon:           channel.icon           ?? null,
		avatarUrl:      channel.avatarUrl      ?? iconUrl,
		coverImageUrl:  channel.coverImageUrl  ?? null,
		type:           channel.type           ?? 'group',
		isPrivate:      channel.isPrivate      ?? true,
		participants:   (channel.participants  ?? []).map(toParticipant),
		pinnedMessages: (channel.pinnedMessages ?? []).map(toPinnedMessage),
		isPinned:       channel.isPinned       ?? false,
		// Convenience fields for the requesting user
		myRole:  myEntry?.role  ?? null,
		myMuted: myEntry?.muted ?? false,
		myMuteOption: myEntry?.muteOption ?? 'all',
		myMuteExpiresAt: myEntry?.muteExpiresAt ?? null,
	};
};

const toChannelListResponse = (channels, currentUserId) => {
	return {
		success: true,
		data: (channels ?? []).map(c => toChannelResponse(c, currentUserId)),
	};
};

const toMessageResponse = (msg) => {
	if (!msg) return null;
	return {
		id: msg._id || msg.id,
		channelId: msg.channelId,
		senderId: msg.senderId?._id || msg.senderId,
		senderName: msg.senderId?.fullName || 'Anonymous',
		senderAvatarUrl: msg.senderId?.avatar?.url || null,
		content: msg.content,
		createdAt: msg.createdAt,
	};
};

const toMessageListResponse = (messages) => {
	return {
		success: true,
		data: messages.map(toMessageResponse),
	};
};

module.exports = {
	toChannelResponse,
	toChannelListResponse,
	toMessageResponse,
	toMessageListResponse,
};
