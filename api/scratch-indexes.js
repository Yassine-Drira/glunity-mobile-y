const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://yassinedrira3_db_user:FUweqk0OZyS3rLao@glutenmobile.vxtr1qm.mongodb.net/glunity?appName=GlutenMOBILE';

async function test() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected');

  console.log('Listing indexes for events collection...');
  const indexes = await mongoose.connection.db.collection('events').indexes();
  console.log('Indexes:', JSON.stringify(indexes, null, 2));

  await mongoose.disconnect();
  console.log('Disconnected');
}

test().catch(console.error);
