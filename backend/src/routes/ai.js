const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { postInsights, postChat, postForecast, getCache } = require('../controllers/aiController');

// GET /api/ai/cache — check cached AI response without calling Gemini
router.get('/cache', protect, getCache);

// POST /api/ai/insights — auth required
router.post('/insights', protect, postInsights);

// POST /api/ai/chat — auth required
router.post('/chat', protect, postChat);

// POST /api/ai/forecast — auth required
router.post('/forecast', protect, postForecast);

module.exports = router;
