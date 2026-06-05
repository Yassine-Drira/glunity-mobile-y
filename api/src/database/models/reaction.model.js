'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const reactionSchema = new Schema(
  {
    messageId: { type: Types.ObjectId, ref: 'Message', required: true, index: true },
    userId:    { type: Types.ObjectId, ref: 'User',    required: true },
    emoji:     { type: String, required: true, trim: true },
  },
  { timestamps: true, versionKey: false }
);

// One reaction per user per emoji per message
reactionSchema.index({ messageId: 1, userId: 1, emoji: 1 }, { unique: true });

const Reaction = model('Reaction', reactionSchema);
module.exports = Reaction;
