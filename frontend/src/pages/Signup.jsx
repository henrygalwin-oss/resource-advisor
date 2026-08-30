import React, { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Activity, Eye, EyeOff } from '../components/Icons'

const DEPARTMENTS = ['Block A', 'Block B', 'Block C']

export default function Signup() {
  const { register, isAuthenticated, isLoading } = useAuth()
  const navigate      = useNavigate()

  const [form, setForm]                 = useState({ name: '', email: '', password: '', department: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)

  if (!isLoading && isAuthenticated) return <Navigate to="/" replace />

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!form.department) {
      setError('Please select your assigned building/department.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await register(form.name, form.email, form.password, form.department)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Account registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split-page" style={styles.page}>
      {/* Left panel – deep forest-ink branding */}
      <div style={styles.brand}>
        <div style={styles.brandInner}>
          {/* Logo Mark & Live Status Pill */}
          <div style={styles.brandBadge}>
            <div style={styles.brandLogoBox}>
              <Activity size={16} strokeWidth={2.25} color="var(--color-accent-positive)" />
            </div>
            <div className="font-eyebrow" style={{ fontSize: 10.5, color: 'var(--color-sidebar-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="sidebar-status-dot" />
              <span>FACILITY TELEMETRY · LIVE</span>
            </div>
          </div>

          <h1 style={styles.brandName}>RESOURCEADVISOR</h1>
          <p style={styles.brandTagline}>
            Deploy precision metering and AI-driven telemetry analytics for your facility.
          </p>

          <div style={styles.statsRow}>
            {[
              { value: '3', label: 'Utility Streams', unit: 'ELEC / H2O / WASTE' },
              { value: '30D', label: 'Run-Rate Modeling', unit: 'PREDICTIVE AI' },
              { value: '100%', label: 'Scoped Control', unit: 'RBAC TELEMETRY' },
            ].map((s) => (
              <div key={s.label} style={styles.statCard}>
                <div className="font-pachama-hero-number" style={styles.statValue}>{s.value}</div>
                <div className="font-eyebrow" style={styles.statLabel}>{s.label}</div>
                <div className="font-eyebrow" style={styles.statUnit}>{s.unit}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel – warm cream form canvas */}
      <div style={styles.formPanel}>
        <div style={styles.formBox}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={styles.formTitle}>Operator Enrollment</h2>
            <p style={styles.formSubtitle}>Create an account with building access</p>
          </div>

          {error && (
            <div style={styles.errorBanner} role="alert">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                className="input"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Doe"
                autoComplete="name"
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="signup-email">Work Email</label>
              <input
                id="signup-email"
                className="input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="operator@facilities.org"
                autoComplete="email"
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="signup-password">Password (min. 8 chars)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="signup-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={styles.eyeButton}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="signup-department">Assigned Building / Department</label>
              <select
                id="signup-department"
                className="input"
                name="department"
                value={form.department}
                onChange={handleChange}
                required
                style={{ cursor: 'pointer' }}
              >
                <option value="" disabled>Select building block…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8, padding: '10px 16px', fontSize: 13.5 }}
              disabled={loading}
            >
              {loading ? 'Enrolling Operator…' : 'Create Operator Account'}
            </button>
          </form>

          <p style={styles.switchText}>
            Already have an account?{' '}
            <Link to="/login" style={styles.switchLink}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 1fr',
    minHeight: '100dvh',
    fontFamily: 'var(--font-body)',
  },
  brand: {
    background: 'var(--color-sidebar-bg)',
    borderRight: '1px solid var(--color-sidebar-border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 40px',
  },
  brandInner: {
    maxWidth: 440,
    width: '100%',
  },
  brandBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  brandLogoBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: 'rgba(123, 168, 138, 0.16)',
    border: '1px solid rgba(123, 168, 138, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-accent-positive)',
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontVariationSettings: "'wdth' 78, 'wght' 850",
    fontSize: 32,
    color: '#F4F2EA',
    letterSpacing: '-0.02em',
    textTransform: 'uppercase',
    lineHeight: 1.1,
    marginBottom: 10,
  },
  brandTagline: {
    fontFamily: 'var(--font-body)',
    fontSize: 14.5,
    color: 'var(--color-sidebar-text)',
    lineHeight: 1.6,
    marginBottom: 32,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  statCard: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--color-sidebar-border)',
    borderRadius: 6,
    padding: '12px 10px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 22,
    color: '#F4F2EA',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: 'var(--color-accent-positive)',
    letterSpacing: '0.08em',
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 8.5,
    color: 'var(--color-sidebar-text)',
    letterSpacing: '0.06em',
  },
  formPanel: {
    background: 'var(--color-background)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 32px',
  },
  formBox: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-card-border)',
    borderRadius: 'var(--radius-card)',
    padding: '30px 28px',
    boxShadow: 'var(--shadow-card)',
  },
  formTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
    marginBottom: 4,
  },
  formSubtitle: { fontSize: 13, color: 'var(--color-text-muted)' },
  errorBanner: {
    background: 'rgba(194, 84, 71, 0.12)',
    border: '1px solid rgba(194, 84, 71, 0.30)',
    borderRadius: 4,
    color: 'var(--color-accent-alert)',
    fontSize: 12,
    padding: '8px 12px',
    marginBottom: 16,
    fontFamily: 'var(--font-mono)',
  },
  fieldGroup: { marginBottom: 14 },
  label: {
    display: 'block',
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-muted)',
    marginBottom: 4,
    fontFamily: 'var(--font-mono)',
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-muted)',
    transition: 'color 0.15s ease',
  },
  switchText: { textAlign: 'center', fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 20 },
  switchLink: { color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' },
}
