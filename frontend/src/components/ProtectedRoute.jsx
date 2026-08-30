import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps any route that requires authentication.
 *
 * Three states:
 *  - isLoading = true  → show nothing (or a spinner) while Supabase hydrates the session
 *  - isAuthenticated   → render children
 *  - not authenticated → redirect to /login, remembering the intended destination
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Wait for the initial session check — prevents flash-redirect to /login on refresh
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background)',
      }}>
        <svg width="28" height="28" viewBox="0 0 32 32" style={{ animation: 'spin 0.8s linear infinite' }}>
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--color-card-border)" strokeWidth="3" />
          <path d="M16 3 A13 13 0 0 1 29 16" fill="none" stroke="var(--color-accent-brand)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
