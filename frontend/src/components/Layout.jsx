import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', icon: '⬛', label: 'Dashboard' },
  { to: '/clients',   icon: '👤', label: 'Clients'   },
  { to: '/schedule',  icon: '📅', label: 'Schedule'  },
  { to: '/invoices',  icon: '🧾', label: 'Invoices'  },
  { to: '/settings',  icon: '⚙️',  label: 'Settings'  },
]

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/clients':   'Clients',
  '/schedule':  'Schedule',
  '/invoices':  'Invoices',
  '/settings':  'Settings',
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] || 'AdminFlow'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">A</div>
            AdminFlow
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Main</div>
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/" className="nav-link text-sm">
            <span className="nav-icon">🌐</span>
            View Landing
          </NavLink>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-actions">
            <div className="avatar sm">SD</div>
          </div>
        </header>
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
