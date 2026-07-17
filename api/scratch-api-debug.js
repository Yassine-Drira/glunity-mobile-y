require('./src/app/bootstrap/env.bootstrap');
const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://yassinedrira3_db_user:FUweqk0OZyS3rLao@glutenmobile.vxtr1qm.mongodb.net/glunity?appName=GlutenMOBILE';
const Event = require('./src/database/models/event.model');

async function test() {
  console.log('Connecting to DB...');
  await mongoose.connect(MONGO_URI);
  console.log('DB connected');

  const query = {
    isPublished: true,
    isCancelled: { $ne: true },
    status: { $ne: 'cancelled' }
  };

  console.log('Test 1: Event.countDocuments...');
  const total = await Event.countDocuments(query);
  console.log('Test 1 success, total:', total);

  console.log('Test 2: Event.aggregate...');
  const pipeline = [
    { $match: query },
    { $sort: { startsAt: 1 } },
    { $skip: 0 },
    { $limit: 50 },
    { $addFields: { attendeesCount: { $size: { $ifNull: ['$attendees', []] } } } },
    { $project: { attendees: 0 } },
  ];
  const items = await Event.aggregate(pipeline);
  console.log('Test 2 success, items count:', items.length);

  // Now, let's load repo and run repo.findMany
  console.log('Loading repo...');
  const repo = require('./src/app/modules/events/events.repository');
  console.log('Calling repo.findMany...');
  const res = await repo.findMany({});
  console.log('Repo.findMany success, items count:', res.items.length);

  await mongoose.disconnect();
  console.log('Disconnected');
}

test().catch(console.error);
