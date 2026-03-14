'use client';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LoginPage from './components/ui/gaming-login';
import { Navbar1 } from './components/blocks/navbar1';

const API_BASE = '/api';

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
  return data;
}

function redirectAfterLogin(user: { isAdmin?: boolean }) {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && (next.startsWith('/staff') || next.startsWith('/coordinator'))) {
    window.location.href = next;
  } else if (user.isAdmin) {
    window.location.href = '/coordinator';
  } else {
    window.location.href = '/staff';
  }
}

function App() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api('/auth/me').then((res) => {
      if (res.data) redirectAfterLogin(res.data);
    }).catch(() => {});
  }, []);

  const handleLogin = async (email: string, password: string, remember: boolean) => {
    setError(null);
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, remember })
      });
      if (res.data) {
        redirectAfterLogin(res.data);
      } else {
        setError(res.message || t('errors.signInFailed'));
      }
    } catch (err) {
      setError((err as Error).message || t('errors.signInFailedDetails'));
    }
  };

  return (
    <div className="relative min-h-screen w-full">
      <Navbar1
        logo={{
          url: '/',
          src: '/assets/images/logo.png',
          alt: t('common.commonGround'),
          title: t('common.commonGround'),
        }}
        donateUrl="/donate"
        auth={{
          login: { text: t('common.staffLogin'), url: '/login' },
        }}
      />
      <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center px-4 py-12">
        <LoginPage.VideoBackground videoUrl="/assets/videos/community/food-bank/volunteer-bread-hungry.mp4" />

        <div className="relative z-20 w-full max-w-md animate-fadeIn">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
            {error}
          </div>
        )}
          <LoginPage.LoginForm onSubmit={handleLogin} />
        </div>
      </div>

      <footer className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-sm z-20">
        {t('footer.copyright')}
      </footer>
    </div>
  );
}

export default App;
