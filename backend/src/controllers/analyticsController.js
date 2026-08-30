'use strict';

const supabase = require('../config/db');

const DEPARTMENTS = ['Block A', 'Block B', 'Block C'];
const TYPES       = ['electricity', 'water', 'waste'];
const UNITS       = { electricity: 'kWh', water: 'L', waste: 'kg' };

// ── Helper: parse date stored in notes field ──────────────────────────────────
function parseDate(record) {
  if (record.notes) {
    const match = record.notes.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return record.created_at.slice(0, 10);
}

// ── GET /api/analytics ────────────────────────────────────────────────────────
async function getAnalytics(req, res) {
  // Non-admins only see their own department
  const userDept = req.user.is_admin ? null : req.user.department;
  if (!req.user.is_admin && !userDept) {
    return res.status(403).json({ success: false, message: 'No department assigned to your account. Contact an admin.' });
  }

  let query = supabase
    .from('usage_records')
    .select('resource_name, category, quantity, notes, created_at')
    .order('created_at', { ascending: true });

  if (userDept) {
    query = query.eq('resource_name', userDept);
  }

  const { data: records, error } = await query;

  if (error) {
    console.error('getAnalytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics data' });
  }

  // ── Decide which departments to show ─────────────────────────────────────────
  const visibleDepts = userDept ? [userDept] : DEPARTMENTS;

  // ── Determine thisMonth & previousMonth ─────────────────────────────────────
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

  // ── Per-department totals ────────────────────────────────────────────────────
  const deptMap = {};
  for (const dept of visibleDepts) {
    deptMap[dept] = { name: dept };
    for (const type of TYPES) {
      deptMap[dept][type] = {
        total: 0,
        unit: UNITS[type],
        thisMonthTotal: 0,
        previousMonthTotal: 0,
        percentChange: null,
      };
    }
  }

  for (const r of records) {
    const dept = r.resource_name;
    const type = r.category?.toLowerCase();
    if (!dept || !TYPES.includes(type)) continue;
    if (!deptMap[dept]) continue; // skip departments outside the user's scope

    const qty = Number(r.quantity) || 0;
    const rMonth = parseDate(r).slice(0, 7);

    deptMap[dept][type].total = Math.round((deptMap[dept][type].total + qty) * 10) / 10;

    if (rMonth === thisMonth) {
      deptMap[dept][type].thisMonthTotal = Math.round((deptMap[dept][type].thisMonthTotal + qty) * 10) / 10;
    } else if (rMonth === previousMonth) {
      deptMap[dept][type].previousMonthTotal = Math.round((deptMap[dept][type].previousMonthTotal + qty) * 10) / 10;
    }
  }

  // Calculate percentage change for each department/type
  for (const dept of visibleDepts) {
    for (const type of TYPES) {
      const dt = deptMap[dept][type];
      if (dt.previousMonthTotal > 0) {
        dt.percentChange = Math.round(((dt.thisMonthTotal - dt.previousMonthTotal) / dt.previousMonthTotal) * 1000) / 10;
      } else {
        dt.percentChange = null;
      }
    }
  }

  // ── Monthly trend (scoped to user's visible departments) ─────────────────────
  const monthMap = {};
  for (const r of records) {
    const date = parseDate(r);
    const month = date.slice(0, 7);
    const type  = r.category?.toLowerCase();
    if (!month || !TYPES.includes(type)) continue;

    if (!monthMap[month]) {
      monthMap[month] = { month };
      for (const t of TYPES) monthMap[month][t] = 0;
    }
    monthMap[month][type] = Math.round((monthMap[month][type] + Number(r.quantity)) * 10) / 10;
  }

  const monthlyTrend = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

  // ── Category totals ──────────────────────────────────────────────────────────
  const categoryTotals = {};
  for (const type of TYPES) {
    categoryTotals[type] = {
      total: 0,
      unit: UNITS[type],
      thisMonthTotal: 0,
      previousMonthTotal: 0,
      percentChange: null,
    };
  }
  for (const r of records) {
    const type = r.category?.toLowerCase();
    if (TYPES.includes(type)) {
      const qty = Number(r.quantity) || 0;
      const rMonth = parseDate(r).slice(0, 7);
      categoryTotals[type].total = Math.round((categoryTotals[type].total + qty) * 10) / 10;

      if (rMonth === thisMonth) {
        categoryTotals[type].thisMonthTotal = Math.round((categoryTotals[type].thisMonthTotal + qty) * 10) / 10;
      } else if (rMonth === previousMonth) {
        categoryTotals[type].previousMonthTotal = Math.round((categoryTotals[type].previousMonthTotal + qty) * 10) / 10;
      }
    }
  }

  for (const type of TYPES) {
    const ct = categoryTotals[type];
    if (ct.previousMonthTotal > 0) {
      ct.percentChange = Math.round(((ct.thisMonthTotal - ct.previousMonthTotal) / ct.previousMonthTotal) * 1000) / 10;
    } else {
      ct.percentChange = null;
    }
  }

  res.json({
    success:         true,
    thisMonth,
    previousMonth,
    departments:     Object.values(deptMap),
    monthlyTrend,
    categoryTotals,
    totalRecords:    records.length,
    scopedDept:      userDept, // frontend uses this to know it's single-dept mode
  });
}

module.exports = { getAnalytics };
