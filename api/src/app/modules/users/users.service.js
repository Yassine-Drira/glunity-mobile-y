'use strict';

const repository = require('./users.repository');

const usersService = {
  async list(query = {}) {
    return repository.findMany(query);
  },
};

module.exports = usersService;
