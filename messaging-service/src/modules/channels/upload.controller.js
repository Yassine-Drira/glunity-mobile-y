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
      const channel = await Channel.findOne({
        _id:                   channelId,
        'participants.userId': senderId,
        deletedAt:             null,
      }).lean();

      if (!channel) {
        const err = new Error('Channel not found or access denied');
        err.status = channel === null ? 404 : 403;
        throw err;
      }

      // ── Upload to Cloudinary ─────────────────────────────────────────────
      const attachment = await uploadService.uploadAttachment(req.file, channelId);

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
