'use strict';
require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const path = require('path');
(async () => {
  const id = process.argv[2];
  if (!id) { console.error('Usage: node inspect-message.js <messageId>'); process.exit(1); }
  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  const Message = require(path.join(__dirname, '..', 'src', 'database', 'models', 'message.model'));
  try {
    const m = await Message.findById(id).lean();
    console.log(JSON.stringify(m, null, 2));
  } catch (err) { console.error(err); }
  await mongoose.connection.close();
})();
