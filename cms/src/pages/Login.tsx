import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('admin@peblo.local')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const login = useMutation({
    mutationFn: (vars: { email: string; password: string }) => api.login(vars.email, vars.password),
    onSuccess: (data) => {
      localStorage.setItem('peblo_token', data.access_token)
      navigate('/shows')
    },
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f9fa',
      }}
    >
      <div className="card" style={{ width: 380, padding: 28 }}>
        <h2 style={{ margin: '0 0 4px' }}>Peblo TV CMS</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: 13, margin: '0 0 20px' }}>
          Sign in to manage the catalogue.
        </p>

        {login.isError && <div className="alert alert-error">{(login.error as Error).message}</div>}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            login.mutate({ email, password })
          }}
        >
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={login.isPending}
            style={{ width: '100%' }}
          >
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--color-muted)' }}>
          Default admin: <code>admin@peblo.local</code> / <code>PebloAdmin#2026!Secure</code>
        </div>
      </div>
    </div>
  )
}
