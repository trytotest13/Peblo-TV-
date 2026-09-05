/**
 * Viewer-local preferences and session helpers.
 *
 * The viewer is local-first: guests keep their My List and profile details in
 * localStorage, and signing in (peblo_token) additionally syncs My List with
 * the backend. All viewer localStorage keys live here so pages and components
 * never hard-code them.
 */

export type StoredUser = {
  name: string
  email: string
  avatarUrl?: string
}

export const DEFAULT_USER: StoredUser = { name: 'Guest', email: '' }

const USER_KEY = 'peblo_user'
const TOKEN_KEY = 'peblo_token'
const PREF_LANG_KEY = 'peblo_pref_lang'
const LIST_KEY_PREFIX = 'peblo-list:'

export function hasSession(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

export function setSessionToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): StoredUser {
  try {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? { ...DEFAULT_USER, ...JSON.parse(stored) } : DEFAULT_USER
  } catch {
    return DEFAULT_USER
  }
}

export function saveStoredUser(patch: Partial<StoredUser>): StoredUser {
  const next = { ...getStoredUser(), ...patch }
  localStorage.setItem(USER_KEY, JSON.stringify(next))
  return next
}

export function getPreferredLanguage(): string {
  return localStorage.getItem(PREF_LANG_KEY) || ''
}

export function setPreferredLanguage(language: string): void {
  if (language) localStorage.setItem(PREF_LANG_KEY, language)
  else localStorage.removeItem(PREF_LANG_KEY)
}

function listKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(LIST_KEY_PREFIX)) keys.push(key)
  }
  return keys
}

export function localMyListSlugs(): string[] {
  return listKeys()
    .filter((key) => localStorage.getItem(key) === 'true')
    .map((key) => key.slice(LIST_KEY_PREFIX.length))
}

/** Remove every locally saved show entry; returns how many were saved. */
export function clearLocalMyList(): number {
  const keys = listKeys()
  const saved = keys.filter((key) => localStorage.getItem(key) === 'true').length
  keys.forEach((key) => localStorage.removeItem(key))
  return saved
}
