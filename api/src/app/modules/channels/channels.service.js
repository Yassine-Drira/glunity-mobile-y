'use strict';

const repository = require('./channels.repository');

const channelsService = {
	async list({ userId, limit = 50, skip = 0 } = {}) {
		const items = await repository.findMany({ userId, limit, skip });
		return { items };
	},

	async getById(id) {
		const channel = await repository.findById(id);
		if (!channel) {
			const error = new Error('Channel not found');
			error.status = 404;
			throw error;
		}
		return channel;
	},

	async getOrCreateDirectChannel(user1Id, user2Id) {
		let channel = await repository.findDirectChannel(user1Id, user2Id);
		if (!channel) {
			const User = require('../../../database/models/user.model');
			const [user1, user2] = await Promise.all([
				User.findById(user1Id),
				User.findById(user2Id)
			]);
			if (!user1 || !user2) {
				const error = new Error('User not found');
				error.status = 404;
				throw error;
			}
			const name = `DM-${[user1Id.toString(), user2Id.toString()].sort().join('-')}`;
			const description = `Direct Message between ${user1.fullName} and ${user2.fullName}`;
			
			channel = await repository.create({
				name,
				description,
				isPrivate: true,
				type: 'direct',
				participants: [
					{ userId: user1Id, role: 'member' },
					{ userId: user2Id, role: 'member' }
				]
			});
		} else {
			// If existing direct channel was found, restore deletedAt for BOTH participants to null if they were set
			const Channel = require('../../../database/models/channel.model');
			const channelObj = await Channel.findById(channel._id);
			let needsSave = false;
			if (channelObj && channelObj.participants) {
				for (const p of channelObj.participants) {
					if (p.deletedAt) {
						p.deletedAt = null;
						needsSave = true;
					}
				}
				if (needsSave) {
					await channelObj.save();
					channel = channelObj.toObject();
				}
			}
		}
		return channel;
	},

	async create(payload) {
		return repository.create(payload);
	},

	async update(id, payload) {
		// validate existence
		await this.getById(id);
		const updated = await repository.update(id, payload);
		return updated;
	},

	async listMessages(channelId, { limit = 50, skip = 0 } = {}) {
		const items = await repository.findMessages(channelId, { limit, skip });
		return { items };
	},

	async postMessage(payload) {
		const msg = await repository.createMessage(payload);
		return msg.populate('senderId', 'fullName avatar');
	},

	async seedChannelsIfNeeded() {
		const Channel = require('../../../database/models/channel.model');
		try {
			await Channel.collection.dropIndex('name_1');
		} catch (e) {
			// ignore if it doesn't exist
		}
		const count = await Channel.countDocuments({ isPrivate: { $ne: true } });
		if (count === 0) {
			const defaults = [
				{ name: 'General Chat', description: 'Talk about anything gluten-free.', icon: 'chatbubbles-outline' },
				{ name: 'Beginner Guide', description: 'New to gluten-free? Start here.', icon: 'leaf-outline' },
				{ name: 'Healthy Lifestyle', description: 'Balance your diet and wellness.', icon: 'fitness-outline' },
				{ name: 'Gluten-Free Desserts', description: 'Sweet treats without gluten.', icon: 'heart-outline' },
			];
			await Channel.insertMany(defaults);
		}
	},

	async listMembers(channelId) {
		const Channel = require('../../../database/models/channel.model');
		const channel = await Channel.findById(channelId).populate('participants');
		if (!channel) {
			const error = new Error('Channel not found');
			error.status = 404;
			throw error;
		}
		
		const User = require('../../../database/models/user.model');
		const members = [];
		for (const p of channel.participants || []) {
			if (!p) continue;
			if (p.userId) {
				const userObj = await User.findById(p.userId).lean();
				if (userObj) {
					members.push({
						_id: userObj._id,
						fullName: userObj.fullName || userObj.name,
						avatarUrl: userObj.avatar?.url || userObj.profilePicture || null,
						role: p.role || 'member'
					});
				}
			} else {
				const userObj = p.fullName ? p : await User.findById(p).lean();
				if (userObj) {
					members.push({
						_id: userObj._id,
						fullName: userObj.fullName || userObj.name,
						avatarUrl: userObj.avatar?.url || userObj.profilePicture || null,
						role: 'member'
					});
				}
			}
		}
		return members;
	},

	async addMembers(channelId, memberIds) {
		const Channel = require('../../../database/models/channel.model');
		const channel = await Channel.findById(channelId);
		if (!channel) {
			const error = new Error('Channel not found');
			error.status = 404;
			throw error;
		}

		if (!channel.participants) {
			channel.participants = [];
		}

		for (const id of memberIds) {
			const exists = channel.participants.some(p => {
				const pId = p.userId ? p.userId.toString() : p.toString();
				return pId === id.toString();
			});
			if (!exists) {
				channel.participants.push({ userId: id, role: 'member' });
			}
		}

		await channel.save();
		return channel;
	},

	async removeMember(channelId, memberId) {
		const Channel = require('../../../database/models/channel.model');
		const channel = await Channel.findById(channelId);
		if (!channel) {
			const error = new Error('Channel not found');
			error.status = 404;
			throw error;
		}

		if (channel.participants) {
			channel.participants = channel.participants.filter(p => {
				const pId = p.userId ? p.userId.toString() : p.toString();
				return pId !== memberId.toString();
			});
		}

		await channel.save();
		return channel;
	},

	async promoteMember(channelId, memberId) {
		const Channel = require('../../../database/models/channel.model');
		const channel = await Channel.findById(channelId);
		if (!channel) {
			const error = new Error('Channel not found');
			error.status = 404;
			throw error;
		}

		if (channel.participants) {
			channel.participants = channel.participants.map(p => {
				const pId = p.userId ? p.userId.toString() : p.toString();
				if (pId === memberId.toString()) {
					if (p.userId) {
						p.role = 'admin';
					} else {
						return { userId: pId, role: 'admin' };
					}
				}
				return p;
			});
		}

		await channel.save();
		return channel;
	},

	async demoteMember(channelId, memberId) {
		const Channel = require('../../../database/models/channel.model');
		const channel = await Channel.findById(channelId);
		if (!channel) {
			const error = new Error('Channel not found');
			error.status = 404;
			throw error;
		}

		if (channel.participants) {
			channel.participants = channel.participants.map(p => {
				const pId = p.userId ? p.userId.toString() : p.toString();
				if (pId === memberId.toString()) {
					if (p.userId) {
						p.role = 'member';
					} else {
						return { userId: pId, role: 'member' };
					}
				}
				return p;
			});
		}

		await channel.save();
		return channel;
	},

	async joinChannel(channelId, userId) {
		const Channel = require('../../../database/models/channel.model');
		const channel = await Channel.findById(channelId);
		if (!channel) {
			const error = new Error('Channel not found');
			error.status = 404;
			throw error;
		}

		// Check if already a participant (supports both plain ObjectId and subdocument formats)
		const alreadyMember = (channel.participants || []).some(p => {
			const pId = p.userId ? p.userId.toString() : p.toString();
			return pId === userId.toString();
		});

		if (!alreadyMember) {
			// Use atomic update to avoid Mongoose validation issues on legacy docs
			await Channel.findByIdAndUpdate(channelId, {
				$push: {
					participants: { userId, role: 'member' }
				}
			});
		}

		// Return the freshly-updated document
		return Channel.findById(channelId);
	},
};

module.exports = channelsService;
