'use strict';

const supabase = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a safe insert row
// ─────────────────────────────────────────────────────────────────────────────
function buildRow({ department, resource_name, category, quantity, unit, notes, date }) {
  return {
    resource_name: (resource_name || department || '').toString().trim(),
    category:      (category || '').toString().toLowerCase().trim(),
    quantity:      Number(quantity) || 0,
    unit:          unit  ? unit.toString().trim()  : null,
    notes:         notes ? notes.toString().trim() : null,
    // store the user-supplied date as a note prefix if provided
    ...(date ? { notes: [date, notes].filter(Boolean).join(' — ') } : {}),
  };
}

// ── GET /api/records ──────────────────────────────────────────────────────────
async function getRecords(req, res) {
  const { page, limit, category, department, search, startDate, endDate } = req.query;

  let query = supabase
    .from('usage_records')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Non-admins only see their own department
  if (!req.user.is_admin) {
    if (!req.user.department) {
      return res.status(403).json({ success: false, message: 'No department assigned to your account. Contact an admin.' });
    }
    query = query.eq('resource_name', req.user.department);
  } else if (department && department !== 'all') {
    query = query.eq('resource_name', department);
  }

  // Category filter
  if (category && category !== 'all') {
    query = query.eq('category', category.toLowerCase().trim());
  }

  // Text search in notes or resource_name or category
  if (search && search.trim()) {
    const q = search.trim();
    query = query.or(`resource_name.ilike.%${q}%,notes.ilike.%${q}%,category.ilike.%${q}%`);
  }

  // Server-side pagination if requested
  const isPaginated = page !== undefined || limit !== undefined;
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

  if (isPaginated) {
    const from = (p - 1) * l;
    const to = from + l - 1;
    query = query.range(from, to);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('getRecords error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch records' });
  }

  const totalCount = count !== null ? count : (data?.length || 0);

  if (isPaginated) {
    return res.json({
      success:    true,
      count:      totalCount,
      page:       p,
      limit:      l,
      totalPages: Math.max(1, Math.ceil(totalCount / l)),
      records:    data || [],
    });
  }

  res.json({ success: true, count: totalCount, records: data || [] });
}

// ── POST /api/records ─────────────────────────────────────────────────────────
async function createRecord(req, res) {
  let { department, resource_name, category, quantity, unit, notes, date } = req.body;

  // Non-admins: force their own department regardless of what the client sends
  if (!req.user.is_admin) {
    if (!req.user.department) {
      return res.status(403).json({ success: false, message: 'No department assigned to your account. Contact an admin.' });
    }
    department    = req.user.department;
    resource_name = req.user.department;
  }

  const name = resource_name || department;
  if (!name || !category || quantity == null) {
    return res.status(400).json({
      success: false,
      message: 'department (or resource_name), category, and quantity are required',
    });
  }

  const row = buildRow({ department, resource_name, category, quantity, unit, notes, date });

  const { data, error } = await supabase
    .from('usage_records')
    .insert([row])
    .select()
    .single();

  if (error) {
    console.error('createRecord error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create record' });
  }

  res.status(201).json({ success: true, record: data });
}

// ── GET /api/records/:id ──────────────────────────────────────────────────────
async function getRecord(req, res) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('usage_records')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  // Non-admins can only read their own department's records
  if (!req.user.is_admin && data.resource_name !== req.user.department) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  res.json({ success: true, record: data });
}

// ── PATCH /api/records/:id ────────────────────────────────────────────────────
async function updateRecord(req, res) {
  const { id } = req.params;
  const { resource_name, category, quantity, unit, notes } = req.body;

  // First fetch the record to check dept ownership for non-admins
  if (!req.user.is_admin) {
    const { data: existing } = await supabase.from('usage_records').select('resource_name').eq('id', id).single();
    if (!existing || existing.resource_name !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
  }

  const updates = {};
  if (resource_name !== undefined) updates.resource_name = resource_name.trim();
  if (category      !== undefined) updates.category      = category.trim();
  if (quantity      !== undefined) updates.quantity       = Number(quantity);
  if (unit          !== undefined) updates.unit           = unit ? unit.trim() : null;
  if (notes         !== undefined) updates.notes          = notes ? notes.trim() : null;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('usage_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'Record not found or update failed' });
  }

  res.json({ success: true, record: data });
}

// ── DELETE /api/records/:id ───────────────────────────────────────────────────
async function deleteRecord(req, res) {
  const { id } = req.params;

  // Non-admins can only delete their own department's records
  if (!req.user.is_admin) {
    const { data: existing } = await supabase.from('usage_records').select('resource_name').eq('id', id).single();
    if (!existing || existing.resource_name !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
  }

  const { error } = await supabase
    .from('usage_records')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(404).json({ success: false, message: 'Record not found or delete failed' });
  }

  res.json({ success: true, message: 'Record deleted' });
}

// ── POST /api/records/bulk-upload ─────────────────────────────────────────────
async function bulkUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
  }

  // Non-admins must have a department assigned
  if (!req.user.is_admin && !req.user.department) {
    return res.status(403).json({ success: false, message: 'No department assigned to your account. Contact an admin.' });
  }

  const csvParser = require('csv-parser');
  const { Readable } = require('stream');

  const rows = [];
  const errors = [];

  await new Promise((resolve, reject) => {
    Readable.from(req.file.buffer)
      .pipe(csvParser({
        mapHeaders: ({ header }) => header.trim().toLowerCase(),
      }))
      .on('data', (row) => {
        // Accept: department, type (=category), amount (=quantity), date, unit, notes
        const category = (row.type || row.category || '').toLowerCase().trim();
        const quantity  = parseFloat(row.amount || row.quantity || 0);

        // Non-admins: force their own department; admins use what the CSV says
        const name = req.user.is_admin
          ? (row.department || row.resource_name || '').trim()
          : req.user.department;

        if (!name || !category || isNaN(quantity)) {
          errors.push({ row, reason: 'Missing department, type, or amount' });
          return;
        }

        rows.push({
          resource_name: name,
          category,
          quantity,
          unit:  (row.unit  || null),
          notes: [row.date, row.notes].filter(Boolean).join(' — ') || null,
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  if (rows.length === 0) {
    return res.status(422).json({
      success: false,
      message: 'No valid rows found in CSV',
      errors,
    });
  }

  // Insert in chunks of 500 to avoid Supabase payload limits
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('usage_records').insert(chunk);
    if (error) {
      console.error('bulkUpload insert error:', error);
      return res.status(500).json({ success: false, message: 'Database insert failed', detail: error.message });
    }
    inserted += chunk.length;
  }

  res.status(201).json({
    success: true,
    inserted,
    skipped: errors.length,
    message: `${inserted} record${inserted !== 1 ? 's' : ''} imported successfully`,
    errors: errors.length ? errors.slice(0, 10) : undefined,
  });
}

// ── GET /api/records/summary ──────────────────────────────────────────────────
async function getSummary(req, res) {
  let query = supabase
    .from('usage_records')
    .select('resource_name, category, quantity, notes, created_at')
    .order('created_at', { ascending: true });

  // Non-admins only see their own department
  if (!req.user.is_admin) {
    if (!req.user.department) {
      return res.status(403).json({ success: false, message: 'No department assigned to your account. Contact an admin.' });
    }
    query = query.eq('resource_name', req.user.department);
  } else if (req.query.department) {
    query = query.eq('resource_name', req.query.department);
  }

  const { data: records, error } = await query;

  if (error) {
    console.error('getSummary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch records summary' });
  }

  const TYPES = ['electricity', 'water', 'waste'];
  const UNITS = { electricity: 'kWh', water: 'L', waste: 'kg' };

  function parseDate(record) {
    if (record.notes) {
      const match = record.notes.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    return record.created_at ? record.created_at.slice(0, 10) : '';
  }

  const monthCounts = {};
  for (const r of (records || [])) {
    const m = parseDate(r).slice(0, 7);
    if (m) monthCounts[m] = (monthCounts[m] || 0) + 1;
  }

  const allMonths = Object.keys(monthCounts).sort();

  const now = new Date();
  const calendarCurrentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const calendarPrevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  let thisMonth = calendarCurrentMonth;
  let previousMonth = calendarPrevMonth;

  if (allMonths.length > 0) {
    thisMonth = allMonths[allMonths.length - 1];
    for (const m of allMonths) {
      if ((monthCounts[m] || 0) > (monthCounts[thisMonth] || 0) * 3) {
        thisMonth = m;
      }
    }
    const [y, m] = thisMonth.split('-').map(Number);
    const pDate = new Date(y, m - 2, 1);
    previousMonth = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
  }

  const summary = {};
  for (const type of TYPES) {
    const thisMonthRecs = (records || []).filter(
      (r) => r.category?.toLowerCase() === type && parseDate(r).slice(0, 7) === thisMonth
    );
    const prevMonthRecs = (records || []).filter(
      (r) => r.category?.toLowerCase() === type && parseDate(r).slice(0, 7) === previousMonth
    );

    const thisMonthTotal = thisMonthRecs.reduce((s, r) => s + Number(r.quantity || 0), 0);
    const prevMonthTotal = prevMonthRecs.reduce((s, r) => s + Number(r.quantity || 0), 0);

    let percentChange = null;
    if (prevMonthTotal > 0) {
      percentChange = Math.round(((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 1000) / 10;
    }

    summary[type] = {
      total: Math.round(thisMonthTotal * 10) / 10,
      unit: UNITS[type],
      count: thisMonthRecs.length,
      previousMonthTotal: Math.round(prevMonthTotal * 10) / 10,
      percentChange,
    };
  }

  res.json({
    success: true,
    thisMonth,
    previousMonth,
    summary,
    electricity: summary.electricity,
    water:       summary.water,
    waste:       summary.waste,
  });
}

module.exports = { getRecords, createRecord, getRecord, updateRecord, deleteRecord, bulkUpload, getSummary };
