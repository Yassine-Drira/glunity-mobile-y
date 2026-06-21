'use strict';

require('dotenv').config({ override: true });
const path = require('path');
const fs = require('fs');

const cloud = require(path.join(__dirname, '..', 'src', 'integrations', 'cloudinary.client'));

async function main() {
  console.log('Uploading test image to Cloudinary/local fallback...');

  // 1x1 PNG (transparent)
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9YqG7AAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');

  try {
    const res = await cloud.uploadBuffer(buffer, { folder: 'glunity/messaging', resource_type: 'image', filename: 'test.png', mimetype: 'image/png' });
    console.log('Upload result:', res && (res.secure_url || res.url || res));
  } catch (err) {
    console.error('Upload failed:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();
