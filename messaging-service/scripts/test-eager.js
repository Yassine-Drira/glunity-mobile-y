'use strict';

require('dotenv').config({ override: true });
const path = require('path');
const https = require('https');
const { URL } = require('url');
const cloud = require('../src/integrations/cloudinary.client');

function downloadFile(urlStr) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const options = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Handle redirect
        console.log(`Redirected to: ${res.headers.location}`);
        downloadFile(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: status code ${res.statusCode}`));
        return;
      }
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

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
    {
      width: 400, height: 400,
      crop: 'fill', gravity: 'center',
      format: 'jpg', start_offset: '0',
    },
  ];
}

async function testUpload(type, buffer, isImage, isVideo) {
  const resourceType = isImage ? 'image' : (isVideo ? 'video' : 'auto');
  const folderSuffix = isImage ? 'images' : (isVideo ? 'videos' : 'files');

  const opts = {
    resource_type: resourceType,
    folder:        `glunity/messaging/test_channel/${folderSuffix}`,
    filename:      `test_${type}`,
    mimetype:      isImage ? 'image/png' : 'video/mp4',
    use_filename:  true,
    unique_filename: true,
    overwrite:     false,
    eager: isImage ? imageThumbnailEager() : (isVideo ? videoThumbnailEager() : []),
    eager_async: false,
  };

  console.log(`\nUploading ${type} with options:`, opts);
  try {
    const res = await cloud.uploadBuffer(buffer, opts);
    console.log(`Upload ${type} success!`);
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(`Upload ${type} failed:`, err);
  }
}

async function main() {
  console.log('Starting Cloudinary video/image eager transformation tests...');

  // 1. Image
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9YqG7AAAAABJRU5ErkJggg==';
  const imgBuffer = Buffer.from(pngBase64, 'base64');
  await testUpload('image', imgBuffer, true, false);

  // 2. Video
  console.log('\nDownloading sample video...');
  const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
  try {
    const videoBuffer = await downloadFile(videoUrl);
    console.log(`Downloaded video, size: ${videoBuffer.length} bytes`);
    await testUpload('video', videoBuffer, false, true);
  } catch (err) {
    console.error('Failed to download/upload video:', err.message);
  }
}

main();
