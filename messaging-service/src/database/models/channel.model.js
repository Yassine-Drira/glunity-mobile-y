'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const participantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role:   { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    muted:  { type: Boolean, default: false },
    /** Snapshot of last read position for unread-count derivation (redundant
     *  with ReadReceipt, but keeps channel list queries fast — no join needed). */
    lastReadAt: { type: Date, default: null },
  },
  { _id: false }
);

const lastMessageSchema = new Schema(
  {
    messageId:  { type: Schema.Types.ObjectId, ref: 'Message' },
    senderId:   { type: Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String },
    /** Denormalized snippet (max 200 chars) for channel-list previews. */
    content:    { type: String, maxlength: 200, default: '' },
    /** Mirrors Message.type so the client can render the right preview icon. */
    type: {
      type:    String,
      enum:    ['text', 'media', 'reel', 'system'],
      default: 'text',
    },
    createdAt: { type: Date },
  },
  { _id: false }
);

const pinnedMessageSchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    pinnedAt:  { type: Date, default: Date.now },
    pinnedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────

const channelSchema = new Schema(
  {
    name:        { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 500 },

    /** Profile photo URL for group channels (stored on Cloudinary). */
    avatarUrl: { type: String, trim: true, default: null },

    /** 'group' for multi-user rooms; 'DM' for 1-to-1 direct messages;
     *  'social' kept for backwards-compat with the social-feed feed feature. */
    type: {
      type:     String,
      enum:     ['DM', 'direct', 'group', 'social'],
      required: true,
      default:  'group',
    },

    /** When true, only participants may read messages (enforced in service layer). */
    isPrivate: { type: Boolean, default: true },

    participants:    [participantSchema],
    lastMessage:     { type: lastMessageSchema, default: null },
    pinnedMessages:  { type: [pinnedMessageSchema], default: [] },

    /** Maintained via $inc on every message insert/soft-delete.
     *  Lets clients display "234 messages" without an aggregate. */
    messageCount:  { type: Number, default: 0, min: 0 },

    createdById: { type: Schema.Types.ObjectId, ref: 'User' },

    /** Soft-delete at channel level (optional future use). */
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

/**
 * PRIMARY QUERY INDEX
 * Supports: "give me all group channels that user X is a participant of"
 * Used in channel-list queries, e.g.:
 *   Channel.find({ type: 'group', 'participants.userId': userId })
 */
channelSchema.index({ type: 1, 'participants.userId': 1 });

/**
 * DM LOOKUP INDEX
 * Fast duplicate-DM check and DM channel lookup.
 * Used when opening a DM: find({ type: 'DM', 'participants.userId': { $all: [a, b] } })
 */
channelSchema.index({ 'participants.userId': 1, type: 1 });

/** Sort channels by most-recent activity on the channel-list screen. */
channelSchema.index({ 'lastMessage.createdAt': -1 });

/** Soft-delete filter (future). */
channelSchema.index({ deletedAt: 1 }, { sparse: true });

// ── Statics ───────────────────────────────────────────────────────────────────

/**
 * Atomically update the denormalized lastMessage snapshot.
 * Called by the message service immediately after saving a new message.
 *
 * @param {string|ObjectId} channelId
 * @param {object} message  – saved Mongoose document
 */
channelSchema.statics.updateLastMessage = async function (channelId, message) {
  let updated = await this.findOneAndUpdate(
    {
      _id: channelId,
      'participants.userId': message.senderId,
    },
    {
      $set: {
        lastMessage: {
          messageId:  message._id,
          senderId:   message.senderId,
          content:    (message.content || '').substring(0, 200),
          type:       message.type,
          createdAt:  message.createdAt || new Date(),
        },
        'participants.$.lastReadAt': message.createdAt || new Date(),
      },
      $inc: { messageCount: 1 },
    },
    { returnDocument: 'after', timestamps: false }
  );

  if (!updated) {
    updated = await this.findByIdAndUpdate(
      channelId,
      {
        $set: {
          lastMessage: {
            messageId:  message._id,
            senderId:   message.senderId,
            content:    (message.content || '').substring(0, 200),
            type:       message.type,
            createdAt:  message.createdAt || new Date(),
          },
        },
        $inc: { messageCount: 1 },
      },
      { returnDocument: 'after', timestamps: false }
    );
  }
  return updated;
};

module.exports = model('Channel', channelSchema);
