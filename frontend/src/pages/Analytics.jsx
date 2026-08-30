import React, { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import {
  Zap, Droplets, Trash2, Building2, TrendingUp, TrendingDown,
  AlertTriangle, Activity, Gauge, Minus, RefreshCw, Plus,
} from '../components/Icons'

// ── Design Tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  electricity: 'var(--color-electricity)',
  water:       'var(--color-water)',
  waste:       'var(--color-waste)',
}

const ICONS = {
  electricity: Zap,
  water:       Droplets,
  waste:       Trash2,
}

const UNITS = { electricity: 'KWH', water: 'L', waste: 'KG' }
const TYPES = ['electricity', 'water', 'waste']

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n, dec = 1) {
  return Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: dec })
}

function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function flattenDepts(departments) {
  return departments.map((d) => ({
    name:        d.name,
    electricity: d.electricity?.total ?? 0,
    water:       d.water?.total ?? 0,
    waste:       d.waste?.total ?? 0,
  }))
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
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
      <div className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {label}
      </div>
      {payload.map((p) => {
        const IconComp = ICONS[p.dataKey] || Activity
        return (
          <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 2 }}>
            <IconComp size={12} color={p.fill || p.color} />
            <span style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{p.name || p.dataKey}:</span>
            <span className="font-pachama-hero-number" style={{ fontSize: 13, color: 'var(--color-text)' }}>
              {fmt(p.value)} <span className="font-unit" style={{ fontSize: 10 }}>{UNITS[p.dataKey] || ''}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="font-pachama-display" style={{ fontSize: 14.5, color: 'var(--color-text)', marginBottom: 12 }}>
      {children}
    </h2>
  )
}

// ── High-Fidelity Skeletons for Analytics ──────────────────────────────────────
function AnalyticsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Index card skeleton */}
      <div className="card" style={{ borderLeft: '3.5px solid var(--color-card-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--color-card-border-subtle)', marginBottom: 14 }}>
          <div className="skeleton" style={{ height: 14, width: 220 }} />
          <div className="skeleton" style={{ height: 18, width: 140, borderRadius: 9999 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div className="skeleton" style={{ height: 64, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 64, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 64, borderRadius: 4 }} />
        </div>
      </div>

      {/* Row 1 skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 18 }}>
        <div className="card">
          <div className="skeleton" style={{ height: 14, width: 180, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: 240, marginBottom: 18 }} />
          <div className="skeleton" style={{ height: 210, width: '100%' }} />
        </div>
        <div className="card">
          <div className="skeleton" style={{ height: 14, width: 140, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: 180, marginBottom: 18 }} />
          <div className="skeleton" style={{ height: 140, width: 140, borderRadius: '50%', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ height: 14, width: '100%' }} />
            <div className="skeleton" style={{ height: 14, width: '100%' }} />
            <div className="skeleton" style={{ height: 14, width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Row 2 skeleton */}
      <div className="card">
        <div className="skeleton" style={{ height: 14, width: 220, marginBottom: 18 }} />
        <div className="skeleton" style={{ height: 200, width: '100%' }} />
      </div>
    </div>
  )
}

// ── Efficiency & Sustainability Score Widget ──────────────────────────────────
function EfficiencyScoreCard({ data, thresholds }) {
  if (!data) return null

  let totalThresholds = 0
  let breachedThresholds = 0
  for (const d of data.departments || []) {
    for (const t of TYPES) {
      const limit = thresholds[`${d.name}:${t}`]
      if (limit > 0) {
        totalThresholds++
        if ((d[t]?.total ?? 0) > limit) breachedThresholds++
      }
    }
  }
  const complianceRate = totalThresholds > 0
    ? Math.round(((totalThresholds - breachedThresholds) / totalThresholds) * 100)
    : 100

  let momSum = 0
  let momCount = 0
  for (const t of TYPES) {
    const pct = data.categoryTotals?.[t]?.percentChange
    if (pct !== null && pct !== undefined) {
      momSum += pct
      momCount++
    }
  }
  const avgMoM = momCount > 0 ? Math.round((momSum / momCount) * 10) / 10 : 0

  let rawScore = 85
  if (breachedThresholds > 0) rawScore -= (breachedThresholds * 12)
  if (avgMoM < 0) rawScore += Math.min(15, Math.abs(avgMoM))
  else if (avgMoM > 10) rawScore -= Math.min(20, avgMoM * 0.8)

  const score = Math.max(20, Math.min(100, Math.round(rawScore)))

  let gradeColor = 'var(--color-accent-positive)'
  let gradeLabel = 'OPTIMAL · HIGH EFFICIENCY'

  if (score < 65) {
    gradeColor = 'var(--color-accent-alert)'
    gradeLabel = 'ATTENTION NEEDED · HIGH USAGE'
  } else if (score < 80) {
    gradeColor = 'var(--color-accent-warning)'
    gradeLabel = 'MODERATE · BALANCED RUN-RATE'
  }

  return (
    <div className="card" style={{ marginBottom: 18, borderLeft: `3.5px solid ${gradeColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--color-card-border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gauge size={15} color={gradeColor} strokeWidth={2} />
          <h2 className="font-pachama-display" style={{ fontSize: 14.5, margin: 0, color: 'var(--color-text)' }}>
            RESOURCE EFFICIENCY & SUSTAINABILITY INDEX
          </h2>
        </div>
        <span className="font-eyebrow" style={{
          padding: '3px 9px',
          borderRadius: 9999,
          fontSize: 10,
          background: 'var(--color-surface-recessed)',
          color: gradeColor,
          border: `1px solid var(--color-card-border)`,
        }}>
          {gradeLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'center' }}>
        {/* Score gauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'var(--color-surface-recessed)', border: '1px solid var(--color-card-border-subtle)', borderRadius: 4 }}>
          <div className="font-pachama-hero-number" style={{
            width: 44, height: 44, borderRadius: 9999,
            background: gradeColor, color: '#121D17',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}>
            {score}
          </div>
          <div>
            <div className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              OVERALL SCORE
            </div>
            <div className="font-pachama-hero-number" style={{ fontSize: 14, color: 'var(--color-text)', marginTop: 2 }}>
              {score} / 100
            </div>
          </div>
        </div>

        {/* Threshold compliance */}
        <div style={{ padding: '10px 14px', background: 'var(--color-surface-recessed)', border: '1px solid var(--color-card-border-subtle)', borderRadius: 4 }}>
          <div className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            THRESHOLD COMPLIANCE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 3 }}>
            <span className="font-pachama-hero-number" style={{ fontSize: 20, color: totalThresholds > 0 && breachedThresholds > 0 ? 'var(--color-accent-warning)' : 'var(--color-text)' }}>
              {complianceRate}%
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {totalThresholds === 0 ? 'no limits set' : `${totalThresholds - breachedThresholds}/${totalThresholds} in budget`}
            </span>
          </div>
        </div>

        {/* MoM Conservation */}
        <div style={{ padding: '10px 14px', background: 'var(--color-surface-recessed)', border: '1px solid var(--color-card-border-subtle)', borderRadius: 4 }}>
          <div className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            MOM CONSERVATION TREND
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 3 }}>
            <span className="font-pachama-hero-number" style={{
              fontSize: 20,
              color: avgMoM > 0 ? 'var(--color-accent-warning)' : avgMoM < 0 ? 'var(--color-accent-positive)' : 'var(--color-text)',
            }}>
              {avgMoM > 0 ? `+${avgMoM}%` : `${avgMoM}%`}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {avgMoM < 0 ? 'net reduction' : avgMoM > 0 ? 'net increase' : 'stable'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
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
            FAILED TO RETRIEVE ANALYTICS
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {message}
          </div>
        </div>
      </div>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry} style={{ fontSize: 10.5, padding: '6px 14px' }}>
          <RefreshCw size={12} /> RETRY TELEMETRY FETCH
        </button>
      )}
    </div>
  )
}

// ── Main Analytics Component ──────────────────────────────────────────────────
export default function Analytics() {
  const [data,     setData]      = useState(null)
  const [settings, setSettings]  = useState([])
  const [loading,  setLoading]   = useState(true)
  const [error,    setError]     = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [aRes, sRes] = await Promise.all([
        api.get('/api/analytics'),
        api.get('/api/settings').catch(() => ({ data: { settings: [] } })),
      ])
      setData(aRes.data)
      setSettings(sRes.data.settings || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect to analytics aggregation service.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const scopedDept = data?.scopedDept ?? null

  const thresholds = {}
  for (const s of settings) {
    if (s.threshold > 0) thresholds[`${s.department}:${s.resource_type}`] = Number(s.threshold)
  }

  function isOver(dept, type) {
    const t = thresholds[`${dept}:${type}`]
    if (!t) return false
    return (data?.departments?.find((d) => d.name === dept)?.[type]?.total ?? 0) > t
  }

  const flatDepts = data ? flattenDepts(data.departments) : []

  const hasAnyData = data && (
    data.departments.some((d) => TYPES.some((t) => (d[t]?.total ?? 0) > 0)) ||
    data.monthlyTrend.length > 0
  )

  return (
    <div className="fade-in">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">RESOURCE ANALYTICS & BENCHMARKS</h1>
        <p className="page-subtitle">
          {scopedDept
            ? `Multi-resource telemetry breakdown for ${scopedDept}.`
            : 'Cross-building resource telemetry comparisons and multi-period trends.'}
        </p>
      </div>

      {loading && <AnalyticsSkeleton />}
      {error && !loading && <ErrorBanner message={error} onRetry={loadData} />}

      {!loading && !error && !hasAnyData && (
        <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <Activity size={32} color="var(--color-text-dim)" style={{ margin: '0 auto 10px' }} />
          <h2 className="font-pachama-display" style={{ fontSize: 15, marginBottom: 4 }}>
            NO BENCHMARK TELEMETRY AVAILABLE
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', maxWidth: 360, margin: '0 auto 18px', lineHeight: 1.5 }}>
            Log meter readings across your buildings to populate comparison bar charts, resource distribution percentages, and multi-period trends.
          </p>
          <a href="/records" className="btn btn-primary" style={{ fontSize: 11, padding: '7px 18px' }}>
            <Plus size={12} strokeWidth={2} /> RECORD FIRST ENTRY
          </a>
        </div>
      )}

      {!loading && !error && hasAnyData && (
        <>
          {/* Index Card */}
          <EfficiencyScoreCard data={data} thresholds={thresholds} />

          {/* ── Row 1: Bar & Donut Charts ──────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 18, marginBottom: 18 }} className="analytics-row1">
            {/* Grouped Bar Chart */}
            <div className="card">
              <SectionTitle>BUILDING LOAD COMPARISON</SectionTitle>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 14, marginTop: -8 }}>
                Aggregate consumption by block and resource stream
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={flatDepts} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--color-chart-axis)', fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-card-border)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-chart-axis)', fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    formatter={(v) => (
                      <span className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        {v} ({UNITS[v]})
                      </span>
                    )}
                  />
                  {TYPES.map((t) => (
                    <Bar key={t} dataKey={t} name={t} fill={COLORS[t]} radius={[2, 2, 0, 0]} maxBarSize={26} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut Chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <SectionTitle>RESOURCE ALLOCATION</SectionTitle>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, marginTop: -8 }}>
                Volume breakdown by resource
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={TYPES.map((t) => ({ name: t, value: data.categoryTotals?.[t]?.total ?? 0 }))}
                    cx="50%" cy="50%"
                    innerRadius={44} outerRadius={66}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {TYPES.map((t) => <Cell key={t} fill={COLORS[t]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [`${fmt(v)} ${UNITS[name] || ''}`, name.toUpperCase()]}
                    contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 11.5, borderRadius: 4, border: '1px solid var(--color-card-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Breakdown Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {TYPES.map((t) => {
                  const total    = data.categoryTotals?.[t]?.total ?? 0
                  const allTotal = TYPES.reduce((s, x) => s + (data.categoryTotals?.[x]?.total ?? 0), 0) || 1
                  const pct      = Math.round((total / allTotal) * 100)
                  const IconComp = ICONS[t]
                  const mom = data.categoryTotals?.[t]?.percentChange
                  return (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <IconComp size={12} color={COLORS[t]} />
                        <span className="font-eyebrow" style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>{t}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className="font-pachama-hero-number" style={{ fontSize: 13 }}>{fmt(total)}</span>
                        <span className="font-unit" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{UNITS[t]}</span>
                        {mom !== undefined && mom !== null && (
                          <span
                            className="font-eyebrow"
                            style={{
                              fontSize: 9.5,
                              padding: '1px 5px',
                              borderRadius: 9999,
                              background: mom > 0 ? 'rgba(217, 142, 74, 0.16)' : 'rgba(123, 168, 138, 0.20)',
                              color: mom > 0 ? 'var(--color-accent-warning)' : 'var(--color-accent-positive)',
                            }}
                          >
                            {mom > 0 ? `+${mom}%` : `${mom}%`}
                          </span>
                        )}
                        <span className="font-data-mono" style={{ fontSize: 10, color: 'var(--color-text-dim)', width: 24, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Row 2: Monthly Trend ───────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 18 }}>
            <SectionTitle>MULTI-PERIOD TREND — ALL LOCATIONS</SectionTitle>
            {data.monthlyTrend.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 12 }}>
                No monthly telemetry history recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.monthlyTrend} margin={{ top: 6, right: 14, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={fmtMonth}
                    tick={{ fontSize: 10, fill: 'var(--color-chart-axis)', fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-card-border)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-chart-axis)', fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {TYPES.map((t) => (
                    <Line
                      key={t}
                      type="monotone"
                      dataKey={t}
                      name={t.toUpperCase()}
                      stroke={COLORS[t]}
                      strokeWidth={1.75}
                      dot={{ r: 2.5, fill: COLORS[t], stroke: 'var(--color-surface)', strokeWidth: 1 }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Row 3: Department Summary Table ────────────────────────────── */}
          <div className="card">
            <SectionTitle>BUILDING TELEMETRY SUMMARY</SectionTitle>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-recessed)', borderBottom: '1px solid var(--color-card-border)' }}>
                    <th style={th}>Building / Block</th>
                    <th style={{ ...th, color: 'var(--color-electricity)' }}>⚡ ELECTRICITY (KWH)</th>
                    <th style={{ ...th, color: 'var(--color-water)' }}>💧 WATER (L)</th>
                    <th style={{ ...th, color: 'var(--color-waste)' }}>♻️ WASTE (KG)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.map((d, i) => (
                    <tr
                      key={d.name}
                      style={{
                        borderBottom: i < data.departments.length - 1 ? '1px solid var(--color-card-border-subtle)' : 'none',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-recessed)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ ...td, fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Building2 size={13} color="var(--color-text-muted)" />
                          <span>{d.name}</span>
                        </div>
                      </td>
                      {TYPES.map((t) => {
                        const over = isOver(d.name, t)
                        const mom = d[t]?.percentChange
                        return (
                          <td key={t} style={td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span className="font-pachama-hero-number" style={{
                                fontSize: 15,
                                color: over ? 'var(--color-accent-alert)' : 'var(--color-text)',
                              }}>
                                {fmt(d[t]?.total ?? 0)}
                              </span>
                              {over && (
                                <span title="Exceeds configured budget" style={{ color: 'var(--color-accent-alert)', display: 'inline-flex' }}>
                                  <AlertTriangle size={12} />
                                </span>
                              )}
                              {mom !== undefined && (
                                mom !== null ? (
                                  <span
                                    className="font-eyebrow"
                                    style={{
                                      fontSize: 10,
                                      padding: '1px 5px',
                                      borderRadius: 9999,
                                      background: mom > 0 ? 'rgba(217, 142, 74, 0.16)' : 'rgba(123, 168, 138, 0.20)',
                                      color: mom > 0 ? 'var(--color-accent-warning)' : 'var(--color-accent-positive)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 2,
                                    }}
                                  >
                                    {mom > 0 ? <TrendingUp size={10} /> : mom < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                                    {mom > 0 ? `+${mom}%` : `${mom}%`}
                                  </span>
                                ) : (
                                  <span className="font-eyebrow" style={{ fontSize: 9.5, color: 'var(--color-text-dim)' }}>(INIT)</span>
                                )
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {Object.keys(thresholds).length > 0 && (
              <div className="font-eyebrow" style={{ marginTop: 10, fontSize: 10.5, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={12} color="var(--color-accent-warning)" />
                <span>HIGHLIGHTED VALUES INDICATE THRESHOLD LIMIT BREACH CONFIGURED IN <a href="/settings" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>SETTINGS</a>.</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Table Style Helpers ───────────────────────────────────────────────────────
const th = {
  padding:       '8px 14px',
  textAlign:     'left',
  fontFamily:    'var(--font-display)',
  fontVariationSettings: "'wdth' 85, 'wght' 700",
  fontSize:      10.5,
  color:         'var(--color-text-muted)',
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  whiteSpace:    'nowrap',
}

const td = {
  padding:        '10px 14px',
  verticalAlign:  'middle',
  fontFamily:     'var(--font-body)',
  fontSize:       12.5,
  color:          'var(--color-text)',
}
