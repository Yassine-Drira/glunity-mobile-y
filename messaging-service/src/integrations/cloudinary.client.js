'use strict';

/**
 * Thin Cloudinary v2 wrapper for the messaging-service.
 * Mirrors api/src/app/integrations/cloudinary/cloudinary.client.js so both
 * services share identical upload behaviour without a shared package.
 *
 * When CLOUDINARY_* env vars are absent (local dev), files are written to
 * messaging-service/uploads/ and served from there.
 */

const cloudinary = require('cloudinary').v2;
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const env        = require('../../config/env');

// ── Configure once at module load ─────────────────────────────────────────────

const configured =
  env.cloudinary?.cloudName &&
  env.cloudinary?.apiKey   &&
  env.cloudinary?.apiSecret;

if (configured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key:    env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MIME → extension map (used by the local fallback)
// ─────────────────────────────────────────────────────────────────────────────

const MIME_EXT = {
  'image/jpeg':  '.jpg',
  'image/jpg':   '.jpg',
  'image/png':   '.png',
  'image/gif':   '.gif',
  'image/webp':  '.webp',
  'video/mp4':   '.mp4',
  'video/webm':  '.webm',
};

// ─────────────────────────────────────────────────────────────────────────────
// uploadBuffer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a raw Buffer to Cloudinary (or local disk in dev).
 *
 * @param {Buffer} buffer
 * @param {object} opts   – passed directly to cloudinary.uploader.upload_stream
 *   opts.folder          – e.g. 'glunity/messaging'
 *   opts.resource_type   – 'image' | 'video' | 'auto'
 *   opts.filename        – original filename (used for extension in local fallback)
 *   opts.mimetype        – MIME type (used for extension in local fallback)
 *   opts.eager           – Cloudinary eager transformations array
 * @returns {Promise<CloudinaryUploadResult>}
 */
async function uploadBuffer(buffer, opts = {}) {
  if (configured) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(opts, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
      stream.end(buffer);
    });
  }

  // ── Local fallback ─────────────────────────────────────────────────────────
  const uploadDir = path.join(__dirname, '..', '..', '..', '..', 'messaging-service', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  let ext = '';
  if (opts.filename) ext = path.extname(opts.filename);
  if (!ext && opts.mimetype) ext = MIME_EXT[opts.mimetype] || '';
  if (!ext) ext = opts.resource_type === 'image' ? '.jpg' : '.mp4';
  if (!ext.startsWith('.')) ext = '.' + ext;

  const safeFolder = (opts.folder || 'files').replace(/[/\\]+/g, '_');
  const filename   = `${safeFolder}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const filePath   = path.join(uploadDir, filename);

  fs.writeFileSync(filePath, buffer);

  const base = (env.media?.appUrl || 'http://localhost:5001').replace(/\/$/, '');
  return {
    secure_url: `${base}/uploads/${filename}`,
    url:        `${base}/uploads/${filename}`,
    public_id:  filename,
    resource_type: opts.resource_type || 'auto',
    // local fallback doesn't generate real thumbnails
    eager: [],
  };
}

module.exports = { cloudinary, uploadBuffer, isConfigured: !!configured };
