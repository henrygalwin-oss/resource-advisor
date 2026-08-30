import axios from 'axios'
import { supabase } from './supabase'

/**
 * Shared axios instance.
 * In dev: If VITE_API_URL is unset, falls back to '' so Vite proxies /api → http://localhost:5001.
 * In production: Reads VITE_API_URL (or VITE_API_BASE_URL) set in Netlify/Vercel (e.g. https://resource-advisor-api.onrender.com).
 */
const rawBaseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''
const baseURL = rawBaseURL.replace(/\/+$/, '') // strip trailing slash to avoid double slashes

const api = axios.create({
  baseURL,
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
