'use strict';

const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getSettings, putSettings } = require('../controllers/settingsController');

// GET /api/settings — any logged-in user can view thresholds
router.get('/', protect, getSettings);

// PUT /api/settings — only admins can update thresholds
router.put('/', protect, adminOnly, putSettings);

module.exports = router;
