const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://yassinedrira3_db_user:FUweqk0OZyS3rLao@glutenmobile.vxtr1qm.mongodb.net/glunity?appName=GlutenMOBILE';
const Event = require('./src/database/models/event.model');

async function test() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected');

  const query = {
    isPublished: true,
    isCancelled: { $ne: true },
    status: { $ne: 'cancelled' }
  };

  console.log('Running Event.find...');
  const start = Date.now();
  const items = await Event.find(query).lean();
  console.log(`Event.find returned ${items.length} items in ${Date.now() - start}ms`);
  
  await mongoose.disconnect();
  console.log('Disconnected');
}

test().catch(console.error);
