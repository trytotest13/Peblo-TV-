import { DEFAULT_USER, getStoredUser, saveStoredUser, setSessionToken } from './prefs'

const rawBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api'
const BASE = rawBase.replace(/\/+$/, '')

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem('peblo_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface LanguageVariant {
  language: string
  episode_slug: string
  duration_seconds?: number | null
  video_url?: string | null
  hls_url?: string | null
  stream_url?: string | null
}

export interface EpisodeEntry {
  slug: string
  title: string
  synopsis?: string | null
  episode_number: number
  season_number: number
  languages: LanguageVariant[]
  poster_url?: string | null
  banner_url?: string | null
  thumbnail_url?: string | null
  video_url?: string | null
  hls_url?: string | null
  stream_url?: string | null
}

export interface SeasonEntry {
  season_number: number
  title?: string | null
  episodes: EpisodeEntry[]
}

export interface Show {
  slug: string
  title: string
  synopsis?: string | null
  section: string
  categories: string[]
  year?: number | null
  rating?: string | number | null
  seasons: SeasonEntry[]
  poster_url?: string | null
  banner_url?: string | null
  thumbnail_url?: string | null
}

export interface Catalog {
  shows: Show[]
}

export async function fetchCatalog(): Promise<Catalog> {
  const res = await fetch(`${BASE}/catalog`)
  if (!res.ok) throw new Error('Failed to load catalogue')
  return res.json()
}

export async function searchCatalog(params: {
  q?: string
  section?: string
  category?: string
  language?: string
}): Promise<{ results: Show[] }> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString()
  const res = await fetch(`${BASE}/catalog/search${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export async function fetchMyList(): Promise<{ slugs: string[] }> {
  const res = await fetch(`${BASE}/my-list`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Sign in to view My List')
  return res.json()
}

export async function addToMyList(slug: string): Promise<void> {
  const res = await fetch(`${BASE}/my-list/${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Could not add show to My List')
}

export async function removeFromMyList(slug: string): Promise<void> {
  const res = await fetch(`${BASE}/my-list/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Could not remove show from My List')
}

export interface ViewerUser {
  id: string
  email: string
  role: string
  is_active: boolean
}

/** FastAPI errors carry a `detail` string — surface it when present. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string }
    return body.detail || fallback
  } catch {
    return fallback
  }
}

/** Sign in with email/password, store the JWT, and return it. */
export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not sign in'))
  const data = (await res.json()) as { access_token: string }
  setSessionToken(data.access_token)
  const stored = getStoredUser()
  saveStoredUser({
    email,
    name: !stored.name || stored.name === DEFAULT_USER.name ? email.split('@')[0] : stored.name,
  })
  return data.access_token
}

/** Create an account, then sign in so the viewer immediately gets a token. */
export async function register(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not create account'))
  await login(email, password)
}

/** Fetch the signed-in account (id, email, role, is_active). */
export async function fetchMe(): Promise<ViewerUser> {
  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await errorMessage(res, 'Session expired'))
  return res.json()
}

export const IMG = (path: string | undefined | null): string => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = (
    import.meta.env.VITE_CDN_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  ).replace(/\/+$/, '')
  return base
    ? new URL(path.startsWith('/') ? path : `/media/${path}`, base).href
    : path.startsWith('/')
      ? path
      : `/media/${path}`
}
