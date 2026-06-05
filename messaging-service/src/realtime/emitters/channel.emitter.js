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

  presenceOnline(io, userId) {
    io.emit('presence:online', { userId });
  },

  presenceOffline(io, userId, lastSeen) {
    io.emit('presence:offline', { userId, lastSeen });
  },
};

module.exports = emitter;
