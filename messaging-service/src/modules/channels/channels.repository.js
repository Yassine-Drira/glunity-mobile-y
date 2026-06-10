'use strict';

const mongoose = require('mongoose');
const Channel  = require('../../database/models/channel.model');

const channelsRepository = {

  /**
   * All channels the user participates in, newest activity first.
   * Uses the (lastMessage.createdAt: -1) index on Channel.
   */
  async findForUser(userId, { limit = 50 } = {}) {
    return Channel.find({
      'participants.userId': userId,
      deletedAt: null,
    })
      .sort({ 'lastMessage.createdAt': -1, updatedAt: -1 })
      .limit(limit)
      .lean();
  },

  async findById(channelId) {
    return Channel.findOne({ _id: channelId, deletedAt: null }).lean();
  },

  /**
   * Find an existing DM between exactly two users.
   * $expr + $size ensures we don't match group channels that happen to
   * contain both users.
   */
  async findDM(userIdA, userIdB) {
    return Channel.findOne({
      type: 'DM',
      'participants.userId': { $all: [userIdA, userIdB] },
      $expr: { $eq: [{ $size: '$participants' }, 2] },
      deletedAt: null,
    }).lean();
  },

  async create(data) {
    const channel = new Channel(data);
    return channel.save();
  },

  /**
   * Positional update — only changes the role of the matching participant.
   */
  async updateParticipantRole(channelId, targetUserId, role) {
    return Channel.findOneAndUpdate(
      {
        _id: channelId,
        'participants.userId': new mongoose.Types.ObjectId(String(targetUserId)),
      },
      { $set: { 'participants.$.role': role } },
      { new: true }
    ).lean();
  },
};

module.exports = channelsRepository;
