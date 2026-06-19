'use strict';

const emitter = {

  messageNew(io, channelId, message) {
    io.to(`channel:${channelId}`).emit('message:new', { message });
  },

  messageEdited(io, channelId, messageId, content, editedAt) {
    io.to(`channel:${channelId}`).emit('message:edited', { messageId, content, editedAt });
  },

  messageDeleted(io, channelId, messageId) {
    io.to(`channel:${channelId}`).emit('message:deleted', { messageId, channelId });
  },

  reactionUpdated(io, channelId, messageId, emoji, count, action, userId) {
    io.to(`channel:${channelId}`).emit('reaction:updated', { messageId, emoji, count, action, userId });
  },

  typingIndicator(io, channelId, userId, fullName) {
    io.to(`channel:${channelId}`).emit('message:typing', { channelId, userId, fullName });
  },

  presenceOnline(io, userId, peerIds = []) {
    // Always emit to the user's own room (for multi-device sync)
    io.to(userId).emit('presence:online', { userId });
    // Emit to each peer so their UI updates without refresh
    for (const peerId of peerIds) {
      io.to(peerId).emit('presence:online', { userId });
    }
  },

  presenceOffline(io, userId, lastSeen, peerIds = []) {
    io.to(userId).emit('presence:offline', { userId, lastSeen });
    for (const peerId of peerIds) {
      io.to(peerId).emit('presence:offline', { userId, lastSeen });
    }
  },

  channelDeleted(io, channelId) {
    io.to(`channel:${channelId}`).emit('channel:deleted', { channelId });
  },

  channelCleared(io, channelId) {
    io.to(`channel:${channelId}`).emit('channel:cleared', { channelId });
  },
};

module.exports = emitter;
