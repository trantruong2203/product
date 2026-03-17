import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User } from '../../types';
import LanguageSwitcher from '../LanguageSwitcher';

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export default function Layout({ user, onLogout }: LayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <Link to="/" className="logo">
            GEO SaaS
          </Link>
          <nav className="nav">
            <Link to="/" className="nav-link">{t('layout.dashboard')}</Link>
            <Link to="/geo" className="nav-link">GEO Analysis</Link>
          </nav>
        </div>
        <div className="header-right">
          <LanguageSwitcher />
          <span className="user-email">{user.email}</span>
          <button onClick={onLogout} className="btn-logout">
            {t('layout.logout')}
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <style>{`
        .layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .header {
          background: #1a1a1a;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #333;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          color: #646cff;
          text-decoration: none;
        }
        .nav {
          display: flex;
          gap: 1rem;
        }
        .nav-link {
          color: #fff;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .user-email {
          color: #888;
        }
        .language-switcher {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #ccc;
          font-size: 0.9rem;
        }
        .language-switcher select {
          background: #2a2a2a;
          color: #fff;
          border: 1px solid #444;
          border-radius: 4px;
          padding: 0.35rem 0.5rem;
        }
        .btn-logout {
          background: #ff4444;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .main {
          flex: 1;
          padding: 2rem;
        }
      `}</style>
    </div>
  );
}
