'use strict';

/**
 * Reel-Share Service — messaging-service
 *
 * Validates a reelId against the API's Reel collection (cross-DB read via
 * a shared Mongoose connection on the same MongoDB cluster), fetches its
 * metadata, and creates a new Message with type='reel' and a populated
 * reelRef field.
 *
 * Architecture note:
 * ─────────────────
 * The Reel collection lives in the main API database (same Atlas cluster,
 * database name = process.env.REEL_DB_NAME or defaults to the MONGO_URI db).
 * Rather than an HTTP call to the API service (adding latency + coupling),
 * we open a second Mongoose connection to the same cluster and query directly.
 * This is a read-only, non-transactional operation so a separate connection
 * is safe.
 *
 * If REEL_DB_NAME is not set, the service falls back to the same database as
 * the messaging service (monorepo / single-DB setups).
 */

const mongoose = require('mongoose');
const Message  = require('../../database/models/message.model');
const Channel  = require('../../database/models/channel.model');

// ── Lazy reel-DB connection ───────────────────────────────────────────────────

let _reelConnection = null;
let _ReelModel      = null;

/**
 * Minimal Reel schema mirroring api/src/database/models/reel.model.js.
 * Only the fields we need for the reelRef snapshot.
 */
const reelRefSchema = new mongoose.Schema(
  {
    authorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    videoUrl:     String,
    thumbnailUrl: String,
    caption:      String,
    duration:     Number,
  },
  { collection: 'reels', versionKey: false }
);

/**
 * Returns (and caches) the Reel model bound to the correct DB connection.
 */
async function getReelModel() {
  if (_ReelModel) return _ReelModel;

  const uri    = process.env.MONGO_URI;
  const dbName = process.env.REEL_DB_NAME || null; // null = use URI default db

  _reelConnection = await mongoose.createConnection(uri, {
    dbName: dbName || undefined,
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  _ReelModel = _reelConnection.model('Reel', reelRefSchema);
  return _ReelModel;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createError(msg, status, code) {
  const err = new Error(msg);
  err.status = status;
  if (code) err.code = code;
  return err;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

const reelShareService = {

  /**
   * Validate a reelId and return its metadata snapshot.
   * Throws 404 if the reel does not exist or has been deleted.
   *
   * @param {string|ObjectId} reelId
   * @returns {Promise<{ reelId, thumbnailUrl, title }>}
   */
  async validateAndFetchReel(reelId) {
    if (!mongoose.Types.ObjectId.isValid(String(reelId))) {
      throw createError('Invalid reelId', 400, 'VALIDATION_ERROR');
    }

    const ReelModel = await getReelModel();
    const reel = await ReelModel.findById(reelId)
      .select('thumbnailUrl caption duration')
      .lean();

    if (!reel) {
      throw createError('Reel not found or has been deleted', 404, 'NOT_FOUND');
    }

    return {
      reelId:       reel._id,
      thumbnailUrl: reel.thumbnailUrl ?? null,
      title:        reel.caption      ?? '',   // caption is used as the display title
      duration:     reel.duration     ?? 0,
    };
  },

  /**
   * Create a new message that shares a reel into a channel.
   *
   * Steps:
   *  1. Assert the sender is a participant of the channel.
   *  2. Validate the reel exists and fetch its metadata.
   *  3. Persist a Message with type='reel' and populated reelRef.
   *  4. Update Channel.lastMessage + increment messageCount.
   *
   * @param {string|ObjectId} channelId
   * @param {string|ObjectId} senderId
   * @param {string|ObjectId} reelId
   * @param {string}          [caption]  – optional text accompanying the share
   * @returns {Promise<Message>}
   */
  async shareReel(channelId, senderId, reelId, caption = '') {
    // ── 1. Channel access check ───────────────────────────────────────────
    const channel = await Channel.findOne({
      _id:                   channelId,
      'participants.userId': senderId,
      deletedAt:             null,
    }).lean();

    if (!channel) {
      throw createError(
        'Channel not found or you are not a participant',
        channel === null ? 404 : 403,
        channel === null ? 'NOT_FOUND' : 'FORBIDDEN'
      );
    }

    // ── 2. Validate reel & fetch metadata ─────────────────────────────────
    const reelMeta = await this.validateAndFetchReel(reelId);

    // ── 3. Persist the message ─────────────────────────────────────────────
    const message = await Message.create({
      channelId,
      senderId,
      content:  caption.trim().slice(0, 4000),
      type:     'reel',
      reelRef:  {
        reelId:       reelMeta.reelId,
        thumbnailUrl: reelMeta.thumbnailUrl,
        title:        reelMeta.title,
      },
    });

    // ── 4. Update channel's denormalized lastMessage ───────────────────────
    await Channel.updateLastMessage(channelId, message);

    return message;
  },
};

module.exports = reelShareService;
