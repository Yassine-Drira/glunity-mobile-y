'use strict';

const service = require('./messages.service');
const mapper  = require('./messages.mapper');
const asyncHandler = require('../../common/utils/async-handler');

const messagesController = {

  list: asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const limit     = Math.min(Number(req.query.limit) || 50, 100);
    const cursor    = req.query.cursor || null;
    const direction = req.query.direction === 'after' ? 'after' : 'before';

    const { items } = await service.list(channelId, req.user._id, { cursor, limit, direction });

    const hasMore = items.length === limit;
    const nextCursor = hasMore ? items[items.length - 1]._id?.toString() : null;

    res.status(200).json(mapper.toMessageListResponse(items, { cursor: nextCursor, hasMore }));
  }),

  edit: asyncHandler(async (req, res) => {
    const msg = await service.edit(req.params.id, req.user._id, req.body.content);
    res.status(200).json({ success: true, data: mapper.toMessageResponse(msg) });
  }),

  remove: asyncHandler(async (req, res) => {
    await service.remove(req.params.id, req.user._id);
    res.status(200).json({ success: true });
  }),

  pin: asyncHandler(async (req, res) => {
    await service.pin(req.params.channelId, req.params.messageId, req.user._id);
    res.status(200).json({ success: true });
  }),

  unpin: asyncHandler(async (req, res) => {
    await service.unpin(req.params.channelId, req.params.messageId, req.user._id);
    res.status(200).json({ success: true });
  }),
};

module.exports = messagesController;
