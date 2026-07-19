const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://yassinedrira3_db_user:FUweqk0OZyS3rLao@glutenmobile.vxtr1qm.mongodb.net/glunity?appName=GlutenMOBILE';

async function test() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected');

  console.log('Querying ALL events...');
  const start = Date.now();
  const items = await mongoose.connection.db.collection('events').find({}).toArray();
  console.log(`Raw find({}) returned ${items.length} items in ${Date.now() - start}ms`);
  
  await mongoose.disconnect();
  console.log('Disconnected');
}

test().catch(console.error);
