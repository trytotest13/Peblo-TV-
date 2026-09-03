const BASE = import.meta.env.VITE_API_URL || '/api'

export async function fetchCatalog() {
  const res = await fetch(`${BASE}/catalog`)
  if (!res.ok) throw new Error('Failed to load catalogue')
  return res.json()
}

export async function searchCatalog(params: { q?: string; section?: string; category?: string; language?: string }) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString()
  const res = await fetch(`${BASE}/catalog/search${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export const IMG = (path: string | undefined | null) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${BASE}/media/${path}`
}
