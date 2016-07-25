var apiController = require('../controller/api');
var express = require('express');
var router = express.Router();

router.get('/', apiController.verifyToken);
router.post('/', apiController.handleEvents);

module.exports = router;