'use strict';

const repository = require('./messages.repository');
const Channel    = require('../../database/models/channel.model');

const messagesService = {

  async list(channelId, userId, { cursor, limit = 50, direction = 'before' } = {}) {
    const channel = await Channel.findById(channelId).lean();
    if (!channel) {
      const err = new Error('Channel not found'); err.status = 404; throw err;
    }

    const isPublic = !channel.isPrivate;
    if (!isPublic) {
      const hasAccess = channel.participants && channel.participants.some(p => {
        if (!p) return false;
        const pId = p.userId ? p.userId.toString() : p.toString();
        return pId === userId.toString();
      });
      if (!hasAccess) {
        const err = new Error('Forbidden'); err.status = 403; throw err;
      }
    }

    const items = await repository.findByChannel(channelId, { cursor, limit, direction });
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
      'participants': { $elemMatch: { userId, role: { $in: ['owner', 'admin'] } } },
    }).lean();
    if (!channel) {
      const err = new Error('Only admins can pin messages'); err.status = 403; throw err;
    }
    return repository.pin(channelId, messageId);
  },

  async unpin(channelId, messageId, userId) {
    const channel = await Channel.findOne({
      _id: channelId,
      'participants': { $elemMatch: { userId, role: { $in: ['owner', 'admin'] } } },
    }).lean();
    if (!channel) {
      const err = new Error('Only admins can unpin messages'); err.status = 403; throw err;
    }
    return repository.unpin(channelId, messageId);
  },
};

module.exports = messagesService;
