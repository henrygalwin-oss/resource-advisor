import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session,  setSession]  = useState(undefined) // undefined = loading, null = no session
  const [user,     setUser]     = useState(null)       // { id, email, name, is_admin, department }

  // ── Hydrate session on mount and listen for auth changes ──────────────────
  useEffect(() => {
    // Get current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(buildUser(session?.user))
    })

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(buildUser(session?.user))
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Sign up ────────────────────────────────────────────────────────────────
  async function register(name, email, password, department) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, department }, // stored in user_metadata
        emailRedirectTo: undefined,            // skip email confirmation
      },
    })
    if (error) throw error
    return data
  }

  // ── Sign in ────────────────────────────────────────────────────────────────
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // ── Sign out ───────────────────────────────────────────────────────────────
  async function logout() {
    await supabase.auth.signOut()
  }

  // ── Get current access token (used by api.js interceptor) ─────────────────
  async function getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const isLoading       = session === undefined
  const isAuthenticated = !!session

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated,
      isAdmin:    user?.is_admin ?? false,
      department: user?.department ?? null,
      login,
      register,
      logout,
      getAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// ── Helper: map Supabase user → our app user shape ────────────────────────────
function buildUser(supabaseUser) {
  if (!supabaseUser) return null
  const isAdmin = !!supabaseUser.user_metadata?.is_admin
  return {
    id:         supabaseUser.id,
    email:      supabaseUser.email,
    name:       supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
    is_admin:   isAdmin,
    // Admins see all depts; regular users have their own dept from user_metadata
    department: isAdmin ? null : (supabaseUser.user_metadata?.department || null),
  }
}
