'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const imageSchema = new Schema(
  {
    url: { type: String, default: null },
    publicId: { type: String, default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    profileType: { type: String, default: 'celiac' },
    avatar: imageSchema,
    pinnedGroups: [{ type: Schema.Types.ObjectId, ref: 'Channel' }],
    isActive: { type: Boolean, default: true, index: true },
    emailVerified: { type: Boolean, default: false },
    onlineStatus: { type: String, enum: ['online', 'offline'], default: 'offline', index: true },
    lastSeenAt: { type: Date, default: null },
    lastActiveAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = model('User', userSchema);
