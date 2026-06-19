'use strict';

const repository = require('./messages.repository');
const Channel = require('../../database/models/channel.model');

const messagesService = {

  async list(channelId, userId, { cursor, limit = 50, direction = 'before' } = {}) {
    const channel = await Channel.findById(channelId).lean();
    if (!channel) {
      const err = new Error('Channel not found'); err.status = 404; throw err;
    }

    const isPublic = !channel.isPrivate;
    let participant = null;
    if (channel.participants) {
      participant = channel.participants.find(p => {
        if (!p) return false;
        const pId = p.userId ? p.userId.toString() : p.toString();
        return pId === userId.toString();
      });
    }

    if (!isPublic && !participant) {
      const err = new Error('Forbidden'); err.status = 403; throw err;
    }

    const clearedAt = participant?.clearedAt;
    const deletedAt = participant?.deletedAt;
    const filterNewerThan = [clearedAt, deletedAt].filter(Boolean).sort((a, b) => b - a)[0] || null;

    const items = await repository.findByChannel(channelId, { cursor, limit, direction, clearedAt: filterNewerThan });
    return { items };
  },

  async edit(messageId, senderId, content) {
    if (!content?.trim()) {
      const err = new Error('Content cannot be empty'); err.status = 400; throw err;
    }
    const msg = await repository.edit(messageId, senderId, content.trim());
    if (!msg) {
      const err = new Error('Message not found or forbidden'); err.status = 404; throw err;
    }
    return msg;
  },

  async remove(messageId, senderId) {
    const msg = await repository.softDelete(messageId, senderId);
    if (!msg) {
      const err = new Error('Message not found or forbidden'); err.status = 404; throw err;
    }
    return msg;
  },

  async pin(channelId, messageId, userId) {
    const channel = await Channel.findOne({
      _id: channelId,
      'participants.userId': userId
    });
    if (!channel) {
      const err = new Error('Only conversation participants can pin messages'); err.status = 403; err.code = 'FORBIDDEN'; throw err;
    }

    const Message = require('../../database/models/message.model');
    const msg = await Message.findOne({ _id: messageId, channelId });
    if (!msg) {
      const err = new Error('Message not found'); err.status = 404; err.code = 'NOT_FOUND'; throw err;
    }

    if (!channel.pinnedMessages) {
      channel.pinnedMessages = [];
    }

    const isAlreadyPinned = channel.pinnedMessages.some(p => p.messageId.toString() === messageId.toString());
    if (isAlreadyPinned) {
      return channel;
    }

    if (channel.pinnedMessages.length >= 3) {
      const err = new Error('Max 3 pinned messages exceeded'); err.status = 422; err.code = 'MAX_PINS_EXCEEDED'; throw err;
    }

    channel.pinnedMessages.push({
      messageId,
      pinnedAt: new Date(),
      pinnedBy: userId
    });

    await channel.save();
    return channel;
  },

  async unpin(channelId, messageId, userId) {
    const channel = await Channel.findOne({
      _id: channelId,
      'participants.userId': userId
    });
    if (!channel) {
      const err = new Error('Only conversation participants can unpin messages'); err.status = 403; err.code = 'FORBIDDEN'; throw err;
    }

    if (!channel.pinnedMessages) {
      return channel;
    }

    channel.pinnedMessages = channel.pinnedMessages.filter(p => p.messageId.toString() !== messageId.toString());
    await channel.save();
    return channel;
  },

  async getPinnedMessages(channelId) {
    const channel = await Channel.findById(channelId)
      .populate({
        path: 'pinnedMessages.messageId',
        select: 'content senderId createdAt',
        populate: { path: 'senderId', select: 'fullName avatar' }
      })
      .lean();
    if (!channel || !channel.pinnedMessages) return [];
    return channel.pinnedMessages.map(pm => {
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
    });
  },
};

module.exports = messagesService;
