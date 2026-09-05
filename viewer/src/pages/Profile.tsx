import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMe, fetchMyList, login, register } from '../api'
import {
  clearLocalMyList,
  clearSession,
  getStoredUser,
  hasSession,
  localMyListSlugs,
  saveStoredUser,
} from '../prefs'

export default function Profile() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [signedIn, setSignedIn] = useState(hasSession)
  const [mode, setMode] = useState<'signin' | 'create'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedName, setSavedName] = useState(() => getStoredUser().name)
  const [nameDraft, setNameDraft] = useState(savedName)
  const [status, setStatus] = useState('')
  const [localCount, setLocalCount] = useState(() => localMyListSlugs().length)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: signedIn,
    retry: false,
  })
  const listQuery = useQuery({
    queryKey: ['my-list'],
    queryFn: fetchMyList,
    enabled: signedIn,
    retry: false,
  })

  // Stale or invalid token — drop the session and fall back to the guest view.
  useEffect(() => {
    if (!signedIn || !meQuery.isError) return
    clearSession()
    queryClient.removeQueries({ queryKey: ['my-list'] })
    setSignedIn(false)
  }, [signedIn, meQuery.isError, queryClient])

  const isBusy = isSubmitting || (signedIn && meQuery.isLoading)

  const switchMode = (next: 'signin' | 'create') => {
    setMode(next)
    setFormError('')
  }

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError('')
    try {
      if (mode === 'signin') await login(email.trim(), password)
      else await register(email.trim(), password)
      const stored = getStoredUser()
      setSavedName(stored.name)
      setNameDraft(stored.name)
      setSignedIn(true)
      void queryClient.invalidateQueries({ queryKey: ['my-list'] })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
      setPassword('')
    }
  }

  const saveName = () => {
    const next = nameDraft.trim() || 'Guest'
    saveStoredUser({ name: next })
    setSavedName(next)
    setNameDraft(next)
    setStatus('Display name updated')
  }

  const signOut = () => {
    clearSession()
    queryClient.removeQueries({ queryKey: ['my-list'] })
    setSignedIn(false)
    navigate('/')
  }

  const clearDeviceList = () => {
    const removed = clearLocalMyList()
    setLocalCount(0)
    setStatus(
      removed
        ? `Removed ${removed} saved show${removed === 1 ? '' : 's'} from this device`
        : 'No shows were saved on this device'
    )
  }

  const me = meQuery.data
  const syncedCount = listQuery.data?.slugs.length

  return (
    <div className="my-list-page">
      <header className="my-list-header">
        <button className="topbar-logo" onClick={() => navigate('/')} aria-label="Peblo TV home">
          Peblo TV
        </button>
        <button className="detail-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </header>
      <main className="my-list-content" style={{ maxWidth: 540, margin: '0 auto' }}>
        <h1>{signedIn ? 'My Profile' : 'Sign In'}</h1>

        {signedIn ? (
          <>
            <section className="account-card" aria-labelledby="account-title">
              <h2 id="account-title">Account</h2>
              {meQuery.isLoading ? (
                <div className="loading-skeleton" style={{ height: 96 }} />
              ) : me ? (
                <>
                  <dl className="account-details">
                    <div>
                      <dt>Email</dt>
                      <dd>{me.email}</dd>
                    </div>
                    <div>
                      <dt>Role</dt>
                      <dd className="account-role">{me.role}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{me.is_active ? 'Active' : 'Disabled'}</dd>
                    </div>
                    <div>
                      <dt>My List</dt>
                      <dd>
                        {syncedCount === undefined
                          ? 'Syncing…'
                          : `${syncedCount} show${syncedCount === 1 ? '' : 's'} synced`}
                      </dd>
                    </div>
                  </dl>
                  <div className="account-actions">
                    <button className="account-btn" onClick={() => navigate('/my-list')}>
                      View My List
                    </button>
                    <button className="account-btn danger" onClick={signOut}>
                      Sign Out
                    </button>
                  </div>
                </>
              ) : null}
            </section>

            <section className="account-card" aria-labelledby="name-title">
              <h2 id="name-title">Display name</h2>
              <p className="account-card-hint">Shown on your profile menu on this device.</p>
              <form
                className="account-form-row"
                onSubmit={(event) => {
                  event.preventDefault()
                  saveName()
                }}
              >
                <input
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  aria-label="Display name"
                  maxLength={40}
                />
                <button
                  className="account-btn"
                  type="submit"
                  disabled={nameDraft.trim() === savedName}
                >
                  Save
                </button>
              </form>
            </section>

            <section className="account-card" aria-labelledby="device-title">
              <h2 id="device-title">This device</h2>
              <p className="account-card-hint">
                {localCount} show{localCount === 1 ? '' : 's'} saved on this device.
              </p>
              <div className="account-actions">
                <button
                  className="account-btn danger"
                  onClick={clearDeviceList}
                  disabled={localCount === 0}
                >
                  Clear My List on this device
                </button>
                <button className="filter-pill" onClick={() => navigate('/settings')}>
                  More Settings
                </button>
              </div>
            </section>
          </>
        ) : (
          <section className="account-card" aria-labelledby="auth-title">
            {/* Tab switch header */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 20,
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 12,
              }}
            >
              <button
                type="button"
                className={`filter-pill ${mode === 'signin' ? 'active' : ''}`}
                onClick={() => switchMode('signin')}
                style={{
                  background: mode === 'signin' ? '#6c38ff' : 'transparent',
                  color: '#ffffff',
                  border: mode === 'signin' ? 'none' : '1px solid var(--color-border)',
                  padding: '6px 16px',
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`filter-pill ${mode === 'create' ? 'active' : ''}`}
                onClick={() => switchMode('create')}
                style={{
                  background: mode === 'create' ? '#6c38ff' : 'transparent',
                  color: '#ffffff',
                  border: mode === 'create' ? 'none' : '1px solid var(--color-border)',
                  padding: '6px 16px',
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Create Account
              </button>
            </div>

            <h2 id="auth-title">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
            <p className="account-card-hint">
              {mode === 'signin'
                ? 'Sign in to access your profile and sync My List across devices.'
                : 'Create an account to sync My List and access custom playlists.'}
            </p>

            <form className="auth-form" onSubmit={submitAuth}>
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'create' ? 'At least 8 characters' : 'Your password'}
                  autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                  minLength={mode === 'create' ? 8 : undefined}
                  required
                />
              </label>
              {formError && <p className="auth-error">{formError}</p>}

              <div className="account-actions" style={{ marginTop: 20 }}>
                <button
                  className="account-btn"
                  type="submit"
                  disabled={isBusy}
                  style={{ height: 42, padding: '0 24px', fontWeight: 600 }}
                >
                  {isBusy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
                <button
                  className="filter-pill"
                  type="button"
                  onClick={() => switchMode(mode === 'signin' ? 'create' : 'signin')}
                  style={{
                    background: 'transparent',
                    color: '#a49cc0',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {mode === 'signin'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          </section>
        )}

        {status && (
          <div className="profile-toast" role="status">
            {status}
          </div>
        )}
      </main>
    </div>
  )
}
