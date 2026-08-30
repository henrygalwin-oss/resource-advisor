'use strict';

const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');

// GET /api/auth/me — returns the logged-in user from the Supabase token
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
