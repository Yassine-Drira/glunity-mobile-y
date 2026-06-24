'use strict';

const mongoose = require('mongoose');
const Channel  = require('../../database/models/channel.model');
const Message  = require('../../database/models/message.model');
const Reaction = require('../../database/models/reaction.model');
const emitter  = require('../emitters/channel.emitter');
const logger   = require('../../bootstrap/logger.bootstrap');

const TYPING_COOLDOWN_MS = 2000;
const lastTypingEvents   = new Map();

function messageHandler(io, socket) {
  const user   = socket.data.user;
  const userId = user._id.toString();

  // Guard: checks if the sender is actually in the target channel
  async function checkMembership(channelId) {
    const channel = await Channel.findById(channelId).lean();
    if (!channel) {
      const err = new Error('Channel not found');
      err.status = 404;
      throw err;
    }

    if (channel.type === 'channel') {
      const myEntry = channel.participants && channel.participants.find(p => {
        const pId = p.userId ? p.userId.toString() : p.toString();
        return pId === userId;
      });
      if (!myEntry || !['owner', 'writer'].includes(myEntry.role)) {
        const err = new Error('Forbidden: Only authorized writers can publish messages.');
        err.status = 403;
        throw err;
      }
      return;
    }

    const isPublic = !channel.isPrivate;
    if (!isPublic) {
      const hasAccess = channel.participants && channel.participants.some(p => {
        if (!p) return false;
        const pId = p.userId ? p.userId.toString() : p.toString();
        return pId === userId;
      });
      if (!hasAccess) {
        const err = new Error('Forbidden: Not a participant of this channel');
        err.status = 403;
        throw err;
      }
    }
  }

  // Calculate unread count for each participant and emit conversation:updated
  async function broadcastConversationUpdate(channel) {
    if (!channel || !channel.participants) return;
    for (const p of channel.participants) {
      const pId = (p.userId || p).toString();
      const startFrom = [p.lastReadAt, p.clearedAt].filter(Boolean).sort((a, b) => b - a)[0] || new Date(0);
      const unreadCount = await Message.countDocuments({
        channelId: channel._id,
        deletedAt: { $in: [null, undefined] },
        createdAt: { $gt: startFrom }
      });

      io.to(pId).emit('conversation:updated', {
        channelId: channel._id.toString(),
        lastMessage: channel.lastMessage ? {
          messageId: channel.lastMessage.messageId.toString(),
          senderId: channel.lastMessage.senderId.toString(),
          senderName: channel.lastMessage.senderName,
          content: channel.lastMessage.content,
          createdAt: channel.lastMessage.createdAt,
        } : null,
        unreadCount
      });
    }
  }

  // Send message
  socket.on('message:send', async ({ channelId, content, type, attachments, reelRef, replyTo }, callback) => {
    try {
      await checkMembership(channelId);

      const msg = new Message({
        channelId,
        senderId: userId,
        content: content?.trim(),
        type: type || 'text',
        attachments: attachments || [],
        reelRef,
      });

      if (replyTo?.messageId) {
        const parent = await Message.findById(replyTo.messageId).lean();
        if (parent) {
          msg.replyTo = {
            messageId: parent._id,
            senderName: replyTo.senderName || 'User',
            preview: parent.deletedAt ? null : parent.content?.slice(0, 50),
          };
        }
      }

      await msg.save();

      // Denormalize on Channel: atomics (updates lastMessage and sets sender's lastReadAt)
      let updatedChannel = await Channel.findOneAndUpdate(
        { _id: channelId, 'participants.userId': user._id },
        {
          $set: {
            lastMessage: {
              messageId: msg._id,
              senderId: user._id,
              senderName: user.fullName,
              content: msg.type === 'text' ? msg.content : `[${msg.type}]`,
              createdAt: msg.createdAt,
            },
            'participants.$.lastReadAt': msg.createdAt,
          },
          $inc: { messageCount: 1 },
        },
        { returnDocument: 'after' }
      ).lean();

      if (updatedChannel) {
        await Channel.updateOne(
          { _id: channelId },
          { $set: { 'participants.$[].deletedAt': null } }
        );
        if (updatedChannel.participants) {
          updatedChannel.participants.forEach(p => {
            p.deletedAt = null;
          });
        }
      }

      if (!updatedChannel) {
        updatedChannel = await Channel.findByIdAndUpdate(channelId, {
          $set: {
            lastMessage: {
              messageId: msg._id,
              senderId: user._id,
              senderName: user.fullName,
              content: msg.type === 'text' ? msg.content : `[${msg.type}]`,
              createdAt: msg.createdAt,
            },
          },
          $inc: { messageCount: 1 },
        }, { returnDocument: 'after' }).lean();
      }

      // Populate sender info for clients
      const populated = {
        id: msg._id.toString(),
        channelId: msg.channelId.toString(),
        senderId: userId,
        senderName: user.fullName,
        senderAvatarUrl: user.avatar?.url || null,
        content: msg.content,
        type: msg.type,
        attachments: msg.attachments,
        reelRef: msg.reelRef,
        replyTo: msg.replyTo && msg.replyTo.messageId ? {
          messageId: msg.replyTo.messageId.toString(),
          senderName: msg.replyTo.senderName,
          preview: msg.replyTo.preview,
        } : null,
        reactionCounts: {},
        createdAt: msg.createdAt,
      };

      emitter.messageNew(io, channelId, populated);

      // Broadcast conversation updates and new message notifications to participants
      if (updatedChannel) {
        await broadcastConversationUpdate(updatedChannel);

        if (updatedChannel.participants) {
          for (const p of updatedChannel.participants) {
            const pId = (p.userId || p).toString();

            // If participant is not the sender, check if they are viewing the channel
            if (pId !== userId) {
              const userSockets = await io.in(pId).fetchSockets();
              let isViewing = false;
              for (const s of userSockets) {
                if (s.rooms.has(`viewing:${channelId}`)) {
                  isViewing = true;
                  break;
                }
              }

              // Only send toast notification if participant is not viewing the channel and has not muted notifications
              if (!isViewing && !p.muted) {
                let conversationName = updatedChannel.name;
                if (updatedChannel.type === 'direct') {
                  conversationName = user.fullName;
                }
                
                const messagePreview = msg.type === 'text' 
                  ? (msg.content ? (msg.content.slice(0, 60) + (msg.content.length > 60 ? '...' : '')) : '') 
                  : `[${msg.type}]`;

                io.to(pId).emit('notification:new', {
                  conversationId: channelId,
                  conversationName: conversationName || 'Chat',
                  senderName: user.fullName,
                  senderAvatar: user.avatar?.url || null,
                  messagePreview,
                  timestamp: msg.createdAt
                });
              }
            }
          }
        }
      }

      if (callback) callback({ ok: true, data: populated });
    } catch (err) {
      logger.error('[socket:message] Send failed', { err: err.message, stack: err.stack });
      if (callback) callback({ ok: false, error: err.message });
    }
  });

  // Edit message
  socket.on('message:edit', async ({ messageId, content }, callback) => {
    try {
      const msg = await Message.findOne({ _id: messageId, senderId: user._id });
      if (!msg) throw new Error('Message not found or unauthorized');

      msg.content = content.trim();
      msg.editedAt = new Date();
      await msg.save();

      // Update Channel's lastMessage if this was the last message
      const channel = await Channel.findById(msg.channelId);
      if (channel && channel.lastMessage && channel.lastMessage.messageId.toString() === messageId.toString()) {
        channel.lastMessage.content = msg.type === 'text' ? msg.content : `[${msg.type}]`;
        const updatedChannel = await channel.save();
        await broadcastConversationUpdate(updatedChannel);
      }

      emitter.messageEdited(io, msg.channelId.toString(), msg._id.toString(), msg.content, msg.editedAt);
      if (callback) callback({ ok: true });
    } catch (err) {
      logger.error('[socket:message] Edit failed', { err: err.message });
      if (callback) callback({ ok: false, error: err.message });
    }
  });

  // Delete message (soft-delete)
  socket.on('message:delete', async ({ messageId }, callback) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) throw new Error('Message not found');

      let authorized = msg.senderId.toString() === userId;
      if (!authorized) {
        const channel = await Channel.findById(msg.channelId).lean();
        if (channel) {
          const requester = channel.participants && channel.participants.find(p => p.userId.toString() === userId);
          if (requester && requester.role === 'owner') {
            authorized = true;
          }
        }
      }

      if (!authorized) throw new Error('Unauthorized to delete this message');

      msg.deletedAt = new Date();
      msg.reactionCounts = new Map();
      await msg.save();

      // Delete reactions from Reaction collection
      await Reaction.deleteMany({ messageId });

      // Revert Channel's lastMessage if this was the deleted message
      const channel = await Channel.findById(msg.channelId);
      if (channel && channel.lastMessage && channel.lastMessage.messageId.toString() === messageId.toString()) {
        const previousMsg = await Message.findOne({
          channelId: msg.channelId,
          deletedAt: { $in: [null, undefined] }
        }).sort({ createdAt: -1 });

        if (previousMsg) {
          const sender = await mongoose.model('User').findById(previousMsg.senderId).lean();
          channel.lastMessage = {
            messageId: previousMsg._id,
            senderId: previousMsg.senderId,
            senderName: sender ? sender.fullName : 'User',
            content: previousMsg.type === 'text' ? previousMsg.content : `[${previousMsg.type}]`,
            createdAt: previousMsg.createdAt
          };
        } else {
          channel.lastMessage = null;
        }
        const updatedChannel = await channel.save();
        await broadcastConversationUpdate(updatedChannel);
      }

      emitter.messageDeleted(io, msg.channelId.toString(), msg._id.toString());
      if (callback) callback({ ok: true });
    } catch (err) {
      logger.error('[socket:message] Delete failed', { err: err.message });
      if (callback) callback({ ok: false, error: err.message });
    }
  });

  // Typing indicator
  socket.on('message:typing', async ({ channelId }) => {
    try {
      const now = Date.now();
      const lastSent = lastTypingEvents.get(`${channelId}:${userId}`) || 0;
      if (now - lastSent < TYPING_COOLDOWN_MS) return;

      await checkMembership(channelId);

      lastTypingEvents.set(`${channelId}:${userId}`, now);
      emitter.typingIndicator(io, channelId, userId, user.fullName);
    } catch (err) {
      logger.error('[socket:message] Typing failed', { err: err.message });
    }
  });
}

module.exports = messageHandler;
