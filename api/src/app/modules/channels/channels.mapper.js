'use strict';

const toChannelResponse = (channel) => {
	if (!channel) return null;
	return {
		id: channel._id || channel.id,
		name: channel.name,
		description: channel.description,
		icon: channel.icon,
		// Provide a normalized avatarUrl for clients that expect an image URL
		avatarUrl: (channel.icon && typeof channel.icon === 'string' && (channel.icon.startsWith('http') || channel.icon.startsWith('/'))) ? channel.icon : null,
		isPrivate: channel.isPrivate,
	};
};

const toChannelListResponse = (channels) => {
	return {
		success: true,
		data: channels.map(toChannelResponse),
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
