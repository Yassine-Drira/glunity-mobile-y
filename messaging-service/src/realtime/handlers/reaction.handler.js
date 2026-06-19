'use strict';

const Channel  = require('../../database/models/channel.model');
const Message  = require('../../database/models/message.model');
const Reaction = require('../../database/models/reaction.model');
const emitter  = require('../emitters/channel.emitter');
const logger   = require('../../bootstrap/logger.bootstrap');

const EMOJI_WHITELIST = new Set(['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👎', '🎉', '😍', '✅', '👀', '💯', '🤔', '🎊', '😅']);

function reactionHandler(io, socket) {
  const user   = socket.data.user;
  const userId = user._id.toString();

  /**
   * Extract numeric count for a given emoji from the returned Mongoose document.
   * reactionCounts is a Mongoose Map, so use .get() if available, else plain object access.
   * Clamps to 0 to avoid broadcasting negative counts.
   */
  function extractCount(updatedDoc, emojiChar) {
    if (!updatedDoc) return 0;
    const counts = updatedDoc.reactionCounts;
    if (!counts) return 0;
    let count;
    if (typeof counts.get === 'function') {
      count = counts.get(emojiChar);
    } else {
      count = counts[emojiChar];
    }
    return Math.max(0, count || 0);
  }

  socket.on('reaction:toggle', async ({ messageId, emoji }, callback) => {
    try {
      if (!EMOJI_WHITELIST.has(emoji)) {
        throw new Error('Invalid emoji reaction');
      }

      const msg = await Message.findById(messageId);
      if (!msg) throw new Error('Message not found');
      if (msg.deletedAt) throw new Error('Cannot react to a deleted message');

      // Verify membership
      const channelId = msg.channelId.toString();
      const channel = await Channel.findById(channelId).lean();
      if (!channel) throw new Error('Channel not found');

      const isPublic = !channel.isPrivate;
      if (!isPublic) {
        const hasAccess = channel.participants && channel.participants.some(p => {
          if (!p) return false;
          const pId = p.userId ? p.userId.toString() : p.toString();
          return pId === userId;
        });
        if (!hasAccess) throw new Error('Forbidden');
      }

      // Check if user has ANY reaction on this message
      const existing = await Reaction.findOne({ messageId, userId });

      if (existing) {
        if (existing.emoji === emoji) {
          // Case A: Toggle off the same reaction
          await Reaction.findOneAndDelete({ _id: existing._id });

          // Atomically decrement reactionCounts on Message
          const updatedDoc = await Message.adjustReactionCount(messageId, emoji, -1);
          let count = extractCount(updatedDoc, emoji);
          // Clean up zero/negative keys
          if (count <= 0) {
            await Message.findByIdAndUpdate(messageId, { $unset: { [`reactionCounts.${emoji}`]: '' } });
            count = 0;
          }

          emitter.reactionUpdated(io, channelId, messageId, emoji, count, 'removed', userId);
        } else {
          // Case B: Switched reaction from existing.emoji to new emoji
          const oldEmoji = existing.emoji;

          // Remove old reaction and decrement its count
          await Reaction.findOneAndDelete({ _id: existing._id });
          const oldDoc = await Message.adjustReactionCount(messageId, oldEmoji, -1);
          let oldCount = extractCount(oldDoc, oldEmoji);
          if (oldCount <= 0) {
            await Message.findByIdAndUpdate(messageId, { $unset: { [`reactionCounts.${oldEmoji}`]: '' } });
            oldCount = 0;
          }
          emitter.reactionUpdated(io, channelId, messageId, oldEmoji, oldCount, 'removed', userId);

          // Add new reaction and increment its count
          await Reaction.create({ messageId, userId, emoji });
          const newDoc = await Message.adjustReactionCount(messageId, emoji, 1);
          const newCount = extractCount(newDoc, emoji);
          emitter.reactionUpdated(io, channelId, messageId, emoji, newCount, 'added', userId);
        }
      } else {
        // Case C: Fresh reaction — no existing reaction from this user
        await Reaction.create({ messageId, userId, emoji });
        const updatedDoc = await Message.adjustReactionCount(messageId, emoji, 1);
        const count = extractCount(updatedDoc, emoji);

        emitter.reactionUpdated(io, channelId, messageId, emoji, count, 'added', userId);
      }

      if (callback) callback({ ok: true });
    } catch (err) {
      logger.error('[socket:reaction] Toggle failed', { err: err.message });
      if (callback) callback({ ok: false, error: err.message });
    }
  });

  socket.on('reaction:get_reactors', async ({ messageId, emoji }, callback) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) throw new Error('Message not found');

      const channelId = msg.channelId.toString();
      const channel = await Channel.findById(channelId).lean();
      if (!channel) throw new Error('Channel not found');

      const isPublic = !channel.isPrivate;
      if (!isPublic) {
        const hasAccess = channel.participants && channel.participants.some(p => {
          if (!p) return false;
          const pId = p.userId ? p.userId.toString() : p.toString();
          return pId === userId;
        });
        if (!hasAccess) throw new Error('Forbidden');
      }

      const query = { messageId };
      if (emoji) query.emoji = emoji;

      const reactions = await Reaction.find(query)
        .populate({
          path: 'userId',
          select: '_id fullName name avatarUrl profileType'
        })
        .lean();

      const reactors = reactions
        .filter(r => r.userId)
        .map(r => ({
          userId: r.userId._id.toString(),
          fullName: r.userId.fullName || r.userId.name,
          avatarUrl: r.userId.avatarUrl,
          profileType: r.userId.profileType,
          emoji: r.emoji
        }));

      if (callback) callback({ ok: true, reactors });
    } catch (err) {
      logger.error('[socket:reaction] Get reactors failed', { err: err.message });
      if (callback) callback({ ok: false, error: err.message });
    }
  });
}

module.exports = reactionHandler;
