'use strict';

require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

async function main() {
  const mongoUri = String(process.env.MONGO_URI || '')
    .trim()
    .replace(/^['\"]|['\"]$/g, '');
  if (!mongoUri) throw new Error('MONGO_URI missing in .env');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected');

  // Load model
  const Message = require(path.join(__dirname, '../src/database/models/message.model'));

  // Query messages with attachments containing '/uploads/'
  console.log('Querying messages with /uploads/ attachments...');
  const cursor = Message.find({ 'attachments.url': /\/uploads\// }).cursor();

  const results = [];

  const apiUploadsDir = path.join(__dirname, '..', 'uploads');
  const messagingUploadsDir = path.join(__dirname, '..', '..', 'messaging-service', 'uploads');

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const msg = doc.toObject ? doc.toObject() : doc;
    for (const att of msg.attachments || []) {
      if (!att.url || !att.url.includes('/uploads/')) continue;
      const parts = att.url.split('/uploads/');
      const filename = parts[1] || parts[parts.length - 1];
      const apiPath = path.join(apiUploadsDir, filename || '');
      const msgPath = path.join(messagingUploadsDir, filename || '');
      const existsApi = fs.existsSync(apiPath);
      const existsMsg = fs.existsSync(msgPath);
      results.push({
        messageId: String(msg._id),
        channelId: String(msg.channelId),
        attachmentUrl: att.url,
        filename,
        existsInApiUploads: existsApi,
        existsInMessagingUploads: existsMsg,
        apiPath: apiPath,
        messagingPath: msgPath,
      });
    }
  }

  await mongoose.connection.close();

  const missing = results.filter(r => !r.existsInApiUploads && !r.existsInMessagingUploads);
  console.log('\n--- REPORT ---');
  console.log(`Total attachments found: ${results.length}`);
  console.log(`Missing on both services: ${missing.length}\n`);

  if (missing.length) {
    console.log('Sample missing entries (up to 100):');
    console.log(JSON.stringify(missing.slice(0, 100), null, 2));
  } else {
    console.log('No missing files found; attachments exist on disk.');
  }

  // Also write full JSON to disk for inspection
  const outPath = path.join(__dirname, 'missing-uploads-report.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log(`Full report written to: ${outPath}`);
}

main().catch((err) => {
  console.error('Error:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
