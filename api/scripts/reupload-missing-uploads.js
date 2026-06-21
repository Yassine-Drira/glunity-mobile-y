'use strict';

require('dotenv').config({ override: true });
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

async function main() {
  const mongoUri = String(process.env.MONGO_URI || '').trim().replace(/^['\"]|['\"]$/g, '');
  if (!mongoUri) throw new Error('MONGO_URI missing in .env');

  const reportPath = path.join(__dirname, 'missing-uploads-report.json');
  if (!fs.existsSync(reportPath)) throw new Error('missing-uploads-report.json not found. Run find-missing-uploads.js first.');

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const missing = (report.results || []).filter(r => !r.existsInApiUploads && !r.existsInMessagingUploads);
  if (!missing || missing.length === 0) {
    console.log('No missing entries to process.');
    return;
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected');

  const Message = require(path.join(__dirname, '..', 'src', 'database', 'models', 'message.model'));
  const cloud = require(path.join(__dirname, '..', 'src', 'app', 'integrations', 'cloudinary', 'cloudinary.client'));

  // Placeholder 1x1 PNG
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9YqG7AAAAABJRU5ErkJggg==';
  const pngBuf = Buffer.from(pngBase64, 'base64');

  const results = [];

  for (const item of missing) {
    try {
      const filename = item.filename || `placeholder-${Date.now()}.png`;
      // Determine guessed mime/type by extension
      const ext = (filename.split('.').pop() || '').toLowerCase();
      let resourceType = 'image';
      let mime = 'image/png';
      if (['mp4','webm','mov'].includes(ext)) { resourceType = 'auto'; mime = 'video/mp4'; }
      if (['mp3','m4a','wav','webm','ogg'].includes(ext)) { resourceType = 'auto'; mime = 'audio/mpeg'; }

      const opts = { folder: `glunity/messaging/placeholders`, resource_type: resourceType, filename, mimetype: mime };
      const uploadRes = await cloud.uploadBuffer(pngBuf, opts);
      const newUrl = uploadRes.secure_url || uploadRes.url;
      const publicId = uploadRes.public_id || uploadRes.publicId || uploadRes.publicId;
      const thumbnail = uploadRes.eager && uploadRes.eager[0] ? (uploadRes.eager[0].secure_url || uploadRes.eager[0].url) : (uploadRes.secure_url || uploadRes.url);

      // Update Message attachment entry that matches the old URL
      const msg = await Message.findById(item.messageId);
      if (!msg) {
        results.push({ messageId: item.messageId, ok: false, reason: 'Message not found' });
        continue;
      }

      let updated = false;
      const newAttachments = (msg.attachments || []).map((att) => {
        if (att && att.url && att.url.includes(item.filename)) {
          updated = true;
          return {
            ...att.toObject ? att.toObject() : att,
            url: newUrl,
            publicId: publicId || att.publicId || att.public_id,
            thumbnail: thumbnail || att.thumbnail || att.thumb || null,
            mimeType: att.mimeType || mime,
            size: att.size || 0,
          };
        }
        return att;
      });

      if (updated) {
        msg.attachments = newAttachments;
        await msg.save();
        results.push({ messageId: item.messageId, ok: true, newUrl });
        console.log('Updated message', item.messageId, '->', newUrl);
      } else {
        results.push({ messageId: item.messageId, ok: false, reason: 'Attachment filename not matched in message.attachments' });
      }
    } catch (err) {
      console.error('Failed for', item.messageId, err && err.message ? err.message : err);
      results.push({ messageId: item.messageId, ok: false, reason: err && err.message ? err.message : String(err) });
    }
  }

  // Write results
  const out = path.join(__dirname, 'reupload-results.json');
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log('Wrote results to', out);

  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('Error:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
