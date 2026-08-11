import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">Mini ERP + CRM</div>
        <nav className="app-nav">
          <NavLink to="/customers" className={({ isActive }) => (isActive ? 'active' : '')}>
            Customers
          </NavLink>
        </nav>
        <div className="app-header-user">
          {user && (
            <>
              <span className="user-badge">
                {user.name} <span className="role-pill">{user.role}</span>
              </span>
              <button className="btn btn-ghost" onClick={logout}>
                Log out
              </button>
            </>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
