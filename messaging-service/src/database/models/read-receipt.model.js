'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const readReceiptSchema = new Schema(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastReadMessageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    lastReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

readReceiptSchema.index({ channelId: 1, userId: 1 }, { unique: true });

module.exports = model('ReadReceipt', readReceiptSchema);
