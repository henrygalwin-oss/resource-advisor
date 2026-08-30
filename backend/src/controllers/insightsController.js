'use strict';

const supabase = require('../config/db');
const { deptGuard } = require('../middleware/auth');

const TYPES = ['electricity', 'water', 'waste'];

// ── GET /api/records/insights/:department ─────────────────────────────────────
async function getInsights(req, res) {
  const { department } = req.params;

  if (!department) {
    return res.status(400).json({ success: false, message: 'Department is required' });
  }

  // Non-admins may only fetch their own department
  if (!deptGuard(req.user, department, res)) return;

  // Fetch all records for this department, ordered by date (extracted from notes) then created_at
  const { data: records, error } = await supabase
    .from('usage_records')
    .select('category, quantity, notes, created_at')
    .eq('resource_name', department)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getInsights error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch records' });
  }

  // ── Parse date from notes field (format: "YYYY-MM-DD — optional text") ──────
  function parseDate(record) {
    // Notes field stores date as first segment: "2024-01-15 — some note" or just "2024-01-15"
    if (record.notes) {
      const match = record.notes.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    // Fallback: use created_at date part
    return record.created_at.slice(0, 10);
  }

  // ── Group by type, then aggregate by date (sum multiple records on same day) ─
  const grouped = {};
  for (const type of TYPES) {
    const typeRecords = records.filter((r) => r.category === type);

    // Aggregate: sum amounts for the same date
    const byDate = {};
    for (const r of typeRecords) {
      const date = parseDate(r);
      byDate[date] = (byDate[date] || 0) + Number(r.quantity);
    }

    // Sort by date ascending
    const sorted = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    // ── Rolling 7-day average & anomaly detection ────────────────────────────
    const series = sorted.map((point, idx) => {
      // Window: up to 7 days before (exclusive of current point) for a trailing average
      const windowStart = Math.max(0, idx - 7);
      const window = sorted.slice(windowStart, idx); // excludes current point
      const rollingAvg = window.length > 0
        ? window.reduce((acc, p) => acc + p.amount, 0) / window.length
        : null;

      // Flag anomaly if current amount > 20% above the rolling average
      const isAnomaly = rollingAvg !== null && point.amount > rollingAvg * 1.2;

      return {
        date:       point.date,
        amount:     Math.round(point.amount * 10) / 10,
        rollingAvg: rollingAvg !== null ? Math.round(rollingAvg * 10) / 10 : null,
        isAnomaly,
      };
    });

    grouped[type] = series;
  }

  res.json({
    success:    true,
    department,
    series:     grouped,
  });
}

module.exports = { getInsights };
