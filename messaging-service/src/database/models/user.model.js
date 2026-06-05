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
    fullName:    { type: String, required: true },
    email:       { type: String, required: true, unique: true },
    profileType: { type: String, default: 'celiac' },
    avatar:      imageSchema,
    isActive:    { type: Boolean, default: true, index: true },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model('User', userSchema);
