import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-600 to-accent flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">GEO SaaS</h1>
            <p className="text-gray-500">{t('app.tagline')}</p>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            {t('auth.login.title')}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label={t('auth.login.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              icon={<Mail className="w-5 h-5" />}
              required
            />

            <Input
              type="password"
              label={t('auth.login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="w-5 h-5" />}
              required
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              icon={<LogIn className="w-4 h-4" />}
            >
              {loading ? t('auth.login.submitting') : t('auth.login.submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="text-accent hover:text-accent/80 font-medium">
              {t('auth.login.signup')}
            </Link>
          </p>
        </div>

        {/* Language Switcher */}
        <div className="mt-4 flex justify-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
            <select
              className="bg-transparent text-white border-none text-sm cursor-pointer focus:outline-none"
              defaultValue={localStorage.getItem('language') || 'en'}
              onChange={(e) => {
                localStorage.setItem('language', e.target.value);
                window.location.reload();
              }}
            >
              <option value="en" className="text-gray-900">{t('common.languages.english')}</option>
              <option value="vi" className="text-gray-900">{t('common.languages.vietnamese')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
