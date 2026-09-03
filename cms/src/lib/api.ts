// Centralised API client with JWT auth
const BASE = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('peblo_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers }).catch((err) => {
    throw new Error(
      `Cannot reach API at ${BASE}. Is the backend running on port 8000? (${err.message})`
    )
  })
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('peblo_token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; email: string; role: string }>('/auth/me'),

  // Shows
  listShows: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<any[]>(`/shows${qs}`)
  },
  getShow: (id: string) => request<any>(`/shows/${id}`),
  createShow: (body: any) => request<any>('/shows', { method: 'POST', body: JSON.stringify(body) }),
  updateShow: (id: string, body: any) =>
    request<any>(`/shows/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteShow: (id: string) => request<void>(`/shows/${id}`, { method: 'DELETE' }),

  // Seasons
  createSeason: (body: any) =>
    request<any>('/seasons', { method: 'POST', body: JSON.stringify(body) }),
  updateSeason: (id: string, body: any) =>
    request<any>(`/seasons/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSeason: (id: string) => request<void>(`/seasons/${id}`, { method: 'DELETE' }),

  // Episodes
  listEpisodes: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<any[]>(`/episodes${qs}`)
  },
  getEpisode: (id: string) => request<any>(`/episodes/${id}`),
  createEpisode: (body: any) =>
    request<any>('/episodes', { method: 'POST', body: JSON.stringify(body) }),
  updateEpisode: (id: string, body: any) =>
    request<any>(`/episodes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteEpisode: (id: string) => request<void>(`/episodes/${id}`, { method: 'DELETE' }),

  // Artwork
  uploadArtwork: async (formData: FormData): Promise<any> => {
    const token = getToken()
    const res = await fetch(`${BASE}/artwork/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail?.errors?.join(' ') || 'Upload failed')
    }
    return res.json()
  },

  // Catalog
  publishCatalog: () => request<any>('/catalog/publish', { method: 'POST' }),
  getPublishRuns: (skip = 0) => request<any[]>(`/catalog/publish-runs?skip=${skip}&limit=20`),
  getValidationReport: () => request<any>('/admin/validation-report'),
}
