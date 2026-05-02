import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  LogOut, Menu, X, Plus
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/my-tasks', label: 'My Tasks', icon: CheckSquare },
  ]

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">Task<span>Flow</span></div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Team Task Manager</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          <div className="nav-section-label" style={{ marginTop: 20 }}>Quick Actions</div>
          <button className="nav-link" onClick={() => { navigate('/projects'); setSidebarOpen(false) }}>
            <Plus size={16} />
            New Project
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.avatar ? <img src={user.avatar} alt={user.name} /> : initials}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-icon btn-secondary"
            title="Logout"
            style={{ flexShrink: 0 }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Mobile topbar */}
        <div style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }} className="mobile-topbar">
          <div className="logo-mark">TaskFlow</div>
          <button className="btn btn-icon btn-secondary menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .mobile-topbar { display: flex !important; }
          }
        `}</style>

        <Outlet />
      </main>
    </div>
  )
}
