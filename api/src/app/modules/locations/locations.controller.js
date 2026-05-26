'use strict';

const service      = require('./locations.service');
const mapper       = require('./locations.mapper');
const asyncHandler = require('../../common/utils/async-handler');

function parseBool(v) {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  return v === 'true' || v === '1';
}

const locationsController = {
  /** GET /api/locations */
  list: asyncHandler(async (req, res) => {
    const q = {
      lng:        req.query.lng !== undefined ? Number(req.query.lng) : undefined,
      lat:        req.query.lat !== undefined ? Number(req.query.lat) : undefined,
      radius:     req.query.radius !== undefined ? Number(req.query.radius) : undefined,
      category:   req.query.category,
      glutenFree: parseBool(req.query.glutenFree),
      certified:  parseBool(req.query.certified),
      search:     req.query.search,
      limit:      req.query.limit !== undefined ? Number(req.query.limit) : 100,
      skip:       req.query.skip !== undefined ? Number(req.query.skip) : 0,
    };
    const { items, total } = await service.list(q);
    res.status(200).json(mapper.toLocationListResponse(items, total));
  }),

  /** GET /api/locations/:id */
  getOne: asyncHandler(async (req, res) => {
    const doc = await service.getById(req.params.id);
    res.status(200).json(mapper.toLocationResponse(doc));
  }),

  /** POST /api/locations  (auth) */
  create: asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const doc    = await service.create(req.body, userId);
    res.status(201).json(mapper.toLocationResponse(doc));
  }),
};

module.exports = locationsController;
