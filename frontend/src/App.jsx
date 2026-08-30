import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AppLayout      from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

// Auth pages (no layout shell)
import Login  from './pages/Login'
import Signup from './pages/Signup'

// Protected pages
import Dashboard from './pages/Dashboard'
import Resources from './pages/Resources'
import Analytics from './pages/Analytics'
import Settings  from './pages/Settings'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public auth pages ────────────────────────────────────────── */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* ── Protected pages — all share the AppLayout shell ──────────── */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index            element={<Dashboard />} />
              <Route path="records"   element={<Resources />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings"  element={<Settings />} />
            </Route>

            {/* Unknown paths → dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
