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

		if (items.length === 0 && skip === 0) {
			const seedData = [
				{
					name: 'General Chat 💬',
					description: 'General discussions for gluten-free lifestyle.',
					icon: 'chatbubble-ellipses-outline',
				},
				{
					name: 'Recipe Sharing 🥞',
					description: 'Share your gluten-free pizza, breads, and recipes!',
					icon: 'restaurant-outline',
				},
				{
					name: 'Tunisian GF Food 🌾',
					description: 'Find local Tunisian gluten free meals and products.',
					icon: 'location-outline',
				},
			];
			const created = [];
			for (const seed of seedData) {
				const doc = await service.create(seed);
				created.push(doc);
			}
			items = created;
		}

		res.status(200).json(mapper.toChannelListResponse(items));
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
		const { content } = req.body;

		await service.getById(channelId);

		const msg = await service.postMessage({
			channelId,
			senderId,
			content,
		});

		res.status(201).json({ success: true, data: mapper.toMessageResponse(msg) });
	}),
};

module.exports = channelsController;
