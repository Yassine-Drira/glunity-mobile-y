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

      // Check if reaction already exists
      const existing = await Reaction.findOne({ messageId, userId, emoji });

      let count = 0;
      let action = 'added';

      if (existing) {
        // Remove reaction
        await Reaction.deleteOne({ _id: existing._id });
        action = 'removed';

        // Decrement atomically
        const field = `reactionCounts.${emoji}`;
        const updatedMsg = await Message.findByIdAndUpdate(
          messageId,
          { $inc: { [field]: -1 } },
          { new: true }
        );
        count = updatedMsg?.reactionCounts?.get(emoji) || 0;

        // Clean up key if count hits 0
        if (count <= 0) {
          await Message.findByIdAndUpdate(messageId, { $unset: { [field]: '' } });
          count = 0;
        }
      } else {
        // Add reaction
        await Reaction.create({ messageId, userId, emoji });

        // Increment atomically
        const field = `reactionCounts.${emoji}`;
        const updatedMsg = await Message.findByIdAndUpdate(
          messageId,
          { $inc: { [field]: 1 } },
          { new: true }
        );
        count = updatedMsg?.reactionCounts?.get(emoji) || 1;
      }

      emitter.reactionUpdated(io, channelId, messageId, emoji, count, action, userId);
      if (callback) callback({ ok: true });
    } catch (err) {
      logger.error('[socket:reaction] Toggle failed', { err: err.message });
      if (callback) callback({ ok: false, error: err.message });
    }
  });
}

module.exports = reactionHandler;
