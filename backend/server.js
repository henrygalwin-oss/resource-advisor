'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// ── Route imports ────────────────────────────────────────────────────────────
const authRoutes      = require('./src/routes/auth');
const recordRoutes    = require('./src/routes/records');
const insightRoutes   = require('./src/routes/insights');
const aiRoutes        = require('./src/routes/ai');
const analyticsRoutes = require('./src/routes/analytics');
const settingsRoutes  = require('./src/routes/settings');

// ── App ──────────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    database: 'supabase',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',             authRoutes);
app.use('/api/records',          recordRoutes);
app.use('/api/records/insights', insightRoutes);
app.use('/api/ai',               aiRoutes);
app.use('/api/analytics',        analyticsRoutes);
app.use('/api/settings',         settingsRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  console.log(`🗄️   Database: Supabase PostgreSQL`);
});
