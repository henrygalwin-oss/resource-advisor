import React, { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Zap, Droplets, Trash2, Building2, ShieldCheck, Check, Sun, Moon, AlertTriangle, RefreshCw } from '../components/Icons'

// ── Constants ─────────────────────────────────────────────────────────────────
const DEPARTMENTS = ['Block A', 'Block B', 'Block C']
const TYPES = [
  { key: 'electricity', label: 'ELECTRICITY', Icon: Zap,      unit: 'KWH', color: 'var(--color-electricity)' },
  { key: 'water',       label: 'WATER',       Icon: Droplets, unit: 'L',   color: 'var(--color-water)' },
  { key: 'waste',       label: 'WASTE',       Icon: Trash2,   unit: 'KG',  color: 'var(--color-waste)' },
]

function SettingsSkeleton() {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr repeat(3, 1fr)',
        background: 'var(--color-surface-recessed)',
        borderBottom: '1px solid var(--color-card-border)',
        padding: '12px 18px',
      }}>
        <div className="skeleton" style={{ height: 12, width: 90 }} />
        <div className="skeleton" style={{ height: 12, width: 80 }} />
        <div className="skeleton" style={{ height: 12, width: 70 }} />
        <div className="skeleton" style={{ height: 12, width: 75 }} />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr repeat(3, 1fr)',
          borderBottom: i < 3 ? '1px solid var(--color-card-border-subtle)' : 'none',
          padding: '14px 18px',
          alignItems: 'center',
          gap: 12,
        }}>
          <div className="skeleton" style={{ height: 14, width: 80 }} />
          <div className="skeleton" style={{ height: 30, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 30, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 30, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

// ── Settings Page Component ───────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const isAdmin = !!user?.is_admin

  const [visibleDepts, setVisibleDepts] = useState(DEPARTMENTS)
  const [values,  setValues]  = useState(() => {
    const v = {}
    DEPARTMENTS.forEach((d) => {
      v[d] = {}
      TYPES.forEach((t) => { v[d][t.key] = '' })
    })
    return v
  })
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState(null)
  const dirtyRef = useRef(false)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/api/settings')
      const saved = data.settings || []

      const depts = [...new Set(saved.map((s) => s.department))].sort()
      const effectiveDepts = isAdmin
        ? DEPARTMENTS
        : depts.length > 0 ? depts : (user?.department ? [user.department] : DEPARTMENTS)
      setVisibleDepts(effectiveDepts)

      setValues((prev) => {
        const next = structuredClone(prev)
        for (const dept of effectiveDepts) {
          if (!next[dept]) {
            next[dept] = {}
            TYPES.forEach((t) => { next[dept][t.key] = '' })
          }
        }
        for (const s of saved) {
          if (next[s.department] !== undefined) {
            next[s.department][s.resource_type] = s.threshold === 0 ? '' : String(s.threshold)
          }
        }
        return next
      })
    } catch {
      setError('Could not retrieve threshold configurations from database.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, user?.department])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  function handleChange(dept, type, val) {
    dirtyRef.current = true
    setValues((prev) => ({
      ...prev,
      [dept]: { ...prev[dept], [type]: val },
    }))
  }

  async function handleSave() {
    setSaving(true)
    const rows = []
    for (const dept of DEPARTMENTS) {
      for (const { key } of TYPES) {
        const raw = values[dept][key]
        const threshold = raw === '' ? 0 : Number(raw)
        if (isNaN(threshold) || threshold < 0) {
          setToast({ type: 'error', message: `Invalid threshold for ${dept} / ${key} — must be a positive number.` })
          setSaving(false)
          return
        }
        rows.push({ department: dept, resource_type: key, threshold })
      }
    }
    try {
      await api.put('/api/settings', { settings: rows })
      dirtyRef.current = false
      setToast({ type: 'success', message: 'Telemetry thresholds saved successfully.' })
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fade-in">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 className="page-title">OPERATIONAL THRESHOLDS & PREFERENCES</h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Configure maximum acceptable consumption limits per building. Over-limit breaches will be automatically flagged across dashboards and reports.'
              : 'Active consumption limits configured by facility administration.'}
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            <Check size={13} strokeWidth={2.5} />
            {saving ? 'SAVING…' : 'SAVE THRESHOLDS'}
          </button>
        )}
      </div>

      {/* ── Theme Appearance Preference Card ──────────────────────────────── */}
      <div className="card" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="font-pachama-display" style={{ fontSize: 13.5, color: 'var(--color-text)' }}>
            INTERFACE THEME MODE
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Switch between Warm Paper (Light) and Deep Ink (Dark) visual environments.
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={toggleTheme}
          style={{ fontSize: 10.5, padding: '6px 14px' }}
        >
          {isDark ? <Sun size={12} strokeWidth={2} /> : <Moon size={12} strokeWidth={2} />}
          <span>{isDark ? 'SWITCH TO LIGHT MODE' : 'SWITCH TO DARK MODE'}</span>
        </button>
      </div>

      {error && !loading && (
        <div className="card" style={{
          marginBottom: 18,
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
                FAILED TO LOAD THRESHOLDS
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {error}
              </div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={loadSettings} style={{ fontSize: 10.5, padding: '6px 14px' }}>
            <RefreshCw size={12} /> RETRY
          </button>
        </div>
      )}

      {!isAdmin && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(217, 142, 74, 0.12)',
          border: '1px solid rgba(217, 142, 74, 0.25)',
          borderLeft: '3.5px solid var(--color-electricity)',
          borderRadius: 6,
          marginBottom: 18,
          fontSize: 12.5,
          color: 'var(--color-text)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <ShieldCheck size={14} color="var(--color-electricity)" />
          <span><strong>Read-only mode:</strong> Contact a facility administrator to modify consumption limits.</span>
        </div>
      )}

      {loading ? <SettingsSkeleton /> : (
        <>
          {/* Info Banner */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-card-border)',
            borderRadius: 6,
            marginBottom: 18,
            fontSize: 12.5,
            color: 'var(--color-text-muted)',
            lineHeight: 1.55,
          }}>
            <strong style={{ color: 'var(--color-text)' }}>Threshold Configuration:</strong>{' '}
            Enter the maximum monthly consumption budget for each building. Leave blank or enter 0 to disable automated breach detection for that resource stream.
          </div>

          {/* Desktop Grid Table (>= 640px) */}
          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', minWidth: 540 }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr repeat(3, 1fr)',
                background: 'var(--color-surface-recessed)',
                borderBottom: '1px solid var(--color-card-border)',
                padding: '10px 18px',
              }}>
                <div style={colHead}>Building / Block</div>
                {TYPES.map((t) => {
                  const IconComp = t.Icon
                  return (
                    <div key={t.key} style={{ ...colHead, display: 'flex', alignItems: 'center', gap: 5, color: t.color }}>
                      <IconComp size={12} strokeWidth={2} />
                      <span>{t.label}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--color-text-muted)' }}>({t.unit})</span>
                    </div>
                  )
                })}
              </div>

              {/* Rows */}
              {visibleDepts.map((dept, di) => (
                <div
                  key={dept}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr repeat(3, 1fr)',
                    borderBottom: di < visibleDepts.length - 1 ? '1px solid var(--color-card-border-subtle)' : 'none',
                    padding: '12px 18px',
                    alignItems: 'center',
                    gap: 12,
                    background: di % 2 === 1 ? 'var(--color-surface-recessed)' : 'var(--color-surface)',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={13} color="var(--color-text-muted)" />
                    <span>{dept}</span>
                  </div>

                  {TYPES.map((t) => (
                    <div key={t.key}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <input
                          id={`threshold-${dept}-${t.key}`}
                          type="number"
                          min="0"
                          step="any"
                          className="input"
                          value={values[dept][t.key]}
                          onChange={(e) => isAdmin && handleChange(dept, t.key, e.target.value)}
                          readOnly={!isAdmin}
                          placeholder={isAdmin ? 'No budget' : '—'}
                          style={{
                            flex: 1,
                            fontSize: 12.5,
                            fontFamily: 'var(--font-mono)',
                            padding: '6px 8px',
                            opacity: isAdmin ? 1 : 0.65,
                            cursor: isAdmin ? 'text' : 'default',
                          }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                          {t.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Building Cards (< 640px) */}
          <div className="mobile-card-list">
            {visibleDepts.map((dept) => (
              <div key={dept} className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--color-card-border-subtle)' }}>
                  <Building2 size={14} color="var(--color-secondary)" />
                  <span className="font-pachama-display" style={{ fontSize: 14, color: 'var(--color-text)' }}>
                    {dept}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TYPES.map((t) => {
                    const IconComp = t.Icon
                    return (
                      <div key={t.key}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: t.color, marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                          <IconComp size={12} strokeWidth={2} />
                          <span>{t.label} ({t.unit})</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            id={`m-threshold-${dept}-${t.key}`}
                            type="number"
                            min="0"
                            step="any"
                            className="input"
                            value={values[dept][t.key]}
                            onChange={(e) => isAdmin && handleChange(dept, t.key, e.target.value)}
                            readOnly={!isAdmin}
                            placeholder={isAdmin ? 'No limit' : '—'}
                            style={{
                              flex: 1,
                              fontSize: 12.5,
                              fontFamily: 'var(--font-mono)',
                              padding: '8px 10px',
                              opacity: isAdmin ? 1 : 0.65,
                              cursor: isAdmin ? 'text' : 'default',
                            }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {t.unit}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

const colHead = {
  fontFamily:    'var(--font-mono)',
  fontSize:      10.5,
  fontWeight:    700,
  color:         'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}
