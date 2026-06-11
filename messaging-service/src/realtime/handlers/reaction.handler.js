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

  socket.on('reaction:toggle', async ({ messageId, emoji }, callback) => {
    try {
      if (!EMOJI_WHITELIST.has(emoji)) {
        throw new Error('Invalid emoji reaction');
      }

      const msg = await Message.findById(messageId);
      if (!msg) throw new Error('Message not found');

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

      // Helper to check the correct count and cleanup empty fields
      const getReactionCount = async (msgId, emojiChar) => {
        const updated = await Message.findById(msgId).lean();
        const counts = updated?.reactionCounts || {};
        let count = 0;
        
        if (counts instanceof Map) {
          count = counts.get(emojiChar) || 0;
        } else if (typeof counts.get === 'function') {
          count = counts.get(emojiChar) || 0;
        } else {
          count = counts[emojiChar] || 0;
        }

        if (count <= 0) {
          const key = `reactionCounts.${emojiChar}`;
          await Message.findByIdAndUpdate(msgId, { $unset: { [key]: '' } });
          count = 0;
        }
        return count;
      };

      // Check if user has ANY reaction on this message
      const existing = await Reaction.findOne({ messageId, userId });

      if (existing) {
        if (existing.emoji === emoji) {
          // Case A: Toggle off the same reaction
          await Reaction.findOneAndDelete({ _id: existing._id });
          const count = await getReactionCount(messageId, emoji);
          
          emitter.reactionUpdated(io, channelId, messageId, emoji, count, 'removed', userId);
        } else {
          // Case B: Switched reaction from existing.emoji to emoji
          const oldEmoji = existing.emoji;
          
          // Delete old reaction first
          await Reaction.findOneAndDelete({ _id: existing._id });
          const oldCount = await getReactionCount(messageId, oldEmoji);
          emitter.reactionUpdated(io, channelId, messageId, oldEmoji, oldCount, 'removed', userId);

          // Add new reaction
          await Reaction.create({ messageId, userId, emoji });
          const newCount = await getReactionCount(messageId, emoji);
          emitter.reactionUpdated(io, channelId, messageId, emoji, newCount, 'added', userId);
        }
      } else {
        // Case C: Add new reaction (no existing reaction)
        await Reaction.create({ messageId, userId, emoji });
        const count = await getReactionCount(messageId, emoji);
        
        emitter.reactionUpdated(io, channelId, messageId, emoji, count, 'added', userId);
      }

      if (callback) callback({ ok: true });
    } catch (err) {
      logger.error('[socket:reaction] Toggle failed', { err: err.message });
      if (callback) callback({ ok: false, error: err.message });
    }
  });
}

module.exports = reactionHandler;
