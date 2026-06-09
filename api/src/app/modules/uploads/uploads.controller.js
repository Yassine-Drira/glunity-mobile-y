'use strict';

const cloudinaryClient = require('../../integrations/cloudinary/cloudinary.client');
const logger = require('../../bootstrap/logger.bootstrap');

async function uploadFile(req, res, next) {
  try {
    // Accept multipart file (preferred) or a JSON body containing base64 data (fallback for web clients)
    let fileBuffer = null;
    let originalname = null;
    let mimetype = '';

    if (req.file && req.file.buffer) {
      fileBuffer = req.file.buffer;
      originalname = req.file.originalname;
      mimetype = req.file.mimetype || '';
    } else if (req.body && req.body.fileBase64) {
      // Fallback: accept base64 in JSON body: { fileBase64, filename, mimetype }
      try {
        fileBuffer = Buffer.from(req.body.fileBase64, 'base64');
        originalname = req.body.filename || 'upload.bin';
        mimetype = req.body.mimetype || '';
      } catch (e) {
        const err = new Error('Invalid base64 payload');
        err.status = 400;
        throw err;
      }
    } else if (req.body && req.body.file && typeof req.body.file === 'string') {
      // Accept 'file' as data URI (data:...;base64,...) or raw base64 string
      const val = req.body.file;
      try {
        if (val.startsWith('data:')) {
          const parts = val.split(',');
          const meta = parts[0];
          const data = parts[1] || '';
          const m = meta.match(/^data:([^;]+);base64/);
          if (m) mimetype = m[1];
          fileBuffer = Buffer.from(data, 'base64');
        } else if (/^[A-Za-z0-9+\/=\n\r]+$/.test(val) && val.length > 100) {
          fileBuffer = Buffer.from(val, 'base64');
        }
        originalname = req.body.filename || 'upload.bin';
      } catch (e) {
        // fallthrough to error below
      }
    } else {
      // Log helpful debug information to aid clients that send incorrect payloads
      logger.error('[uploads] no file in request', { headers: req.headers, bodyKeys: Object.keys(req.body || {}) });
      const err = new Error('No file uploaded');
      err.status = 400;
      throw err;
    }

    const isImage = (mimetype || '').startsWith('image');
    const isAudio = (mimetype || '').startsWith('audio');

    const opts = { resource_type: 'auto', folder: 'glunity/messages', filename: originalname, mimetype };
    if (isImage) opts.folder = 'glunity/messages/images';
    if (isAudio) opts.folder = 'glunity/messages/audio';

    if (!fileBuffer) {
      logger.error('[uploads] no file buffer after parsing body', { bodyKeys: Object.keys(req.body || {}), sample: String(req.body?.file || '').slice(0, 120) });
      const err = new Error('No file uploaded');
      err.status = 400;
      throw err;
    }

    const result = await cloudinaryClient.uploadBuffer(fileBuffer, opts);

    const response = {
      url: result.secure_url || result.url,
      publicId: result.public_id,
      type: isImage ? 'image' : isAudio ? 'audio' : 'file',
      filename: originalname,
      size: fileBuffer ? fileBuffer.length : 0,
      raw: result,
    };

    res.status(201).json({ success: true, data: response });
  } catch (err) {
    logger.error('[uploads] failed', { err: err.message });
    next(err);
  }
}

module.exports = { uploadFile };
