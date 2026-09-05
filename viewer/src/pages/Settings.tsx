import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  clearLocalMyList,
  getPreferredLanguage,
  hasSession,
  localMyListSlugs,
  setPreferredLanguage,
} from '../prefs'

const LANGUAGES: { code: string; label: string }[] = [
  { code: '', label: 'Auto' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
]

export default function Settings() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState(getPreferredLanguage)
  const [status, setStatus] = useState('')
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [listCount, setListCount] = useState(() => localMyListSlugs().length)
  const signedIn = hasSession()

  const selectLanguage = (code: string) => {
    setPreferredLanguage(code)
    setLanguage(code)
    setStatus(
      code
        ? `Audio preference set to ${LANGUAGES.find((l) => l.code === code)?.label}`
        : 'Audio preference set to Auto'
    )
  }

  const clearList = () => {
    const removed = clearLocalMyList()
    setListCount(0)
    setConfirmingClear(false)
    setStatus(
      removed
        ? `Removed ${removed} saved show${removed === 1 ? '' : 's'} from this device`
        : 'No shows were saved on this device'
    )
  }

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
      <main className="my-list-content">
        <h1>Settings</h1>

        <section className="account-card" aria-labelledby="audio-title">
          <h2 id="audio-title">Audio language</h2>
          <p className="account-card-hint">
            When an episode is available in more than one language, playback starts in your
            preferred one.
          </p>
          <div className="account-choice-row" role="radiogroup" aria-labelledby="audio-title">
            {LANGUAGES.map((option) => (
              <button
                key={option.code || 'auto'}
                className={`filter-pill${language === option.code ? ' active' : ''}`}
                role="radio"
                aria-checked={language === option.code}
                onClick={() => selectLanguage(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="account-card" aria-labelledby="data-title">
          <h2 id="data-title">My List on this device</h2>
          <p className="account-card-hint">
            {signedIn
              ? 'Signed in — your My List is synced with your account. Clearing below only removes shows saved on this device while signed out.'
              : 'Shows you save while signed out are stored on this device only.'}{' '}
            Currently {listCount} show{listCount === 1 ? '' : 's'} saved here.
          </p>
          <div className="account-actions">
            {confirmingClear ? (
              <>
                <button className="account-btn danger" onClick={clearList}>
                  Yes, remove them
                </button>
                <button className="filter-pill" onClick={() => setConfirmingClear(false)}>
                  Keep my shows
                </button>
              </>
            ) : (
              <button
                className="account-btn"
                onClick={() => setConfirmingClear(true)}
                disabled={listCount === 0}
              >
                Clear My List on this device
              </button>
            )}
            <Link to="/my-list" className="filter-pill">
              View My List
            </Link>
          </div>
        </section>

        <section className="account-card" aria-labelledby="account-title">
          <h2 id="account-title">Account</h2>
          <p className="account-card-hint">
            {signedIn
              ? 'You are signed in — your profile and synced My List live on your account.'
              : 'Sign in to sync My List across devices.'}
          </p>
          <div className="account-actions">
            <Link to="/profile" className="account-btn">
              {signedIn ? 'Manage profile' : 'Sign in'}
            </Link>
          </div>
        </section>

        {status && (
          <div className="profile-toast" role="status">
            {status}
          </div>
        )}
      </main>
    </div>
  )
}
