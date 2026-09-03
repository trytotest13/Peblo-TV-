import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export default function Layout() {
  const navigate = useNavigate()
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.me })

  const logout = () => {
    localStorage.removeItem('peblo_token')
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">📺 Peblo CMS</div>
        <nav className="sidebar-nav">
          <NavLink to="/shows" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Shows
          </NavLink>
          <NavLink to="/episodes" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Episodes
          </NavLink>
          <div className="sidebar-section-label">Admin</div>
          {user?.role === 'admin' && (
            <NavLink to="/publish" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              Publish
            </NavLink>
          )}
        </nav>
        <div style={{ padding: 16, fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
          {user && (
            <div>
              {user.email}
              <br />
              <span className={`badge badge-${user.role}`}>{user.role}</span>
            </div>
          )}
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={logout}>Log out</button>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
