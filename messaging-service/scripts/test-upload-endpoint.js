'use strict';

require('dotenv').config({ override: true });
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');

const Channel = require(path.join(__dirname, '..', 'src', 'database', 'models', 'channel.model'));

async function main() {
  const jwt = process.env.TEST_JWT;
  if (!jwt) {
    console.error('TEST_JWT env var required');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI missing');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  // Find a channel where the test user is a participant
  const userId = (process.env.TEST_USER_ID || '').toString();
  if (!userId) {
    console.error('TEST_USER_ID env var required');
    process.exit(1);
  }

  // Load channels and pick one where the participants list contains the user.
  const all = await Channel.find({}).lean();
  let channel = null;
  for (const c of all) {
    const parts = c.participants || c.members || [];
    if (Array.isArray(parts)) {
      // Normalize participant items to strings where possible
      const ids = parts.map((p) => {
        if (!p) return null;
        if (typeof p === 'string') return String(p);
        if (p.userId) return String(p.userId);
        if (p._id) return String(p._id);
        if (p.id) return String(p.id);
        return null;
      }).filter(Boolean);
      if (ids.includes(userId)) { channel = c; break; }
    }
  }

  if (!channel) {
    console.error('No channel found for user:', userId);
    process.exit(1);
  }

  const channelId = channel._id.toString();
  console.log('Found channel:', channelId);

  // 1x1 PNG buffer
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9YqG7AAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');

  const form = new FormData();
  form.append('file', buffer, { filename: 'test-upload.png', contentType: 'image/png' });

  try {
    const res = await axios.post(`http://localhost:5001/api/channels/${channelId}/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${jwt}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    console.log('Upload response status:', res.status);
    console.log('Body:', res.data && res.data.data ? res.data.data : res.data);
  } catch (err) {
    console.error('Upload request failed:', err.response ? err.response.status : err.message, err.response ? err.response.data : '');
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();
