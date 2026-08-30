'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../config/db');
const { deptGuard } = require('../middleware/auth');

// ── Shared: fetch + process department data (mirrors insightsController) ──────
const TYPES = ['electricity', 'water', 'waste'];

function parseDate(record) {
  if (record.notes) {
    const match = record.notes.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return record.created_at.slice(0, 10);
}

async function getDeptSeries(department) {
  const { data: records, error } = await supabase
    .from('usage_records')
    .select('category, quantity, notes, created_at')
    .eq('resource_name', department)
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch records from Supabase');

  const grouped = {};
  for (const type of TYPES) {
    const typeRecords = records.filter((r) => r.category === type);
    const byDate = {};
    for (const r of typeRecords) {
      const date = parseDate(r);
      byDate[date] = (byDate[date] || 0) + Number(r.quantity);
    }
    const sorted = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    grouped[type] = sorted.map((point, idx) => {
      const windowStart = Math.max(0, idx - 7);
      const window      = sorted.slice(windowStart, idx);
      const rollingAvg  = window.length > 0
        ? window.reduce((acc, p) => acc + p.amount, 0) / window.length
        : null;
      const isAnomaly = rollingAvg !== null && point.amount > rollingAvg * 1.2;
      return {
        date:       point.date,
        amount:     Math.round(point.amount * 10) / 10,
        rollingAvg: rollingAvg !== null ? Math.round(rollingAvg * 10) / 10 : null,
        isAnomaly,
      };
    });
  }
  return grouped;
}

// ── Build a rich data summary string for the Gemini prompt ───────────────────
function buildDataSummary(department, series) {
  const lines = [`Department: ${department}\n`];
  for (const [type, points] of Object.entries(series)) {
    if (!points.length) continue;
    const anomalies = points.filter((p) => p.isAnomaly);
    const avg = points.reduce((s, p) => s + p.amount, 0) / points.length;
    const unit = type === 'electricity' ? 'kWh' : type === 'water' ? 'L' : 'kg';
    lines.push(`${type.toUpperCase()} (${unit}):`);
    lines.push(`  Period: ${points[0].date} to ${points[points.length - 1].date}`);
    lines.push(`  Dataset average: ${avg.toFixed(1)} ${unit}`);
    lines.push(`  Total records: ${points.length}`);
    if (anomalies.length > 0) {
      lines.push(`  Anomalies (>20% above 7-day rolling avg):`);
      anomalies.forEach((a) => {
        const pct = a.rollingAvg
          ? Math.round(((a.amount - a.rollingAvg) / a.rollingAvg) * 100)
          : null;
        lines.push(
          `    - ${a.date}: ${a.amount} ${unit}` +
          (pct !== null ? ` (${pct}% above rolling avg of ${a.rollingAvg} ${unit})` : '')
        );
      });
    } else {
      lines.push(`  No anomalies detected.`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ── Gemini call with JSON-strict retry ───────────────────────────────────────
async function callGeminiJSON(model, prompt, retryPrompt) {
  const tryParse = (text) => {
    // Strip markdown fences if Gemini wraps in ```json ... ```
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  };

  const result1 = await model.generateContent(prompt);
  const text1   = result1.response.text();
  try {
    return tryParse(text1);
  } catch {
    // Retry with stricter instruction
    const result2 = await model.generateContent(retryPrompt + '\n\n' + text1);
    const text2   = result2.response.text();
    return tryParse(text2);
  }
}

// ── AI Response Caching ───────────────────────────────────────────────────────
const memoryCache = new Map();

async function getCachedAIResponse(cacheKey) {
  try {
    const { data, error } = await supabase
      .from('ai_cache')
      .select('response, updated_at')
      .eq('cache_key', cacheKey)
      .single();

    if (!error && data) {
      return {
        response:   data.response,
        updated_at: data.updated_at,
      };
    }
  } catch {
    // Ignore table missing / error
  }
  return memoryCache.get(cacheKey) || null;
}

async function setCachedAIResponse(cacheKey, cacheType, department, resourceType, response) {
  const now = new Date().toISOString();
  memoryCache.set(cacheKey, { response, updated_at: now });

  try {
    await supabase.from('ai_cache').upsert({
      cache_key:     cacheKey,
      cache_type:    cacheType,
      department,
      resource_type: resourceType || null,
      response,
      updated_at:    now,
    }, { onConflict: 'cache_key' });
  } catch (err) {
    // Graceful fallback if table doesn't exist
    console.warn('ai_cache table note:', err?.message || err);
  }
}

// ── GET /api/ai/cache ─────────────────────────────────────────────────────────
async function getCache(req, res) {
  const { type, department, resourceType } = req.query;
  if (!department || !type) {
    return res.status(400).json({ success: false, message: 'department and type are required' });
  }

  if (!deptGuard(req.user, department, res)) return;

  const cacheKey = type === 'insights'
    ? `insights:${department}`
    : `forecast:${department}:${(resourceType || 'electricity').toLowerCase()}`;

  const cached = await getCachedAIResponse(cacheKey);
  if (cached) {
    return res.json({
      success:   true,
      hasCache:  true,
      data:      cached.response,
      updatedAt: cached.updated_at,
    });
  }

  res.json({ success: true, hasCache: false, data: null });
}

// ── POST /api/ai/insights ────────────────────────────────────────────────────
async function postInsights(req, res) {
  const { department, forceRefresh } = req.body;
  if (!department) {
    return res.status(400).json({ success: false, message: 'department is required' });
  }

  // Non-admins may only request insights for their own department
  if (!deptGuard(req.user, department, res)) return;

  const cacheKey = `insights:${department}`;

  // Check cache first if not explicitly refreshing
  if (!forceRefresh) {
    const cached = await getCachedAIResponse(cacheKey);
    if (cached) {
      return res.json({
        success:         true,
        ...cached.response,
        isCached:        true,
        updatedAt:       cached.updated_at,
      });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.status(503).json({ success: false, message: 'GEMINI_API_KEY not configured in backend .env' });
  }

  try {
    const series      = await getDeptSeries(department);
    const dataSummary = buildDataSummary(department, series);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const prompt = `
You are an energy efficiency analyst. You will be given real resource usage data for a department.
Analyze it and respond with ONLY valid JSON (no markdown, no explanation outside JSON).

Data:
${dataSummary}

Return exactly this JSON shape:
{
  "summary": "2-3 sentence plain-language summary referencing actual anomaly dates and amounts from the data",
  "recommendations": [
    {
      "text": "specific actionable recommendation referencing actual numbers from the data (e.g. exact dates, kWh amounts, % above average)",
      "estimatedSavings": <number between 5 and 40 representing estimated % savings if recommendation is followed>
    }
  ]
}

Rules:
- EXACTLY 3 recommendations
- Each recommendation MUST reference specific dates and amounts from the data provided — no generic advice
- If no anomalies exist for a type, base recommendations on the trends in the data
- estimatedSavings must be a plain number (not a string, not a % sign)
- Return ONLY valid JSON. No markdown fences. No extra text.
`.trim();

    const retryPrompt = `Your previous response was not valid JSON. You MUST return ONLY valid JSON with no markdown fences, no explanation, no text outside the JSON object. Here was your invalid response:`;

    const parsed = await callGeminiJSON(model, prompt, retryPrompt);

    // Validate shape
    if (!parsed.summary || !Array.isArray(parsed.recommendations) || parsed.recommendations.length !== 3) {
      throw new Error('Gemini returned unexpected JSON shape');
    }

    const payload = {
      summary:         parsed.summary,
      recommendations: parsed.recommendations,
    };

    // Cache the fresh response
    await setCachedAIResponse(cacheKey, 'insights', department, null, payload);

    res.json({
      success:   true,
      ...payload,
      isCached:  false,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('postInsights error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'AI insights failed' });
  }
}

// ── POST /api/ai/chat ────────────────────────────────────────────────────────
async function postChat(req, res) {
  const { department, question, message, history } = req.body;
  const userQuestion = (question || message || '').trim();

  if (!userQuestion) {
    return res.status(400).json({ success: false, message: 'Question or message text is required' });
  }

  // Detect or resolve target department from query or body
  let targetDept = department;
  if (!targetDept) {
    if (/block[\s_-]*a\b/i.test(userQuestion)) targetDept = 'Block A';
    else if (/block[\s_-]*b\b/i.test(userQuestion)) targetDept = 'Block B';
    else if (/block[\s_-]*c\b/i.test(userQuestion)) targetDept = 'Block C';
    else if (!req.user?.is_admin && req.user?.department) {
      targetDept = req.user.department;
    } else {
      targetDept = 'All Blocks';
    }
  }

  // Non-admins may only query their own department
  if (!req.user?.is_admin && req.user?.department) {
    if (targetDept !== 'All Blocks' && targetDept !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: `Access restricted: Your account only has access to ${req.user.department} telemetry.`,
      });
    }
    targetDept = req.user.department;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.status(503).json({ success: false, message: 'GEMINI_API_KEY not configured in backend .env' });
  }

  try {
    let dataSummary = '';
    if (targetDept === 'All Blocks') {
      const blocks = ['Block A', 'Block B', 'Block C'];
      const summaries = [];
      for (const b of blocks) {
        try {
          const series = await getDeptSeries(b);
          summaries.push(buildDataSummary(b, series));
        } catch (err) {
          console.error(`Error loading telemetry for ${b}:`, err.message);
        }
      }
      dataSummary = summaries.join('\n────────────────────────────────────\n\n');
    } else {
      const series = await getDeptSeries(targetDept);
      dataSummary = buildDataSummary(targetDept, series);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: `You are "ResourceAdvisor Telemetry Assistant", an expert AI facilities and utility data analyst.
Target Scope: ${targetDept}
You have access ONLY to the telemetry and meter readings data provided below.
Answer the user's question accurately using this telemetry data.
If the user asks about a specific building, utility stream (electricity in kWh, water flow in L, solid waste in kg), rolling averages, anomalies, or consumption trends, cite concrete numbers, dates, and comparisons from the dataset.
If a question is outside the scope of facility utility data (e.g. general chit-chat), politely redirect to utility telemetry.
Keep replies clear, concise, professional, and well-grounded (3-5 sentences or structured bullet points).

Telemetry Dataset:
${dataSummary}`,
    });

    const result = await model.generateContent(userQuestion);
    const answer = result.response.text().trim();

    res.json({
      success: true,
      answer,
      reply: answer,
      department: targetDept,
    });
  } catch (err) {
    console.error('postChat error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'AI chat failed' });
  }
}

// ── POST /api/ai/forecast ─────────────────────────────────────────────────────
async function postForecast(req, res) {
  const { department, resource_type, forceRefresh } = req.body;
  if (!department || !resource_type) {
    return res.status(400).json({ success: false, message: 'department and resource_type are required' });
  }

  const VALID_TYPES = ['electricity', 'water', 'waste'];
  if (!VALID_TYPES.includes(resource_type)) {
    return res.status(400).json({ success: false, message: `resource_type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  // Non-admins may only forecast their own department
  if (!deptGuard(req.user, department, res)) return;

  const cacheKey = `forecast:${department}:${resource_type}`;

  // Check cache first if not explicitly refreshing
  if (!forceRefresh) {
    const cached = await getCachedAIResponse(cacheKey);
    if (cached) {
      return res.json({
        success:   true,
        ...cached.response,
        isCached:  true,
        updatedAt: cached.updated_at,
      });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.status(503).json({ success: false, message: 'GEMINI_API_KEY not configured in backend .env' });
  }

  try {
    // ── 1. Fetch last 30 days of data for this dept + type ──────────────────
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10); // YYYY-MM-DD

    const { data: records, error: recErr } = await supabase
      .from('usage_records')
      .select('quantity, notes, created_at')
      .eq('resource_name', department)
      .eq('category', resource_type)
      .order('created_at', { ascending: true });

    if (recErr) throw new Error('Failed to fetch records: ' + recErr.message);

    // Filter to last 30 days using parsed date (same logic as getDeptSeries)
    const last30 = (records || []).filter((r) => {
      const d = parseDate(r);
      return d >= cutoffStr;
    });

    // Aggregate by date
    const byDate = {};
    for (const r of last30) {
      const d = parseDate(r);
      byDate[d] = (byDate[d] || 0) + Number(r.quantity);
    }
    const sorted = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount: Math.round(amount * 10) / 10 }));

    // ── 2. Fetch threshold for this dept + type from settings ───────────────
    const { data: settingsRows } = await supabase
      .from('settings')
      .select('threshold')
      .eq('department', department)
      .eq('resource_type', resource_type)
      .single();

    const threshold = settingsRows?.threshold > 0 ? Number(settingsRows.threshold) : null;

    // ── 3. Build prompt data ─────────────────────────────────────────────────
    const unit = resource_type === 'electricity' ? 'kWh' : resource_type === 'water' ? 'L' : 'kg';
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysRemaining = daysInMonth - dayOfMonth;

    const dailyDataStr = sorted.length > 0
      ? sorted.map((p) => `  ${p.date}: ${p.amount} ${unit}`).join('\n')
      : '  (no data in the last 30 days)';

    const runningTotal = sorted.reduce((s, p) => s + p.amount, 0);
    const thresholdLine = threshold !== null
      ? `Monthly threshold: ${threshold} ${unit} (${runningTotal.toFixed(1)} ${unit} consumed so far this month)`
      : 'Monthly threshold: none set';

    const prompt = `You are a resource usage forecasting analyst.
Today is ${today}. There are ${daysRemaining} days remaining in the current month (day ${dayOfMonth} of ${daysInMonth}).

Department: ${department}
Resource type: ${resource_type} (unit: ${unit})
${thresholdLine}

Daily usage data for the last 30 days:
${dailyDataStr}

Based ONLY on the data above, respond with ONLY valid JSON (no markdown, no text outside JSON):
{
  "trend": "rising" | "falling" | "flat",
  "projectedTotal": <number — estimated total consumption for the FULL current month, based on current pace>,
  "unit": "${unit}",
  "willExceedThreshold": <boolean — true ONLY if threshold is set AND projectedTotal > threshold>,
  "projectedBreachDate": <"YYYY-MM-DD" string if willExceedThreshold is true, else null — estimate the date the running total will hit the threshold>,
  "summary": "<2 sentences referencing actual numbers from the data — describe the recent trend direction and rate of change>",
  "recommendation": "<one specific, actionable recommendation to reduce usage, referencing actual numbers from the data>"
}

Rules:
- willExceedThreshold MUST be false if no threshold is set
- projectedTotal must be a plain number, not a string
- Reference actual dates and amounts in summary and recommendation
- Return ONLY the JSON object. No markdown. No extra text.`;

    const retryPrompt = `Your previous response was not valid JSON. Return ONLY a valid JSON object with no markdown fences, no explanation, nothing outside the JSON. Previous invalid response:`;

    // ── 4. Call Gemini ───────────────────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const parsed = await callGeminiJSON(model, prompt, retryPrompt);

    // Validate required fields
    const requiredKeys = ['trend', 'projectedTotal', 'unit', 'willExceedThreshold', 'projectedBreachDate', 'summary', 'recommendation'];
    for (const key of requiredKeys) {
      if (!(key in parsed)) throw new Error(`Gemini response missing field: ${key}`);
    }
    if (!['rising', 'falling', 'flat'].includes(parsed.trend)) {
      parsed.trend = 'flat';
    }
    if (threshold === null) {
      parsed.willExceedThreshold = false;
      parsed.projectedBreachDate = null;
    }

    const payload = {
      ...parsed,
      dataPoints: sorted.length,
      threshold,
    };

    // Cache the forecast
    await setCachedAIResponse(cacheKey, 'forecast', department, resource_type, payload);

    res.json({
      success:   true,
      ...payload,
      isCached:  false,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('postForecast error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Forecast failed' });
  }
}

module.exports = { postInsights, postChat, postForecast, getCache };
