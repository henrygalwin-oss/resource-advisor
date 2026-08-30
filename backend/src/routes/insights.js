'use strict';

const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const { getInsights } = require('../controllers/insightsController');

// GET /api/records/insights/:department — auth required
router.get('/:department', protect, getInsights);

module.exports = router;
