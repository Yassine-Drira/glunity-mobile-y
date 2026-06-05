'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const reactionSchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji:     { type: String, required: true },
  },
  { timestamps: true }
);

// Ensure one specific reaction per user per message
reactionSchema.index({ messageId: 1, userId: 1, emoji: 1 }, { unique: true });

module.exports = model('Reaction', reactionSchema);
