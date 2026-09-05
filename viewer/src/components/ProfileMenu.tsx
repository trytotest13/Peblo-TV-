import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession, getStoredUser, hasSession } from '../prefs'

export default function ProfileMenu() {
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const signedIn = hasSession()
  const user = getStoredUser()

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const signOut = () => {
    clearSession()
    setOpen(false)
    navigate('/')
  }

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        className="avatar-btn"
        onClick={() => setOpen((current) => !current)}
        aria-label="User profile"
        aria-expanded={open}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} />
        ) : (
          <span className="avatar-initials">
            {signedIn ? user.name.charAt(0).toUpperCase() : 'G'}
          </span>
        )}
      </button>
      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-header">
            <strong>{signedIn ? user.name || 'Account' : 'Guest User'}</strong>
            <span>{signedIn && user.email ? user.email : 'Not signed in'}</span>
          </div>

          <button onClick={() => go('/profile')} role="menuitem">
            My Profile
          </button>
          <button onClick={() => go('/my-list')} role="menuitem">
            My List
          </button>
          <button onClick={() => go('/settings')} role="menuitem">
            Settings
          </button>

          <div className="dropdown-divider" />

          {signedIn ? (
            <button className="signout" onClick={signOut} role="menuitem">
              Sign Out
            </button>
          ) : (
            <button
              style={{ color: '#a78bfa', fontWeight: 600 }}
              onClick={() => go('/profile')}
              role="menuitem"
            >
              Sign In
            </button>
          )}
        </div>
      )}
    </div>
  )
}
