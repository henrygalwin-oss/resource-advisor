import React, { useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import {
  Sparkles, RefreshCw, AlertTriangle, ArrowRight,
  TrendingUp, TrendingDown, Minus, Zap, Droplets, Trash2,
  Send, X,
} from './Icons'

function formatTimeAgo(iso) {
  if (!iso) return null
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatFriendlyError(err, fallback = 'Failed to generate telemetry intelligence.') {
  const msg = err.response?.data?.message || err.message || ''
  const status = err.response?.status
  if (status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('resource exhausted')) {
    return 'Gemini AI service is temporarily rate-limited. Please retry in a few moments.'
  }
  if (status === 503 || msg.toLowerCase().includes('unavailable') || msg.toLowerCase().includes('overloaded')) {
    return 'Gemini AI service is momentarily overloaded. Please retry shortly.'
  }
  if (!navigator.onLine || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('econnrefused')) {
    return 'Network connection interrupted. Please verify connectivity and retry.'
  }
  return msg || fallback
}

function SavingsBadge({ pct }) {
  return (
    <span className="font-eyebrow" style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10,
      padding: '2px 7px',
      borderRadius: 9999,
      background: 'rgba(123, 168, 138, 0.22)',
      color: 'var(--color-accent-positive)',
      border: '1px solid rgba(123, 168, 138, 0.35)',
    }}>
      ↓ EST. SAVINGS: {pct}%
    </span>
  )
}

function InsightsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ height: 14, width: '94%' }} />
        <div className="skeleton" style={{ height: 14, width: '88%' }} />
        <div className="skeleton" style={{ height: 14, width: '62%' }} />
      </div>
      <div className="skeleton" style={{ height: 10, width: 140, marginTop: 4 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 48, borderRadius: 4 }} />
        ))}
      </div>
    </div>
  )
}

function ForecastSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="skeleton" style={{ height: 22, width: 130, borderRadius: 9999 }} />
        <div className="skeleton" style={{ height: 24, width: 160 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ height: 14, width: '92%' }} />
        <div className="skeleton" style={{ height: 14, width: '78%' }} />
      </div>
      <div className="skeleton" style={{ height: 48, borderRadius: 4 }} />
    </div>
  )
}

// ── AI Insights Panel ─────────────────────────────────────────────────────────
export function AIInsightsPanel({ department }) {
  const [data,      setData]      = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const lastDept = useRef(null)

  useEffect(() => {
    if (!department) return
    if (department === lastDept.current) return
    lastDept.current = department

    async function checkCache() {
      setError('')
      try {
        const { data: cacheRes } = await api.get('/api/ai/cache', {
          params: { type: 'insights', department },
        })
        if (cacheRes.hasCache && cacheRes.data) {
          setData(cacheRes.data)
          setUpdatedAt(cacheRes.updatedAt)
        } else {
          setData(null)
          setUpdatedAt(null)
        }
      } catch {
        setData(null)
        setUpdatedAt(null)
      }
    }
    checkCache()
  }, [department])

  async function handleGenerate(force = false) {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await api.post('/api/ai/insights', {
        department,
        forceRefresh: force,
      })
      setData(res)
      setUpdatedAt(res.updatedAt || new Date().toISOString())
    } catch (err) {
      setError(formatFriendlyError(err, 'Failed to generate operational insights.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{
      marginBottom: 20,
      borderLeft: '3.5px solid var(--color-secondary)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--color-card-border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} color="var(--color-secondary)" />
          <div>
            <div className="font-pachama-display" style={{ fontSize: 14.5, color: 'var(--color-text)' }}>
              OPERATIONAL INTELLIGENCE — {department}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Automated anomaly detection & efficiency evaluation
            </div>
          </div>
        </div>

        {/* Timestamp & Regenerate (only when insight exists) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {updatedAt && !loading && (
            <span className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              UPDATED {formatTimeAgo(updatedAt)?.toUpperCase()}
            </span>
          )}
          {data && !loading && (
            <button
              className="btn btn-secondary"
              onClick={() => handleGenerate(true)}
              disabled={loading}
              style={{ fontSize: 10, padding: '4px 10px' }}
              title="Regenerate operational insight"
            >
              <RefreshCw size={10} strokeWidth={2} /> REGENERATE
            </button>
          )}
        </div>
      </div>

      {loading && <InsightsSkeleton />}

      {error && !loading && (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(194, 84, 71, 0.10)',
          border: '1px solid rgba(194, 84, 71, 0.28)',
          borderRadius: 6,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <AlertTriangle size={15} color="var(--color-accent-alert)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: 'var(--color-accent-alert)', lineHeight: 1.45 }}>
              {error}
            </span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => handleGenerate(false)}
            style={{ fontSize: 10, padding: '5px 12px', borderColor: 'rgba(194, 84, 71, 0.40)', color: 'var(--color-text)' }}
          >
            <RefreshCw size={11} /> RETRY GENERATION
          </button>
        </div>
      )}

      {data && !loading && (
        <>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text)', marginBottom: 14 }}>
            {data.summary}
          </p>

          <div className="font-eyebrow" style={{ fontSize: 10.5, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            PRESCRIPTIVE DIRECTIVES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.recommendations?.map((rec, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '10px 12px',
                background: 'var(--color-surface-recessed)',
                border: '1px solid var(--color-card-border-subtle)',
                borderRadius: 4,
              }}>
                <div className="font-eyebrow" style={{
                  width: 18, height: 18, borderRadius: 2, flexShrink: 0,
                  background: 'var(--color-secondary)', color: 'var(--color-text-inverse)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, marginTop: 1,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-text)', margin: 0 }}>
                    {rec.text}
                  </p>
                  {rec.estimatedSavings != null && (
                    <div style={{ marginTop: 5 }}>
                      <SavingsBadge pct={rec.estimatedSavings} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          padding: '14px 16px',
          background: 'var(--color-surface-recessed)',
          border: '1px solid var(--color-card-border-subtle)',
          borderRadius: 6,
        }}>
          <div>
            <div className="font-pachama-display" style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 2 }}>
              NO EVALUATION RECORDED YET
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
              Analyze multi-utility flow telemetry and discover actionable conservation directives for <strong>{department}</strong>.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => handleGenerate(false)}
            style={{ fontSize: 10.5, padding: '7px 16px' }}
          >
            <Sparkles size={11} strokeWidth={2} /> RUN EVALUATION NOW
          </button>
        </div>
      )}
    </div>
  )
}

// ── AI Forecast Panel ─────────────────────────────────────────────────────────
const TREND_MAP = {
  rising:  { Icon: TrendingUp,   label: 'RISING RUN-RATE',    color: 'var(--color-electricity)' },
  falling: { Icon: TrendingDown, label: 'DECLINING RUN-RATE', color: 'var(--color-accent-positive)' },
  flat:    { Icon: Minus,        label: 'STABLE RUN-RATE',    color: 'var(--color-text-muted)' },
}

const TYPE_MAP = {
  electricity: { label: 'ELECTRICITY', Icon: Zap,      unit: 'KWH' },
  water:       { label: 'WATER FLOW',  Icon: Droplets, unit: 'L'   },
  waste:       { label: 'SOLID WASTE', Icon: Trash2,   unit: 'KG'  },
}

function fmtNum(n) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function fmtBreachDate(iso) {
  if (!iso) return null
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ForecastPanel({ department, resourceType }) {
  const [data,      setData]      = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const lastKey = useRef(null)

  useEffect(() => {
    if (!department || !resourceType) return
    const key = `${department}:${resourceType}`
    if (key === lastKey.current) return
    lastKey.current = key

    async function checkCache() {
      setError('')
      try {
        const { data: cacheRes } = await api.get('/api/ai/cache', {
          params: { type: 'forecast', department, resourceType },
        })
        if (cacheRes.hasCache && cacheRes.data) {
          setData(cacheRes.data)
          setUpdatedAt(cacheRes.updatedAt)
        } else {
          setData(null)
          setUpdatedAt(null)
        }
      } catch {
        setData(null)
        setUpdatedAt(null)
      }
    }
    checkCache()
  }, [department, resourceType])

  async function handleGenerate(force = false) {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await api.post('/api/ai/forecast', {
        department,
        resource_type: resourceType,
        forceRefresh: force,
      })
      setData(res)
      setUpdatedAt(res.updatedAt || new Date().toISOString())
    } catch (err) {
      setError(formatFriendlyError(err, 'Failed to generate 30-day forecast.'))
    } finally {
      setLoading(false)
    }
  }

  const typeMeta = TYPE_MAP[resourceType] || { label: resourceType.toUpperCase(), Icon: Zap, unit: '' }
  const trend = data ? (TREND_MAP[data.trend] || TREND_MAP.flat) : null
  const breachRisk = data?.willExceedThreshold

  return (
    <div className="card" style={{
      marginBottom: 20,
      borderLeft: `3.5px solid ${breachRisk ? 'var(--color-accent-alert)' : 'var(--color-water)'}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--color-card-border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: breachRisk ? 'var(--color-accent-alert)' : 'var(--color-water)' }} />
          <div>
            <div className="font-pachama-display" style={{ fontSize: 14.5, color: 'var(--color-text)' }}>
              PREDICTIVE RUN-RATE FORECAST — {department} · {typeMeta.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              30-day projection & threshold risk modeling
            </div>
          </div>
        </div>

        {/* Timestamp & Regenerate (only when forecast exists) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {updatedAt && !loading && (
            <span className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              UPDATED {formatTimeAgo(updatedAt)?.toUpperCase()}
            </span>
          )}
          {data && !loading && (
            <button
              className="btn btn-secondary"
              onClick={() => handleGenerate(true)}
              disabled={loading}
              style={{ fontSize: 10, padding: '4px 10px' }}
              title="Regenerate 30-day forecast"
            >
              <RefreshCw size={10} strokeWidth={2} /> REGENERATE
            </button>
          )}
        </div>
      </div>

      {loading && <ForecastSkeleton />}

      {error && !loading && (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(194, 84, 71, 0.10)',
          border: '1px solid rgba(194, 84, 71, 0.28)',
          borderRadius: 6,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <AlertTriangle size={15} color="var(--color-accent-alert)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: 'var(--color-accent-alert)', lineHeight: 1.45 }}>
              {error}
            </span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => handleGenerate(false)}
            style={{ fontSize: 10, padding: '5px 12px', borderColor: 'rgba(194, 84, 71, 0.40)', color: 'var(--color-text)' }}
          >
            <RefreshCw size={11} /> RETRY FORECAST
          </button>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Trend row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <trend.Icon size={14} color={breachRisk ? 'var(--color-accent-alert)' : trend.color} />
              <span className="font-eyebrow" style={{ fontSize: 11, color: breachRisk ? 'var(--color-accent-alert)' : trend.color }}>
                {trend.label}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Projected Month Total:</span>
              <span className="font-pachama-hero-number" style={{ fontSize: 20, color: breachRisk ? 'var(--color-accent-alert)' : 'var(--color-text)' }}>
                {fmtNum(data.projectedTotal)}
              </span>
              <span className="font-unit" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{data.unit?.toUpperCase()}</span>
              {data.threshold != null && (
                <span className="font-unit" style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>
                  (LIMIT: {fmtNum(data.threshold)} {data.unit?.toUpperCase()})
                </span>
              )}
            </div>
          </div>

          {/* Breach warning alert */}
          {breachRisk && (
            <div className="font-eyebrow" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: 'rgba(194, 84, 71, 0.12)',
              border: '1px solid rgba(194, 84, 71, 0.3)', borderRadius: 4,
              marginBottom: 10, fontSize: 11, color: 'var(--color-accent-alert)',
            }}>
              <AlertTriangle size={13} color="var(--color-accent-alert)" />
              <span>
                THRESHOLD RISK: PACE WILL EXCEED BUDGET ON{' '}
                <strong>{fmtBreachDate(data.projectedBreachDate)?.toUpperCase()}</strong>.
              </span>
            </div>
          )}

          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text)', marginBottom: 12 }}>
            {data.summary}
          </p>

          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            padding: '10px 12px', background: 'var(--color-surface-recessed)',
            border: '1px solid var(--color-card-border-subtle)', borderRadius: 4,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 2, flexShrink: 0,
              background: 'var(--color-water)', color: 'var(--color-text-inverse)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, marginTop: 1,
            }}>
              <ArrowRight size={10} strokeWidth={2.5} />
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-text)', margin: 0 }}>
              {data.recommendation}
            </p>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          padding: '14px 16px',
          background: 'var(--color-surface-recessed)',
          border: '1px solid var(--color-card-border-subtle)',
          borderRadius: 6,
        }}>
          <div>
            <div className="font-pachama-display" style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 2 }}>
              NO RUN-RATE PROJECTION GENERATED YET
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
              Project 30-day cumulative consumption for <strong>{department}</strong> · {typeMeta.label} and model threshold overrun risks.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => handleGenerate(false)}
            style={{ fontSize: 10.5, padding: '7px 16px' }}
          >
            <TrendingUp size={11} strokeWidth={2} /> MODEL 30-DAY FORECAST
          </button>
        </div>
      )}
    </div>
  )
}

// ── Floating AI Chat Assistant Widget ─────────────────────────────────────────
export function ChatWidget() {
  const [open,     setOpen]     = useState(false)
  const [input,    setInput]    = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your Facility Telemetry Assistant. Ask me anything regarding energy, water flow, or waste metrics.' },
  ])
  const [loading,  setLoading]  = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  async function handleSend(e) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || loading) return

    const newMessages = [...messages, { role: 'user', text: msg }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const history = newMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }))

      const { data } = await api.post('/api/ai/chat', { message: msg, history })
      const replyText = data.reply || data.answer || 'Telemetry analysis complete.'
      setMessages([...newMessages, { role: 'assistant', text: replyText }])
    } catch (err) {
      const errText = formatFriendlyError(err, 'Sorry, I could not connect to telemetry reasoning at this time.')
      setMessages([
        ...newMessages,
        { role: 'assistant', text: errText },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 18, right: 18, zIndex: 999 }}>
      {/* Floating Toggle Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--color-sidebar-bg)',
            color: '#F4F2EA',
            border: '1px solid var(--color-card-border)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          title="Open AI Telemetry Assistant"
        >
          <Sparkles size={20} color="var(--color-accent-positive)" />
        </button>
      )}

      {/* Chat Popover Window */}
      {open && (
        <div className="card fade-in" style={{
          width: 'min(360px, calc(100vw - 36px))',
          maxHeight: 'min(500px, calc(100dvh - 80px))',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: 'var(--color-sidebar-bg)',
            color: '#F4F2EA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--color-sidebar-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="var(--color-accent-positive)" />
              <div>
                <div className="font-pachama-display" style={{ fontSize: 12.5, color: '#F4F2EA' }}>FACILITY TELEMETRY AI</div>
                <div className="font-eyebrow" style={{ fontSize: 9.5, color: 'var(--color-sidebar-text)' }}>GEMINI INTELLIGENCE</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--color-sidebar-text)', cursor: 'pointer', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Message History */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxHeight: 330,
            background: 'var(--color-surface)',
          }}>
            {messages.map((m, idx) => {
              const isUser = m.role === 'user'
              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    background: isUser ? 'var(--color-primary)' : 'var(--color-surface-recessed)',
                    color: isUser ? 'var(--color-text-inverse)' : 'var(--color-text)',
                    border: isUser ? 'none' : '1px solid var(--color-card-border-subtle)',
                  }}
                >
                  {m.text}
                </div>
              )
            })}
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--color-surface-recessed)', borderRadius: 6, border: '1px solid var(--color-card-border-subtle)' }}>
                <span className="font-eyebrow" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>THINKING</span>
                <span className="skeleton" style={{ width: 6, height: 6, borderRadius: '50%' }} />
                <span className="skeleton" style={{ width: 6, height: 6, borderRadius: '50%' }} />
                <span className="skeleton" style={{ width: 6, height: 6, borderRadius: '50%' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--color-card-border)',
              display: 'flex',
              gap: 8,
              background: 'var(--color-surface)',
            }}
          >
            <input
              type="text"
              className="input"
              placeholder="Ask about facility telemetry…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!input.trim() || loading}
              style={{ padding: '6px 12px' }}
            >
              <Send size={12} strokeWidth={2} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
