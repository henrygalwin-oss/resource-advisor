import axios from 'axios'
import { supabase } from './supabase'

/**
 * Shared axios instance.
 * In dev, Vite proxies /api → http://localhost:5001 (configured in vite.config.js).
 * In production, set VITE_API_BASE_URL to the deployed backend URL.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
})

// ── Attach the live Supabase session token on every request ───────────────────
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// ── On 401, sign out and redirect to login ────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
