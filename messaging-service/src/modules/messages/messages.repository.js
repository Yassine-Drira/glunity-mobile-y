'use strict';

const Message = require('../../database/models/message.model');

const messagesRepository = {

  async findByChannel(channelId, { cursor, limit = 50, direction = 'before' } = {}) {
    const query = { channelId };

    if (cursor) {
      if (direction === 'before') {
        query._id = { $lt: cursor };
      } else {
        query._id = { $gt: cursor };
      }
    }

    const sortOrder = direction === 'before' ? -1 : 1;

    const items = await Message.find(query)
      .populate('senderId', 'fullName avatar')
      .sort({ _id: sortOrder })
      .limit(limit)
      .lean();

    return direction === 'before' ? items.reverse() : items;
  },

  async edit(messageId, senderId, content) {
    return Message.findOneAndUpdate(
      { _id: messageId, senderId },
      { $set: { content, editedAt: new Date() } },
      { new: true }
    ).populate('senderId', 'fullName avatar');
  },

  async softDelete(messageId, senderId) {
    return Message.findOneAndUpdate(
      { _id: messageId, senderId },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
  },

  async pin(channelId, messageId) {
    return Message.findOneAndUpdate(
      { _id: messageId, channelId },
      { $set: { pinned: true } },
      { new: true }
    );
  },

  async unpin(channelId, messageId) {
    return Message.findOneAndUpdate(
      { _id: messageId, channelId },
      { $set: { pinned: false } },
      { new: true }
    );
  },
};

module.exports = messagesRepository;
