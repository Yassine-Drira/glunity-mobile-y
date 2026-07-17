const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://yassinedrira3_db_user:FUweqk0OZyS3rLao@glutenmobile.vxtr1qm.mongodb.net/glunity?appName=GlutenMOBILE';

async function test() {
  console.log('Connecting to MongoDB...');
  const start = Date.now();
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(`Connected in ${Date.now() - start}ms`);
    
    console.log('Listing collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    console.log('Querying events...');
    const eventCount = await mongoose.connection.db.collection('events').countDocuments();
    console.log('Event count:', eventCount);
    
    console.log('Querying notifications...');
    const notifCount = await mongoose.connection.db.collection('notifications').countDocuments();
    console.log('Notification count:', notifCount);
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

test();
