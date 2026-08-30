import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, FileSpreadsheet, BarChart3, Settings,
  LogOut, ShieldCheck, Activity, Building2, Sun, Moon, X
} from './Icons'

const navSections = [
  {
    title: 'TELEMETRY',
    items: [
      { to: '/',          label: 'DASHBOARD',  Icon: LayoutDashboard, shortcut: '⌘1' },
      { to: '/analytics', label: 'ANALYTICS',  Icon: BarChart3,       shortcut: '⌘2' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { to: '/records',   label: 'RECORDS',    Icon: FileSpreadsheet, shortcut: '⌘3' },
      { to: '/settings',  label: 'SETTINGS',   Icon: Settings,        shortcut: '⌘4' },
    ],
  },
]

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    if (onClose) onClose()
    navigate('/login', { replace: true })
  }

  // Keyboard navigation shortcuts (Cmd+1..4 or Ctrl+1..4)
  React.useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') { e.preventDefault(); navigate('/'); onClose() }
        else if (e.key === '2') { e.preventDefault(); navigate('/analytics'); onClose() }
        else if (e.key === '3') { e.preventDefault(); navigate('/records'); onClose() }
        else if (e.key === '4') { e.preventDefault(); navigate('/settings'); onClose() }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, onClose])

  // Build initials for avatar
  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* Workspace / Brand Header */}
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="sidebar-brand-name">
            <Activity size={15} color="var(--color-accent-positive)" />
            <span>ResourceAdvisor</span>
          </div>
          <div className="sidebar-brand-status">
            <span className="sidebar-status-dot" />
            <span>Facility Telemetry · Live</span>
          </div>
        </div>

        {/* Close Button for Mobile Drawer */}
        <button
          onClick={onClose}
          aria-label="Close navigation"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-sidebar-text)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="mobile-only-close"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Grouped Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navSections.map((section) => (
          <div key={section.title} className="nav-group">
            <div className="nav-group-title">{section.title}</div>
            {section.items.map(({ to, label, Icon, shortcut }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onClose}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <div className="nav-link-left">
                  <Icon size={15} strokeWidth={1.75} />
                  <span>{label}</span>
                </div>
                <span className="nav-shortcut">{shortcut}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Operator Dock / Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          {/* User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 4, flexShrink: 0,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10.5, fontWeight: 700, color: '#FFFFFF',
              fontFamily: 'var(--font-mono)',
            }}>
              {initials || 'U'}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#FFFFFF',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.name || 'Operator'}
              </div>
              <div style={{
                fontSize: 10.5, color: 'var(--color-sidebar-text)',
                display: 'flex', alignItems: 'center', gap: 3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-display)',
              }}>
                {user?.is_admin ? (
                  <>
                    <ShieldCheck size={11} color="#FBBF24" />
                    <span style={{ color: '#FBBF24', fontWeight: 600 }}>Admin</span>
                  </>
                ) : user?.department ? (
                  <>
                    <Building2 size={11} color="var(--color-sidebar-text)" />
                    <span>{user.department}</span>
                  </>
                ) : (
                  user?.email || ''
                )}
              </div>
            </div>
          </div>

          {/* Action buttons (Theme Toggle & Logout) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-sidebar-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 5,
                borderRadius: 4,
                transition: 'color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-sidebar-text)'; e.currentTarget.style.background = 'transparent' }}
            >
              {isDark ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-sidebar-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 5,
                borderRadius: 4,
                transition: 'color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-sidebar-text)'; e.currentTarget.style.background = 'transparent' }}
            >
              <LogOut size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
