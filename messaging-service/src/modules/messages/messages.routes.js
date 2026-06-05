'use strict';

const { Router } = require('express');
const auth       = require('../../common/middleware/auth.middleware');
const controller = require('./messages.controller');

const router = Router({ mergeParams: true });

router.get('/',    auth, controller.list);
router.post('/:messageId/pin',    auth, controller.pin);
router.delete('/:messageId/pin',  auth, controller.unpin);

module.exports = router;
