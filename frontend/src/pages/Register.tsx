import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';
import { User } from '../types';

interface RegisterProps {
  onLogin: (user: User, token: string) => void;
}

export default function Register({ onLogin }: RegisterProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.register({ email, password, name });
      if (res.data.success) {
        onLogin(res.data.data.user, res.data.data.token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.register.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>GEO SaaS</h1>
        <h2>{t('auth.register.title')}</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.register.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>{t('auth.register.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('auth.register.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('auth.register.submitting') : t('auth.register.submit')}
          </button>
        </form>
        <p className="auth-link">
          {t('auth.register.hasAccount')} <a href="/login">{t('auth.register.signin')}</a>
        </p>
      </div>
      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a1a;
        }
        .auth-card {
          background: #2a2a2a;
          padding: 2rem;
          border-radius: 8px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .auth-card h1 {
          text-align: center;
          color: #646cff;
          margin-bottom: 0.5rem;
        }
        .auth-card h2 {
          text-align: center;
          color: #fff;
          margin-bottom: 1.5rem;
        }
        .error {
          background: rgba(255, 68, 68, 0.2);
          color: #ff4444;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          text-align: center;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #ccc;
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #444;
          border-radius: 4px;
          background: #1a1a1a;
          color: #fff;
          box-sizing: border-box;
        }
        .form-group input:focus {
          outline: none;
          border-color: #646cff;
        }
        .btn-primary {
          width: 100%;
          padding: 0.75rem;
          background: #646cff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        .btn-primary:hover {
          background: #535bf2;
        }
        .btn-primary:disabled {
          background: #444;
          cursor: not-allowed;
        }
        .auth-link {
          text-align: center;
          margin-top: 1rem;
          color: #888;
        }
        .auth-link a {
          color: #646cff;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
