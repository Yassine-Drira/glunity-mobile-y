'use strict';

const { Router } = require('express');
const auth       = require('../../common/middleware/auth.middleware');
const controller = require('./messages.controller');

const router = Router();

router.patch('/:id',  auth, controller.edit);
router.delete('/:id', auth, controller.remove);

module.exports = router;
