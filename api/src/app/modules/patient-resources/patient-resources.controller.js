'use strict';

const service = require('./patient-resources.service');
const mapper = require('./patient-resources.mapper');
const asyncHandler = require('../../common/utils/async-handler');

const patientResourcesController = {
  // GET /api/patient-resources/home  — Featured + All + Videos
  home: asyncHandler(async (req, res) => {
    const data = await service.getHomeData();
    res.status(200).json(mapper.toHomeResponse(data));
  }),

  // GET /api/patient-resources  — Paginated list (optional ?category=...)
  list: asyncHandler(async (req, res) => {
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
    const skip = req.query.skip !== undefined ? Number(req.query.skip) : 0;
    const category = req.query.category || undefined;
    const { items } = await service.listArticles({ category, limit, skip });
    res.status(200).json(mapper.toArticleListResponse(items));
  }),

  // GET /api/patient-resources/:id
  getById: asyncHandler(async (req, res) => {
    const item = await service.getById(req.params.id);
    res.status(200).json({ success: true, data: mapper.toArticleResponse(item) });
  }),

  // POST /api/patient-resources/:id/click
  recordClick: asyncHandler(async (req, res) => {
    const updated = await service.recordClick(req.params.id);
    res.status(200).json({ success: true, data: updated });
  }),
};

module.exports = patientResourcesController;
