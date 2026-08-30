'use strict';

const supabase = require('../config/db');

const DEPARTMENTS    = ['Block A', 'Block B', 'Block C'];
const RESOURCE_TYPES = ['electricity', 'water', 'waste'];

// ── GET /api/settings ─────────────────────────────────────────────────────────
async function getSettings(req, res) {
  let query = supabase
    .from('settings')
    .select('department, resource_type, threshold, updated_at')
    .order('department')
    .order('resource_type');

  // Non-admins only see their own department's rows
  if (!req.user.is_admin) {
    if (!req.user.department) {
      return res.status(403).json({ success: false, message: 'No department assigned to your account. Contact an admin.' });
    }
    query = query.eq('department', req.user.department);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === '42P01') {
      return res.json({ success: true, settings: [] });
    }
    console.error('getSettings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }

  res.json({ success: true, settings: data || [] });
}

// ── PUT /api/settings ─────────────────────────────────────────────────────────
async function putSettings(req, res) {
  const { settings } = req.body; // [{ department, resource_type, threshold }]

  if (!Array.isArray(settings) || settings.length === 0) {
    return res.status(400).json({ success: false, message: 'settings array is required' });
  }

  // Validate each row
  const rows = [];
  for (const s of settings) {
    if (!DEPARTMENTS.includes(s.department) || !RESOURCE_TYPES.includes(s.resource_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid department "${s.department}" or resource_type "${s.resource_type}"`,
      });
    }
    rows.push({
      department:    s.department,
      resource_type: s.resource_type,
      threshold:     Number(s.threshold) || 0,
      updated_at:    new Date().toISOString(),
    });
  }

  // Upsert on (department, resource_type) unique key
  const { data, error } = await supabase
    .from('settings')
    .upsert(rows, { onConflict: 'department,resource_type' })
    .select();

  if (error) {
    console.error('putSettings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save settings: ' + error.message });
  }

  res.json({ success: true, saved: data?.length ?? rows.length });
}

module.exports = { getSettings, putSettings };
