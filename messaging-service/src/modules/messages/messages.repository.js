'use strict';

const Message = require('../../database/models/message.model');

const messagesRepository = {

  async findByChannel(channelId, { cursor, limit = 20, direction = 'before', clearedAt } = {}) {
    const query = { channelId };

    const isObjectId = cursor && /^[a-f\d]{24}$/i.test(cursor);

    if (cursor) {
      if (isObjectId) {
        if (direction === 'before') {
          query._id = { $lt: cursor };
        } else {
          query._id = { $gt: cursor };
        }
      } else {
        const parsedDate = new Date(cursor);
        if (!isNaN(parsedDate.getTime())) {
          if (direction === 'before') {
            query.createdAt = { $lt: parsedDate };
          } else {
            query.createdAt = { $gt: parsedDate };
          }
        }
      }
    }

    if (clearedAt) {
      query.createdAt = query.createdAt ? { ...query.createdAt, $gt: clearedAt } : { $gt: clearedAt };
    }

    const sortField = isObjectId || !cursor ? '_id' : 'createdAt';
    const sortOrder = direction === 'before' ? -1 : 1;

    const items = await Message.find(query)
      .populate('senderId', 'fullName avatar')
      .sort({ [sortField]: sortOrder })
      .limit(limit)
      .lean();

    return direction === 'before' ? items.reverse() : items;
  },

  async edit(messageId, senderId, content) {
    return Message.findOneAndUpdate(
      { _id: messageId, senderId },
      { $set: { content, editedAt: new Date() } },
      { returnDocument: 'after' }
    ).populate('senderId', 'fullName avatar');
  },

  async softDelete(messageId, senderId) {
    return Message.findOneAndUpdate(
      { _id: messageId, senderId },
      { $set: { deletedAt: new Date() } },
      { returnDocument: 'after' }
    );
  },

  async pin(channelId, messageId) {
    return Message.findOneAndUpdate(
      { _id: messageId, channelId },
      { $set: { pinned: true } },
      { returnDocument: 'after' }
    );
  },

  async unpin(channelId, messageId) {
    return Message.findOneAndUpdate(
      { _id: messageId, channelId },
      { $set: { pinned: false } },
      { returnDocument: 'after' }
    );
  },
};

module.exports = messagesRepository;
