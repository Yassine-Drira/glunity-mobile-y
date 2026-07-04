'use strict';

const User = require('../../../database/models/user.model');

const usersRepository = {
  async findMany({ limit = 50, skip = 0, q } = {}) {
    const query = { isActive: true };
    if (q) {
      query.fullName = { $regex: q, $options: 'i' };
    }
    const items = await User.find(query)
      .select('fullName avatar profileType points badges')
      .populate('badges')
      .sort({ points: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    return { items };
  },
};

module.exports = usersRepository;
