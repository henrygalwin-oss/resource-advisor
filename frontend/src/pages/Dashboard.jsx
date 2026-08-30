import React, { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { AIInsightsPanel, ChatWidget, ForecastPanel } from '../components/AIWidgets'
import { useAuth } from '../context/AuthContext'
import {
  Zap, Droplets, Trash2, Building2, TrendingUp, TrendingDown,
  AlertTriangle, Activity, ArrowRight, Minus, Plus, RefreshCw,
} from '../components/Icons'

// ── Constants ─────────────────────────────────────────────────────────────────
const DEPARTMENTS = ['Block A', 'Block B', 'Block C']

const CATEGORY_META = {
  electricity: { label: 'ELECTRICITY', meterId: 'MTR·01', Icon: Zap,      color: 'var(--color-electricity)', unit: 'KWH' },
  water:       { label: 'WATER FLOW',  meterId: 'MTR·02', Icon: Droplets, color: 'var(--color-water)',       unit: 'L'   },
  waste:       { label: 'SOLID WASTE', meterId: 'MTR·03', Icon: Trash2,   color: 'var(--color-waste)',       unit: 'KG'  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sum(arr, key = 'quantity') {
  return arr.reduce((acc, r) => acc + Number(r[key] ?? r.amount ?? 0), 0)
}

function fmt(n, dec = 1) {
  return Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: dec })
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function relativeTime(iso) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function parseDate(record) {
  if (record.notes) {
    const match = record.notes.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return record.created_at ? record.created_at.slice(0, 10) : '';
}

function getMonthRecords(records) {
  const monthCounts = {};
  for (const r of records) {
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

  const thisMonthList = records.filter((r) => parseDate(r).slice(0, 7) === thisMonth);
  const prevMonthList = records.filter((r) => parseDate(r).slice(0, 7) === previousMonth);

  return { thisMonthList, prevMonthList, thisMonth, previousMonth };
}

function groupByCategory(records) {
  const groups = { electricity: [], water: [], waste: [] }
  records.forEach((r) => {
    const key = r.category?.toLowerCase()
    if (groups[key]) groups[key].push(r)
  })
  return groups
}

function topDepartment(records) {
  const totals = {}
  records.forEach((r) => {
    totals[r.resource_name] = (totals[r.resource_name] || 0) + Number(r.quantity)
  })
  return Object.entries(totals).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—'
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--color-card-border-subtle)', marginBottom: 14 }}>
          <div className="skeleton" style={{ height: 12, width: 85 }} />
          <div className="skeleton" style={{ height: 12, width: 45 }} />
        </div>
        <div style={{ margin: '8px 0 12px 0' }}>
          <div className="skeleton" style={{ height: 46, width: 130 }} />
        </div>
        <div className="skeleton" style={{ height: 18, width: 140, marginBottom: 12, borderRadius: 9999 }} />
      </div>
      <div style={{ paddingTop: 10, borderTop: '1px solid var(--color-card-border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ height: 10, width: 90 }} />
        <div className="skeleton" style={{ height: 10, width: 70 }} />
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div style={{ height: 250, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1, justifyContent: 'center' }}>
        <div className="skeleton" style={{ height: 1, width: '100%' }} />
        <div className="skeleton" style={{ height: 1, width: '100%' }} />
        <div className="skeleton" style={{ height: 1, width: '100%' }} />
        <div className="skeleton" style={{ height: 1, width: '100%' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="skeleton" style={{ height: 10, width: 40 }} />
        ))}
      </div>
    </div>
  )
}

// ── Precision Diamond Vertex for Anomaly Points ───────────────────────────────
function DiamondVertex(props) {
  const { cx, cy, payload } = props
  if (!payload?.isAnomaly) return null
  return (
    <g transform={`translate(${cx},${cy})`}>
      <polygon
        points="0,-6 6,0 0,6 -6,0"
        fill="var(--color-chart-anomaly)"
        stroke="var(--color-surface)"
        strokeWidth={1.5}
      />
      <circle cx={0} cy={0} r={1.5} fill="var(--color-surface)" />
    </g>
  )
}

function DefaultDot(props) {
  const { cx, cy, payload } = props
  if (payload?.isAnomaly) return null
  return <circle cx={cx} cy={cy} r={2.5} fill="var(--color-chart-line)" stroke="var(--color-surface)" strokeWidth={1} />
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-card-border)',
      borderRadius: 6,
      padding: '8px 12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      fontFamily: 'var(--font-body)',
      minWidth: 140,
    }}>
      <div className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 3 }}>
        {fmtDate(label)}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span className="font-pachama-hero-number" style={{ fontSize: 22, color: 'var(--color-text)' }}>
          {fmt(d?.amount)}
        </span>
        <span className="font-unit" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{unit}</span>
      </div>
      {d?.rollingAvg !== null && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
          7d baseline: <span className="font-data-mono" style={{ fontWeight: 600, color: 'var(--color-text)' }}>{fmt(d.rollingAvg)} {unit}</span>
        </div>
      )}
      {d?.isAnomaly && (
        <div className="font-eyebrow" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-accent-warning)', fontSize: 10 }}>
          <AlertTriangle size={12} color="var(--color-accent-warning)" />
          <span>ANOMALY FLAGGED</span>
        </div>
      )}
    </div>
  )
}

// ── Dashboard Component ───────────────────────────────────────────────────────
export default function Dashboard() {
  const { isAdmin, department: userDept } = useAuth()

  // All-records state
  const [records,       setRecords]       = useState([])
  const [loadingRec,    setLoadingRec]    = useState(true)
  const [recError,      setRecError]      = useState('')
  const [health,        setHealth]        = useState({ status: 'checking…', ok: null })
  const [thresholds,    setThresholds]    = useState({})

  // Chart state
  const [dept,          setDept]          = useState(isAdmin ? DEPARTMENTS[0] : (userDept || DEPARTMENTS[0]))
  const [type,          setType]          = useState('electricity')
  const [chartData,     setChartData]     = useState([])
  const [loadingChart,  setLoadingChart]  = useState(false)
  const [chartError,    setChartError]    = useState('')
  const [anomalyCount,  setAnomalyCount]  = useState(0)

  // ── Load records & settings ───────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoadingRec(true)
    setRecError('')
    try {
      const [recRes, healthRes, settingsRes] = await Promise.all([
        api.get('/api/records'),
        api.get('/api/health'),
        api.get('/api/settings').catch(() => ({ data: { settings: [] } })),
      ])
      setRecords(recRes.data.records || [])
      setHealth({ status: healthRes.data.status, ok: true })
      const lookup = {}
      for (const s of (settingsRes.data.settings || [])) {
        if (s.threshold > 0) lookup[`${s.department}:${s.resource_type}`] = Number(s.threshold)
      }
      setThresholds(lookup)
    } catch {
      setHealth({ status: 'unreachable', ok: false })
      setRecError('Failed to establish connection with telemetry database.')
    } finally {
      setLoadingRec(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // ── Load chart data ───────────────────────────────────────────────────────
  const loadChart = useCallback(async () => {
    setLoadingChart(true)
    setChartError('')
    try {
      const { data } = await api.get(`/api/records/insights/${encodeURIComponent(dept)}`)
      const series = data.series?.[type] ?? []
      setChartData(series)
      setAnomalyCount(series.filter((p) => p.isAnomaly).length)
    } catch {
      setChartData([])
      setAnomalyCount(0)
      setChartError('Unable to load telemetry trend for this building block.')
    } finally {
      setLoadingChart(false)
    }
  }, [dept, type])

  useEffect(() => { loadChart() }, [loadChart])

  // ── Derived metrics ───────────────────────────────────────────────────────
  const { thisMonthList, prevMonthList } = getMonthRecords(records)
  const groups       = groupByCategory(thisMonthList)
  const prevGroups   = groupByCategory(prevMonthList)
  const allGroups    = groupByCategory(records)
  const recent       = [...records].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  const topDept      = topDepartment(thisMonthList)
  const meta         = CATEGORY_META[type]

  const tickStep = chartData.length > 30 ? Math.ceil(chartData.length / 10) : 1

  return (
    <div className="fade-in">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">OPERATIONS & TELEMETRY</h1>
          <p className="page-subtitle">Harnessing multi-building sensory telemetry and AI run-rate projections.</p>
        </div>
        <HealthBadge health={health} />
      </div>

      {/* ── Initial Connection Error Banner ────────────────────────────────── */}
      {recError && !loadingRec && (
        <div className="card" style={{
          marginBottom: 20,
          borderLeft: '3.5px solid var(--color-accent-alert)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="var(--color-accent-alert)" />
            <div>
              <div className="font-pachama-display" style={{ fontSize: 13.5, color: 'var(--color-text)' }}>
                TELEMETRY SERVER UNREACHABLE
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {recError}
              </div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={loadInitialData} style={{ fontSize: 10.5, padding: '6px 14px' }}>
            <RefreshCw size={12} /> RETRY CONNECTION
          </button>
        </div>
      )}

      {/* ── Signature Element: Tri-Resource Telemetry Header Strip ────────── */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 20, background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} color="var(--color-secondary)" />
            <span className="font-eyebrow" style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
              ACTIVE TELEMETRY STREAM
            </span>
          </div>

          {loadingRec ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div className="skeleton" style={{ height: 14, width: 110 }} />
              <div className="skeleton" style={{ height: 14, width: 110 }} />
              <div className="skeleton" style={{ height: 14, width: 110 }} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {Object.entries(CATEGORY_META).map(([k, m]) => {
                const currentTotal = sum(groups[k] || [])
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
                    <span className="font-eyebrow" style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                      {m.label}:
                    </span>
                    <span className="font-pachama-hero-number" style={{ fontSize: 16, color: 'var(--color-text)' }}>
                      {fmt(currentTotal)}
                    </span>
                    <span className="font-unit" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {m.unit}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Metric Cards (Pachama Bold Condensed Grotesk Hero) ───── */}
      <div className="dashboard-stat-grid">
        {loadingRec ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            {Object.entries(CATEGORY_META).map(([key, m]) => {
              const monthTotal = sum(groups[key] || [])
              const prevTotal  = sum(prevGroups[key] || [])
              const allTotal   = sum(allGroups[key] || [])
              const percentChange = prevTotal > 0
                ? Math.round(((monthTotal - prevTotal) / prevTotal) * 1000) / 10
                : null

              const thKey  = `${dept}:${key}`
              const thresh = thresholds[thKey]
              const isOver = thresh && monthTotal > thresh

              return (
                <div key={key} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Eyebrow */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--color-card-border-subtle)', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.color }} />
                        <span className="font-eyebrow" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {m.label}
                        </span>
                      </div>
                      <span className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
                        {m.meterId}
                      </span>
                    </div>

                    {/* Hero Stat: Bold Condensed Grotesk + All-Caps Unit */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0 12px 0' }}>
                      <span className="font-pachama-hero-number" style={{
                        fontSize: 48,
                        color: isOver ? 'var(--color-accent-alert)' : 'var(--color-text)',
                      }}>
                        {fmt(monthTotal)}
                      </span>
                      <span className="font-unit" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {m.unit}
                      </span>
                    </div>

                    {/* MoM Comparison */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      {percentChange !== null ? (
                        <>
                          <span className={percentChange <= 0 ? 'badge badge-positive' : 'badge badge-warning'}>
                            {percentChange > 0 ? <TrendingUp size={10} /> : percentChange < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                            <span>{percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`}</span>
                          </span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                            vs previous period
                          </span>
                        </>
                      ) : (
                        <span className="font-eyebrow" style={{ color: 'var(--color-text-dim)', fontSize: 10.5 }}>
                          BASELINE PERIOD
                        </span>
                      )}
                      {isOver && (
                        <span className="badge badge-alert" style={{ marginLeft: 'auto' }}>
                          OVER LIMIT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hairline Footer: Cumulative Load */}
                  <div style={{ paddingTop: 10, borderTop: '1px solid var(--color-card-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>CUMULATIVE LOAD</span>
                    <span className="font-eyebrow" style={{ fontSize: 11, color: 'var(--color-text)' }}>{fmt(allTotal)} {m.unit}</span>
                  </div>
                </div>
              )
            })}

            {/* Top Department Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--color-card-border-subtle)', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={13} color="var(--color-secondary)" />
                    <span className="font-eyebrow" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      MAX LOAD FACILITY
                    </span>
                  </div>
                  <span className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
                    AGG·01
                  </span>
                </div>

                <div className="font-pachama-display" style={{
                  fontSize: 32,
                  color: 'var(--color-text)',
                  lineHeight: 1.1,
                  margin: '8px 0 10px 0',
                }}>
                  {topDept}
                </div>

                <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  Highest aggregate consumption across facility meters this month.
                </div>
              </div>

              <div style={{ paddingTop: 10, borderTop: '1px solid var(--color-card-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>SCOPE</span>
                <span className="font-eyebrow" style={{ fontSize: 11, color: 'var(--color-text)' }}>ALL BLOCKS</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Main Telemetry Trend Chart ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        {/* Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div>
            <h2 className="font-pachama-display" style={{ fontSize: 16, color: 'var(--color-text)', margin: 0 }}>
              TELEMETRY TREND & ROLLING AVERAGE
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2, textTransform: 'none', letterSpacing: 'normal' }}>
              Daily meter readings with 7-day baseline
              {anomalyCount > 0 && !loadingChart && (
                <span className="font-eyebrow" style={{ marginLeft: 10, color: 'var(--color-chart-anomaly)', fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={12} color="var(--color-chart-anomaly)" /> {anomalyCount} ANOMAL{anomalyCount === 1 ? 'Y' : 'IES'} FLAGGED
                </span>
              )}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Department selector */}
            {isAdmin ? (
              <select
                className="input font-eyebrow"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                style={{ width: 'auto', minWidth: 110, fontSize: 11, padding: '5px 10px', cursor: 'pointer' }}
              >
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <div className="font-eyebrow" style={{
                padding: '5px 10px',
                background: 'var(--color-surface-recessed)',
                border: '1px solid var(--color-card-border)',
                borderRadius: 4,
                fontSize: 11,
                color: 'var(--color-text)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Building2 size={12} color="var(--color-text-muted)" />
                {dept}
              </div>
            )}

            {/* Type toggle pills */}
            <div style={{ display: 'flex', gap: 3, background: 'var(--color-surface-recessed)', border: '1px solid var(--color-card-border)', borderRadius: 9999, padding: 2 }}>
              {Object.entries(CATEGORY_META).map(([key, m]) => {
                const isActive = type === key
                return (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    className="font-eyebrow"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 9999,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 10,
                      transition: 'all 0.15s ease',
                      background: isActive ? m.color : 'transparent',
                      color:      isActive ? '#121D17' : 'var(--color-text-muted)',
                    }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Chart View */}
        {loadingChart ? (
          <ChartSkeleton />
        ) : chartError ? (
          <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
            <AlertTriangle size={22} color="var(--color-accent-alert)" />
            <div className="font-pachama-display" style={{ fontSize: 13, color: 'var(--color-text)' }}>{chartError}</div>
            <button className="btn btn-secondary" onClick={loadChart} style={{ fontSize: 10, padding: '4px 12px' }}>
              <RefreshCw size={10} /> RETRY STREAM
            </button>
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, textAlign: 'center', padding: 20 }}>
            <Activity size={24} color="var(--color-text-dim)" />
            <div className="font-pachama-display" style={{ fontSize: 13.5, color: 'var(--color-text)' }}>
              NO TELEMETRY RECORDED FOR {dept.toUpperCase()} · {meta.label}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', maxWidth: 360 }}>
              Log meter readings for this building block to track daily fluctuations and rolling average baselines.
            </div>
            <a href="/records" className="btn btn-secondary" style={{ fontSize: 10.5, padding: '6px 14px', marginTop: 4 }}>
              <Plus size={11} strokeWidth={2.5} /> LOG FIRST READING
            </a>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 10, right: 14, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--color-chart-axis)', fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-card-border)' }}
                tickFormatter={(v, i) => i % tickStep === 0 ? fmtDate(v) : ''}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--color-chart-axis)', fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmt(v, 0)}
                width={48}
              />
              <Tooltip content={<ChartTooltip unit={meta.unit} />} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--color-chart-line)"
                strokeWidth={1.75}
                dot={<DefaultDot />}
                activeDot={{ r: 4, fill: 'var(--color-chart-line)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="transparent"
                strokeWidth={0}
                dot={<DiamondVertex />}
                activeDot={false}
                legendType="none"
                tooltipType="none"
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        {chartData.length > 0 && !loadingChart && (
          <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-card-border-subtle)', flexWrap: 'wrap' }}>
            <div className="font-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--color-text-muted)' }}>
              <div style={{ width: 14, height: 2, background: 'var(--color-chart-line)', borderRadius: 1 }} />
              DAILY READING
            </div>
            <div className="font-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--color-text-muted)' }}>
              <div style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: 'var(--color-chart-anomaly)' }} />
              ANOMALY (&gt;20% ABOVE 7D ROLLING AVG)
            </div>
          </div>
        )}
      </div>

      {/* ── AI Insights & Forecast ─────────────────────────────────────────── */}
      <AIInsightsPanel department={dept} />
      <ForecastPanel department={dept} resourceType={type} />

      {/* ── Bottom Grid: Recent Readings & Allocation ──────────────────────── */}
      <div className="dashboard-bottom-grid">
        {/* Recent Readings Feed */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--color-card-border-subtle)' }}>
            <h2 className="font-pachama-display" style={{ fontSize: 14.5, color: 'var(--color-text)', margin: 0 }}>
              RECENT METER READINGS
            </h2>
            {!loadingRec && <span className="badge badge-neutral">{records.length} LOGGED</span>}
          </div>

          {loadingRec ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton" style={{ height: 32, borderRadius: 4 }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Activity size={22} color="var(--color-text-dim)" style={{ margin: '0 auto 6px' }} />
              <div className="font-pachama-display" style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 2 }}>
                NO READINGS LOGGED YET
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Record your first utility entry or import a bulk dataset.
              </div>
              <a href="/records" className="btn btn-secondary" style={{ fontSize: 10, padding: '5px 12px' }}>
                <Plus size={11} strokeWidth={2} /> LOG FIRST ENTRY
              </a>
            </div>
          ) : (
            recent.map((r, i) => {
              const m = CATEGORY_META[r.category?.toLowerCase()] || { color: 'var(--color-text-dim)', unit: '', Icon: Activity }
              return (
                <div key={r.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < recent.length - 1 ? '1px solid var(--color-card-border-subtle)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.resource_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{relativeTime(r.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="font-pachama-hero-number" style={{ fontSize: 16, color: 'var(--color-text)' }}>{fmt(r.quantity)}</span>
                    <span className="font-unit" style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>{r.unit?.toUpperCase() || m.unit}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Month Allocation Breakdown */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--color-card-border-subtle)' }}>
            <h2 className="font-pachama-display" style={{ fontSize: 14.5, color: 'var(--color-text)', margin: 0 }}>
              MONTHLY ALLOCATION BREAKDOWN
            </h2>
          </div>

          {loadingRec ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton" style={{ height: 12, width: 80 }} />
                    <div className="skeleton" style={{ height: 12, width: 60 }} />
                  </div>
                  <div className="skeleton" style={{ height: 6, width: '100%', borderRadius: 9999 }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(CATEGORY_META).map(([key, m]) => {
                const total    = sum(groups[key] || [])
                const totalAll = sum(thisMonthList) || 1
                const pct      = Math.round((total / totalAll) * 100)
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="font-eyebrow" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {m.label}
                      </span>
                      <span className="font-eyebrow" style={{ fontSize: 11.5 }}>
                        {fmt(total)} <span style={{ color: 'var(--color-text-muted)' }}>{m.unit}</span>
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 9999, background: 'var(--color-surface-recessed)' }}>
                      <div style={{ height: '100%', borderRadius: 9999, background: m.color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--color-surface-recessed)', border: '1px solid var(--color-card-border)', borderRadius: 6 }}>
            <div className="font-pachama-display" style={{ fontSize: 12.5, color: 'var(--color-text)', marginBottom: 2 }}>
              LOG UTILITY RECORDS
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>Record new readings or import bulk telemetry files.</div>
            <a href="/records" className="btn btn-secondary" style={{ fontSize: 10.5, padding: '5px 14px' }}>
              <span>OPEN RECORDS LOG</span> <ArrowRight size={11} />
            </a>
          </div>
        </div>
      </div>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </div>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function HealthBadge({ health }) {
  return (
    <div className="font-eyebrow" style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', background: 'var(--color-surface)',
      border: '1px solid var(--color-card-border)', borderRadius: 9999,
      fontSize: 10.5, color: 'var(--color-text-muted)', flexShrink: 0,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        backgroundColor: health.ok === null ? 'var(--color-text-dim)' : health.ok ? 'var(--color-accent-positive)' : 'var(--color-electricity)',
        boxShadow: health.ok ? '0 0 0 2px rgba(123, 168, 138, 0.25)' : 'none',
      }} />
      API: <span style={{ color: 'var(--color-text)' }}>{health.status?.toUpperCase()}</span>
    </div>
  )
}
