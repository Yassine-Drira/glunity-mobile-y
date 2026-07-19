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
  
  console.log('Running Event.countDocuments...');
  const total = await Event.countDocuments(query);
  console.log('Total:', total);
  
  console.log('Running Event.aggregate...');
  const pipeline = [
    { $match: query },
    { $sort: { startsAt: 1 } },
    { $skip: 0 },
    { $limit: 50 },
    { $addFields: { attendeesCount: { $size: { $ifNull: ['$attendees', []] } } } },
    { $project: { attendees: 0 } },
  ];
  const items = await Event.aggregate(pipeline);
  console.log('Items:', items);
  
  await mongoose.disconnect();
  console.log('Disconnected');
}

test().catch(console.error);
