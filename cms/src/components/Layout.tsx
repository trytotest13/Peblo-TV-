import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import {
  PlayIcon,
  LayersIcon,
  TagIcon,
  GlobeIcon,
  PublishIcon,
  LogoutIcon,
  HistoryIcon,
  SectionsIcon,
} from './Icons'

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
        <div className="sidebar-header">
          <div className="sidebar-brand">Peblo TV</div>
          <div className="sidebar-subtitle">CMS</div>
        </div>
        <nav className="sidebar-nav">
          <NavLink
            to="/shows"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <PlayIcon size={16} /> Shows
          </NavLink>
          <NavLink
            to="/episodes"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <LayersIcon size={16} /> Episodes
          </NavLink>

          <div className="sidebar-section-label">Content</div>
          <NavLink
            to="/categories"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <TagIcon size={16} /> Categories
          </NavLink>
          <NavLink
            to="/languages"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <GlobeIcon size={16} /> Languages
          </NavLink>

          <div className="sidebar-section-label">Admin</div>
          {user?.role === 'admin' && (
            <NavLink
              to="/audit-log"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <HistoryIcon size={16} /> Audit Log
            </NavLink>
          )}
          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <SectionsIcon size={16} /> Account
          </NavLink>

          {user?.role === 'admin' ? (
            <NavLink
              to="/publish"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <PublishIcon size={16} /> Publish
            </NavLink>
          ) : (
            <span className="sidebar-link" style={{ opacity: 0.4, cursor: 'default' }}>
              <PublishIcon size={16} /> Publish
            </span>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-avatar">
            {user ? user.email.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-email">{user?.email || '…'}</div>
            <div className="sidebar-footer-role">
              {user?.role === 'admin' ? 'Administrator' : user?.role || ''}
            </div>
          </div>
          <button className="btn btn-sm" onClick={logout} title="Log out" aria-label="Log out">
            <LogoutIcon size={15} /> Log out
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
