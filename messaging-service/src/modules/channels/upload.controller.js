'use strict';

const multer       = require('multer');
const uploadService = require('./upload.service');
const asyncHandler  = require('../../common/utils/async-handler');
const Message       = require('../../database/models/message.model');
const Channel       = require('../../database/models/channel.model');

// ── Multer instance ───────────────────────────────────────────────────────────
// Memory storage — buffers land in RAM, never hit disk.
// fileFilter and limits are owned by the service to keep business rules there.

const upload = multer({
  storage:    multer.memoryStorage(),
  fileFilter: uploadService.fileFilter,
  limits:     uploadService.limits,
});

// ── Multer error normaliser ───────────────────────────────────────────────────

function handleMulterError(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    const e = new Error(
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File exceeds the maximum allowed size'
        : err.message
    );
    e.status = 413;
    e.code   = 'FILE_TOO_LARGE';
    return next(e);
  }
  // fileFilter rejection or other errors bubble as-is
  next(err);
}

// ── Controller ────────────────────────────────────────────────────────────────

const uploadController = {

  /**
   * POST /api/channels/:id/upload
   *
   * Multipart/form-data field name: `file`
   *
   * 1. multer buffers the file and runs fileFilter (MIME whitelist).
   * 2. uploadService validates size per MIME type and uploads to Cloudinary.
   * 3. A new Message of the appropriate type is persisted with the attachment.
   * 4. Channel.lastMessage is updated.
   *
   * Response: 201 with { success, data: { message, attachment } }
   */
  upload: [
    // Middleware chain: multer → multer error handler → async business logic
    upload.single('file'),
    handleMulterError,
    asyncHandler(async (req, res) => {
      if (!req.file) {
        const err = new Error('No file uploaded — use multipart/form-data with field name "file"');
        err.status = 400;
        throw err;
      }

      const { id: channelId } = req.params;
      const senderId          = req.user._id;

      // ── Access check ────────────────────────────────────────────────────
      // Use $or so we accept: (a) public channels, (b) explicit participant entry,
      // (c) participant stored as plain ObjectId (older schema variant).
      // deletedAt may be undefined (field not set) or null — both mean "not deleted".
      const channel = await Channel.findOne({
        _id: channelId,
        deletedAt: { $in: [null, undefined] },
        $or: [
          { isPrivate: { $ne: true } },          // public / group channel
          { 'participants.userId': senderId },    // participant sub-doc format
        ],
      }).lean();

      if (!channel) {
        const err = new Error('Channel not found or access denied');
        err.status = 404;
        throw err;
      }

      // ── Security check for announcement channels ─────────────────────────
      if (channel.type === 'channel') {
        const myEntry = channel.participants && channel.participants.find(
          p => p.userId && p.userId.toString() === senderId.toString()
        );
        if (!myEntry || !['owner', 'writer'].includes(myEntry.role)) {
          const err = new Error('Forbidden: Only authorized writers can publish messages.');
          err.status = 403;
          throw err;
        }
      }

      // ── Upload to Cloudinary ─────────────────────────────────────────────
      const attachment = await uploadService.uploadAttachment(req.file, channelId);

      // If client supplied a custom duration (e.g. for audio/voice messages)
      const clientDuration = req.body.duration ? parseInt(req.body.duration, 10) : undefined;
      if (clientDuration !== undefined && !isNaN(clientDuration)) {
        attachment.duration = clientDuration;
      }

      // ── Persist Message ──────────────────────────────────────────────────
      const messageType = ['image', 'video'].includes(attachment.type) ? 'media' : 'media';

      const message = await Message.create({
        channelId,
        senderId,
        content:     (req.body.caption || '').trim().slice(0, 4000),
        type:        messageType,
        attachments: [attachment],
      });

      // ── Update channel last message ──────────────────────────────────────
      await Channel.updateLastMessage(channelId, message);

      // ── Socket Broadcast ──────────────────────────────────────────────────
      setImmediate(async () => {
        try {
          const io = req.app.get('io');
          if (io) {
            const populated = {
              id:              message._id.toString(),
              channelId:       message.channelId.toString(),
              senderId:        message.senderId.toString(),
              senderName:      req.user.fullName,
              senderAvatarUrl: req.user.avatar?.url || null,
              content:         message.content,
              type:            message.type,
              attachments:     message.attachments,
              reelRef:         message.reelRef || null,
              replyTo:         message.replyTo && message.replyTo.messageId ? {
                messageId:  message.replyTo.messageId.toString(),
                senderName: message.replyTo.senderName,
                preview:    message.replyTo.preview,
              } : null,
              reactionCounts:  {},
              createdAt:       message.createdAt,
            };

            // Broadcast to all sockets in the channel room (open chat screens)
            io.to(`channel:${channelId}`).emit('message:new', { message: populated });

            // Re-fetch the updated channel to get participant list
            const updatedChannel = await Channel.findById(channelId).lean();

            if (updatedChannel && updatedChannel.participants) {
              for (const p of updatedChannel.participants) {
                const pId = (p.userId || p).toString();

                // Count unread for this participant, respecting lastReadAt and clearedAt
                const startFrom = [p.lastReadAt, p.clearedAt].filter(Boolean).sort((a, b) => b - a)[0] || new Date(0);
                const unreadCount = await Message.countDocuments({
                  channelId,
                  deletedAt: { $in: [null, undefined] },
                  createdAt: { $gt: startFrom },
                });

                // Bubble conversation to the top for all participants
                io.to(pId).emit('conversation:updated', {
                  channelId,
                  lastMessage: {
                    messageId:  message._id.toString(),
                    senderId:   message.senderId.toString(),
                    senderName: req.user.fullName,
                    content:    message.type === 'audio' ? '[audio]' : `[${attachment.type || 'media'}]`,
                    createdAt:  message.createdAt,
                  },
                  unreadCount,
                });

                // Send in-app notification toast to participants who are NOT viewing this channel
                if (pId !== req.user._id.toString()) {
                  const userSockets = await io.in(pId).fetchSockets();
                  let isViewing = false;
                  for (const s of userSockets) {
                    if (s.rooms.has(`viewing:${channelId}`)) {
                      isViewing = true;
                      break;
                    }
                  }

                  if (!isViewing && !p.muted) {
                    const conversationName = updatedChannel.type === 'direct'
                      ? req.user.fullName
                      : (updatedChannel.name || 'Chat');

                    io.to(pId).emit('notification:new', {
                      conversationId:   channelId,
                      conversationName: conversationName,
                      senderName:       req.user.fullName,
                      senderAvatar:     req.user.avatar?.url || null,
                      messagePreview:   message.type === 'audio' ? '🎤 Voice message' : `📎 ${attachment.type || 'Media'}`,
                      timestamp:        message.createdAt,
                    });
                  }
                }
              }
            }
          }
        } catch (asyncErr) {
          console.error('[Upload Controller] Async socket broadcast/notification failed:', asyncErr);
        }
      });

      res.status(201).json({
        success:    true,
        data: {
          message: {
            id:          message._id.toString(),
            channelId:   message.channelId.toString(),
            senderId:    message.senderId.toString(),
            type:        message.type,
            attachments: message.attachments,
            createdAt:   message.createdAt,
          },
          attachment,
        },
      });
    }),
  ],
};

module.exports = uploadController;
