'use strict';

const service = require('./channels.service');
const mapper = require('./channels.mapper');
const asyncHandler = require('../../common/utils/async-handler');

const channelsController = {
	// GET /api/channels
	list: asyncHandler(async (req, res) => {
		const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
		const skip = req.query.skip !== undefined ? Number(req.query.skip) : 0;
		const userId = req.user?._id;

		let { items } = await service.list({ userId, limit, skip });

		// Fetch user's pinnedGroups
		const User = require('../../../database/models/user.model');
		const userObj = await User.findById(userId).select('pinnedGroups').lean();
		const pinnedIds = (userObj && userObj.pinnedGroups) ? userObj.pinnedGroups.map(id => id.toString()) : [];

		const itemsWithPin = items.map(channel => {
			const channelIdStr = (channel._id || channel.id).toString();
			return {
				...channel,
				isPinned: pinnedIds.includes(channelIdStr)
			};
		});

		res.status(200).json(mapper.toChannelListResponse(itemsWithPin));
	}),

	// POST /api/channels/direct
	getOrCreateDirectChannel: asyncHandler(async (req, res) => {
		const user1Id = req.user?._id;
		const { userId: user2Id } = req.body;

		if (!user2Id) {
			const error = new Error('Target user ID (userId) is required');
			error.status = 400;
			throw error;
		}

		const channel = await service.getOrCreateDirectChannel(user1Id, user2Id);
		res.status(200).json({ success: true, data: mapper.toChannelResponse(channel) });
	}),

	// POST /api/channels
	createChannel: asyncHandler(async (req, res) => {
		const { name, description, participants, icon } = req.body;
		
		const participantList = Array.isArray(participants) ? participants : [];
		const formattedParticipants = participantList.map(p => {
			if (typeof p === 'string') {
				return { userId: p, role: 'member' };
			} else if (p && p.userId) {
				return { userId: p.userId, role: p.role || 'member' };
			}
			return p;
		});

		// Ensure the creator is in the participants as owner
		const creatorId = req.user?._id;
		if (creatorId) {
			const hasCreator = formattedParticipants.some(p => p.userId?.toString() === creatorId.toString());
			if (!hasCreator) {
				formattedParticipants.push({ userId: creatorId, role: 'owner' });
			} else {
				const creatorObj = formattedParticipants.find(p => p.userId?.toString() === creatorId.toString());
				if (creatorObj) creatorObj.role = 'owner';
			}
		}

		const payload = {
			name: name || `Group-${Date.now()}`,
			description: description || '',
			isPrivate: false,
			participants: formattedParticipants,
			icon: icon || undefined,
		};
		const channel = await service.create(payload);
		res.status(201).json({ success: true, data: mapper.toChannelResponse(channel) });
	}),

	// GET /api/channels/:id/messages
	listMessages: asyncHandler(async (req, res) => {
		const channelId = req.params.id;
		const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
		const skip = req.query.skip !== undefined ? Number(req.query.skip) : 0;

		await service.getById(channelId);

		let { items } = await service.listMessages(channelId, { limit, skip });

		if (items.length === 0 && skip === 0) {
			const seedMsgs = [
				{
					channelId,
					senderId: req.user?._id,
					content: 'Hello everyone! Excited to join this community.',
				},
				{
					channelId,
					senderId: req.user?._id,
					content: 'Does anyone have recommendations for GF bakeries in Tunis?',
				},
			];
			const created = [];
			for (const seed of seedMsgs) {
				if (!seed.senderId) continue;
				const doc = await service.postMessage(seed);
				created.push(doc);
			}
			items = created;
		}

		res.status(200).json(mapper.toMessageListResponse(items));
	}),

	// POST /api/channels/:id/messages
	postMessage: asyncHandler(async (req, res) => {
		const channelId = req.params.id;
		const senderId = req.user?._id;
		const { content, type, attachments, reelRef, replyTo } = req.body;

		await service.getById(channelId);

		const payload = {
			channelId,
			senderId,
			content: content !== undefined ? content : '',
			type: type || 'text',
			attachments: Array.isArray(attachments) ? attachments : [],
			reelRef: reelRef || undefined,
			replyTo: replyTo || undefined,
		};

		const msg = await service.postMessage(payload);

		// Update Channel lastMessage denormalized field
		const Channel = require('../../../database/models/channel.model');
		await Channel.findByIdAndUpdate(channelId, {
			$set: {
				lastMessage: {
					messageId: msg._id,
					senderId: req.user._id,
					senderName: req.user.fullName,
					content: msg.type === 'text' ? msg.content : `[${msg.type}]`,
					createdAt: msg.createdAt,
				},
			},
		});

		res.status(201).json({ success: true, data: mapper.toMessageResponse(msg) });
	}),

	// PATCH /api/channels/:id
	updateChannel: asyncHandler(async (req, res) => {
		const channelId = req.params.id;
		const payload = {};
		const { name, icon, description } = req.body || {};
		if (name !== undefined) payload.name = name;
		if (icon !== undefined) payload.icon = icon;
		if (description !== undefined) payload.description = description;

		const updated = await service.update(channelId, payload);
		res.status(200).json({ success: true, data: mapper.toChannelResponse(updated) });
	}),

	pinChannel: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const channelId = req.params.id;

		await service.getById(channelId);

		const User = require('../../../database/models/user.model');
		await User.findByIdAndUpdate(userId, {
			$addToSet: { pinnedGroups: channelId }
		});

		res.status(200).json({ success: true, message: 'Channel pinned successfully' });
	}),

	unpinChannel: asyncHandler(async (req, res) => {
		const userId = req.user?._id;
		const channelId = req.params.id;

		const User = require('../../../database/models/user.model');
		await User.findByIdAndUpdate(userId, {
			$pull: { pinnedGroups: channelId }
		});

		res.status(200).json({ success: true, message: 'Channel unpinned successfully' });
	}),

	listMembers: asyncHandler(async (req, res) => {
		const channelId = req.params.id;
		const members = await service.listMembers(channelId);
		res.status(200).json({ success: true, data: members });
	}),

	addMembers: asyncHandler(async (req, res) => {
		const channelId = req.params.id;
		const { members } = req.body;
		if (!Array.isArray(members) || members.length === 0) {
			const error = new Error('Members list must be a non-empty array');
			error.status = 400;
			throw error;
		}
		const channel = await service.addMembers(channelId, members);
		res.status(200).json({ success: true, data: mapper.toChannelResponse(channel) });
	}),

	removeMember: asyncHandler(async (req, res) => {
		const channelId = req.params.id;
		const memberId = req.params.memberId || req.body.memberId;
		if (!memberId) {
			const error = new Error('Member ID is required');
			error.status = 400;
			throw error;
		}
		const channel = await service.removeMember(channelId, memberId);
		res.status(200).json({ success: true, data: mapper.toChannelResponse(channel) });
	}),

	promoteMember: asyncHandler(async (req, res) => {
		const channelId = req.params.id;
		const memberId = req.body.memberId;
		if (!memberId) {
			const error = new Error('Member ID is required');
			error.status = 400;
			throw error;
		}
		const channel = await service.promoteMember(channelId, memberId);
		res.status(200).json({ success: true, data: mapper.toChannelResponse(channel) });
	}),

	demoteMember: asyncHandler(async (req, res) => {
		const channelId = req.params.id;
		const memberId = req.body.memberId;
		if (!memberId) {
			const error = new Error('Member ID is required');
			error.status = 400;
			throw error;
		}
		const channel = await service.demoteMember(channelId, memberId);
		res.status(200).json({ success: true, data: mapper.toChannelResponse(channel) });
	}),

	joinChannel: asyncHandler(async (req, res) => {
		const channelId = req.params.id;
		const userId = req.user?._id;
		if (!userId) {
			const error = new Error('Unauthorized');
			error.status = 401;
			throw error;
		}
		const channel = await service.joinChannel(channelId, userId);
		res.status(200).json({ success: true, data: mapper.toChannelResponse(channel) });
	}),
};

module.exports = channelsController;
