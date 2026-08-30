import React, { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Activity, Check, Eye, EyeOff } from '../components/Icons'

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = location.state?.from?.pathname || '/'

  const [form, setForm]                 = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)

  if (!isLoading && isAuthenticated) return <Navigate to={from} replace />

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.email, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.')
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

          {/* Heading */}
          <h1 style={styles.brandName}>RESOURCEADVISOR</h1>

          {/* Subtext */}
          <p style={styles.brandTagline}>
            Enterprise utility monitoring and predictive facility telemetry across buildings.
          </p>

          {/* Feature Checklist */}
          <div style={styles.featureList}>
            {[
              'Multi-building electricity, water & waste telemetry',
              'Sub-second rolling average anomaly detection',
              'Automated AI forecasts & threshold breach alerts',
            ].map((f) => (
              <div key={f} style={styles.featureItem}>
                <div style={styles.featureIconBox}>
                  <Check size={12} strokeWidth={2.5} color="var(--color-accent-positive)" />
                </div>
                <span style={styles.featureText}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel – warm cream form canvas */}
      <div style={styles.formPanel}>
        <div style={styles.formBox}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={styles.formTitle}>Operator Sign In</h2>
            <p style={styles.formSubtitle}>Authenticate to access the operations console</p>
          </div>

          {error && (
            <div style={styles.errorBanner} role="alert">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="login-email">Work Email</label>
              <input
                id="login-email"
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
              <label style={styles.label} htmlFor="login-password">Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="login-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
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

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8, padding: '10px 16px', fontSize: 13.5 }}
              disabled={loading}
            >
              {loading ? 'Authenticating…' : 'Sign in to Console'}
            </button>
          </form>

          <p style={styles.switchText}>
            Need access credentials?{' '}
            <Link to="/signup" style={styles.switchLink}>Create account</Link>
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
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--color-sidebar-border)',
    borderRadius: 6,
    padding: '12px 14px',
  },
  featureIconBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    background: 'rgba(123, 168, 138, 0.18)',
    border: '1px solid rgba(123, 168, 138, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-accent-positive)',
    flexShrink: 0,
  },
  featureText: {
    fontSize: 13,
    fontWeight: 500,
    color: '#F4F2EA',
    lineHeight: 1.45,
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
    padding: '32px 28px',
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
  fieldGroup: { marginBottom: 16 },
  label: {
    display: 'block',
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-muted)',
    marginBottom: 5,
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
