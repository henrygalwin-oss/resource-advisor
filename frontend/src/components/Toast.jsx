import React, { useEffect, useState } from 'react'
import { Check, AlertTriangle, Activity, X } from './Icons'

export default function Toast({ type = 'success', message, onClose, duration = 4000 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const enterTimer = requestAnimationFrame(() => setVisible(true))
    const dismissTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 250)
    }, duration)

    return () => {
      cancelAnimationFrame(enterTimer)
      clearTimeout(dismissTimer)
    }
  }, [duration, onClose])

  const config = {
    success: {
      bg:     'var(--color-accent-positive)',
      light:  'rgba(123, 168, 138, 0.15)',
      border: 'rgba(123, 168, 138, 0.35)',
      text:   'var(--color-text)',
      Icon:   Check,
    },
    error: {
      bg:     'var(--color-accent-alert)',
      light:  'rgba(194, 84, 71, 0.12)',
      border: 'rgba(194, 84, 71, 0.30)',
      text:   'var(--color-text)',
      Icon:   AlertTriangle,
    },
    info: {
      bg:     'var(--color-water)',
      light:  'rgba(74, 123, 140, 0.12)',
      border: 'rgba(74, 123, 140, 0.25)',
      text:   'var(--color-text)',
      Icon:   Activity,
    },
  }

  const c = config[type] || config.info
  const IconComp = c.Icon

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 80,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--color-surface)',
        border: `1px solid ${c.border}`,
        borderLeft: `3.5px solid ${c.bg}`,
        borderRadius: 4,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        maxWidth: 360,
        fontFamily: 'var(--font-body)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 2, flexShrink: 0,
        background: c.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#121D17',
      }}>
        <IconComp size={11} strokeWidth={2.5} />
      </div>

      <div style={{ flex: 1, fontSize: 12, color: c.text, lineHeight: 1.45, fontWeight: 500 }}>
        {message}
      </div>

      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 250) }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center',
          padding: 2, flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  )
}
