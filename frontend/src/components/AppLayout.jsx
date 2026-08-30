import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useTheme } from '../context/ThemeContext'
import { Menu, Activity, Sun, Moon } from './Icons'

/**
 * AppLayout
 * Wraps every page: Responsive layout with top mobile bar, drawer backdrop, and main content area.
 */
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="app-layout">
      {/* ── Mobile Top Header Bar (< 1024px) ──────────────────────────────── */}
      <header className="mobile-header">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#F4F2EA',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Activity size={16} color="var(--color-accent-positive)" />
          <span className="font-pachama-display" style={{ fontSize: 14, color: '#F4F2EA', letterSpacing: '0.04em' }}>
            ResourceAdvisor
          </span>
        </div>

        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#F4F2EA',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
        >
          {isDark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
        </button>
      </header>

      {/* ── Backdrop Overlay for Mobile Drawer ────────────────────────────── */}
      <div
        className={`sidebar-backdrop${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar Navigation ────────────────────────────────────────────── */}
      <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* ── Main Page Content ─────────────────────────────────────────────── */}
      <main className="main-content fade-in">
        <Outlet />
      </main>
    </div>
  )
}
