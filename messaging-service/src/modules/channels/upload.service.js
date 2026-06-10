'use strict';

/**
 * Upload Service — messaging-service
 *
 * Handles all media ingestion for the channel upload endpoint.
 * Uses multer memory-storage so no temp files hit the disk before Cloudinary.
 *
 * Supported MIME types & size limits:
 *   Images  : image/jpeg, image/png, image/gif, image/webp  → max 10 MB
 *   Videos  : video/mp4, video/webm                         → max 50 MB
 *
 * Thumbnail strategy:
 *   Images → Cloudinary eager transformation (400 × 400 c_fill, q_auto)
 *   Videos → Cloudinary eager transformation (first frame as jpg poster)
 *   Local fallback → thumbnailUrl = null (client renders a default icon)
 */

const cloudinaryClient = require('../../integrations/cloudinary.client');
const env              = require('../../config/env');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/webm']);
const ALL_ALLOWED  = new Set([...IMAGE_MIMES, ...VIDEO_MIMES]);

const MAX_IMAGE = env.media?.maxImageSize ?? 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO = env.media?.maxVideoSize ?? 50 * 1024 * 1024;  // 50 MB

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createError(msg, status, code) {
  const err = new Error(msg);
  err.status = status;
  if (code) err.code = code;
  return err;
}

/**
 * multer fileFilter — called synchronously by multer before any buffering.
 * Rejects files whose MIME type is not on the whitelist.
 */
function mediaFileFilter(_req, file, cb) {
  if (ALL_ALLOWED.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      createError(
        `File type "${file.mimetype}" is not allowed. Accepted: jpg, png, gif, webp, mp4, webm`,
        415,
        'UNSUPPORTED_MEDIA_TYPE'
      )
    );
  }
}

/**
 * multer limits — use the LARGER of the two caps so one multer instance covers
 * both images and videos. The per-MIME cap is enforced after buffering.
 */
const multerLimits = { fileSize: MAX_VIDEO };

// ─────────────────────────────────────────────────────────────────────────────
// Eager transformation builders
// ─────────────────────────────────────────────────────────────────────────────

function imageThumbnailEager() {
  return [
    {
      width: 400, height: 400,
      crop: 'fill', gravity: 'auto',
      quality: 'auto', fetch_format: 'auto',
      format: 'jpg',
    },
  ];
}

function videoThumbnailEager() {
  return [
    // Poster frame at 0 seconds, resized to 400 × 400
    {
      resource_type: 'video',
      width: 400, height: 400,
      crop: 'fill', gravity: 'center',
      format: 'jpg', start_offset: '0',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

const uploadService = {

  /** Exported so the route can pass it directly to multer() */
  fileFilter: mediaFileFilter,
  limits:     multerLimits,

  /**
   * Upload a single file buffer to Cloudinary (or local disk).
   * Returns a shaped attachment object ready to be pushed into
   * Message.attachments[].
   *
   * @param {object} file      – multer file object (req.file)
   * @param {string} channelId – used to organise Cloudinary folder
   * @returns {Promise<Attachment>}
   */
  async uploadAttachment(file, channelId) {
    const { buffer, mimetype, originalname, size } = file;
    const isImage = IMAGE_MIMES.has(mimetype);
    const isVideo = VIDEO_MIMES.has(mimetype);

    // ── Per-type size enforcement ─────────────────────────────────────────
    if (isImage && size > MAX_IMAGE) {
      throw createError(`Image exceeds ${MAX_IMAGE / 1024 / 1024} MB limit`, 413, 'FILE_TOO_LARGE');
    }
    if (isVideo && size > MAX_VIDEO) {
      throw createError(`Video exceeds ${MAX_VIDEO / 1024 / 1024} MB limit`, 413, 'FILE_TOO_LARGE');
    }

    // ── Build Cloudinary opts ─────────────────────────────────────────────
    const resourceType = isImage ? 'image' : 'video';
    const opts = {
      resource_type: resourceType,
      folder:        `glunity/messaging/${channelId}/${isImage ? 'images' : 'videos'}`,
      filename:      originalname,
      mimetype,
      use_filename:  true,
      unique_filename: true,
      overwrite:     false,
      // Request eager thumbnail generation when Cloudinary is configured
      eager: isImage ? imageThumbnailEager() : videoThumbnailEager(),
      eager_async: false, // wait for eager transforms before returning
    };

    const result = await cloudinaryClient.uploadBuffer(buffer, opts);

    // ── Extract thumbnail URL ─────────────────────────────────────────────
    // eager[0] is the thumbnail transformation result
    const thumbnailUrl =
      result.eager?.[0]?.secure_url ??
      result.eager?.[0]?.url        ??
      null;

    // ── Shape the attachment ──────────────────────────────────────────────
    return {
      url:       result.secure_url || result.url,
      publicId:  result.public_id,
      type:      isImage ? 'image' : 'video',
      filename:  originalname,
      size:      size ?? buffer.length,
      mimeType:  mimetype,
      thumbnail: thumbnailUrl,
      duration:  result.duration ?? null, // populated by Cloudinary for video
    };
  },
};

module.exports = uploadService;
