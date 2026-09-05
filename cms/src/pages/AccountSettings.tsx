import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function AccountSettings() {
  const navigate = useNavigate()
  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: api.me })

  const handleLogout = () => {
    localStorage.removeItem('peblo_token')
    navigate('/login')
  }

  if (isLoading) {
    return <div className="empty-state">Loading user settings…</div>
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>Account Settings</h2>
        <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: 13.5 }}>
          Manage your account profile details and security settings.
        </p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 16,
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: 12,
          }}
        >
          Profile Information
        </h3>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-muted)',
                marginBottom: 6,
              }}
            >
              Email Address
            </label>
            <input
              type="text"
              value={user?.email || 'admin@peblo.local'}
              disabled
              readOnly
              style={{
                width: '100%',
                height: 38,
                background: 'var(--color-bg-soft)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0 12px',
                color: 'var(--color-text)',
                fontSize: 13.5,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-muted)',
                marginBottom: 6,
              }}
            >
              Role
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  padding: '4px 10px',
                  borderRadius: 4,
                  textTransform: 'capitalize',
                }}
              >
                {user?.role || 'admin'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                System Administrator Access
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 12,
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: 12,
          }}
        >
          Security & Session
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 18 }}>
          Staff accounts are managed by system administrators. Contact your system admin to update
          credentials or permissions.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="btn"
          style={{
            height: 36,
            padding: '0 16px',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: '#f87171',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Log Out of CMS
        </button>
      </div>
    </div>
  )
}
