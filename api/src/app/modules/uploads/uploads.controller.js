'use strict';

const cloudinaryClient = require('../../integrations/cloudinary/cloudinary.client');
const logger = require('../../bootstrap/logger.bootstrap');

async function uploadFile(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      const err = new Error('No file uploaded');
      err.status = 400;
      throw err;
    }

    const mimetype = req.file.mimetype || '';
    const isImage = mimetype.startsWith('image');
    const isAudio = mimetype.startsWith('audio');

    const opts = { resource_type: 'auto', folder: 'glunity/messages' };
    if (isImage) opts.folder = 'glunity/messages/images';
    if (isAudio) opts.folder = 'glunity/messages/audio';

    const result = await cloudinaryClient.uploadBuffer(req.file.buffer, opts);

    const response = {
      url: result.secure_url || result.url,
      publicId: result.public_id,
      type: isImage ? 'image' : isAudio ? 'audio' : 'file',
      filename: req.file.originalname,
      size: req.file.size,
      raw: result,
    };

    res.status(201).json({ success: true, data: response });
  } catch (err) {
    logger.error('[uploads] failed', { err: err.message });
    next(err);
  }
}

module.exports = { uploadFile };
