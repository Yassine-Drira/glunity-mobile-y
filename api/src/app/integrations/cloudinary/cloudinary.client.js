'use strict';

const cloudinary = require('cloudinary').v2;
const env = require('../../config/env');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

if (env.cloudinary && env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
} else {
  // leave unconfigured — but provide a local fallback in uploadBuffer for dev
}

async function uploadBuffer(buffer, opts = {}) {
  // If Cloudinary is configured, use it. Otherwise store the buffer locally and return a local URL (development fallback).
  if (cloudinary.config().cloud_name) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(opts, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
      stream.end(buffer);
    });
  }

  // Local fallback: write file to api/uploads and return a URL pointing to the static route
  try {
    // write to api/uploads so the static route in app.js can serve it
    const uploadDir = path.join(__dirname, '..', '..', '..', '..', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    const safeFolder = (opts.folder || 'files').replace(/[\/]+/g, '_');
    // Determine extension from provided filename or mimetype when possible
    let ext = '';
    if (opts.filename) {
      ext = path.extname(opts.filename) || '';
    }
    if (!ext && opts.mimetype) {
      const mimeMap = {
        'audio/m4a': '.m4a', 'audio/x-m4a': '.m4a', 'audio/mp4': '.m4a',
        'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav',
        'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
        'video/mp4': '.mp4'
      };
      ext = mimeMap[opts.mimetype] || '';
    }
    if (!ext) {
      ext = (opts.resource_type === 'image') ? '.jpg' : (opts.resource_type === 'video' ? '.mp4' : '.bin');
    }
    if (!ext.startsWith('.')) ext = '.' + ext;
    const filename = `${safeFolder}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    const urlBase = (env.APP_URL || 'http://localhost:5000').replace(/\/$/, '');
    return { secure_url: `${urlBase}/uploads/${filename}`, url: `${urlBase}/uploads/${filename}`, public_id: filename };
  } catch (err) {
    throw err;
  }
}

module.exports = {
  uploadBuffer,
};
