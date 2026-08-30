'use strict';

const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const { getAnalytics } = require('../controllers/analyticsController');

// GET /api/analytics — auth required
router.get('/', protect, getAnalytics);

module.exports = router;
