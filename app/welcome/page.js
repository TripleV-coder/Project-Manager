'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LandingPage from '@/components/landing/LandingPage';
import { clearAuthSession, markAuthSession } from '@/lib/client-auth';

export default function WelcomePage() {
  const router = useRouter();
  const [state, setState] = useState({
    scenario: 'no-auth',
    loading: false,
    error: null,
    checked: false,
  });

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    let timeoutId = null;
    let failsafeTimeoutId = null;

    const checkAuthState = async () => {
      try {
        timeoutId = setTimeout(() => {
          if (mounted) {
            controller.abort();
          }
        }, 5000);

        failsafeTimeoutId = setTimeout(() => {
          if (mounted && !state.checked) {
            console.warn('[Welcome] Failsafe timeout triggered - forcing no-auth state');
            clearAuthSession();
            setState((prev) => ({
              ...prev,
              scenario: 'no-auth',
              checked: true,
              error: 'Timeout de vérification. Veuillez vous connecter',
            }));
          }
        }, 8000);

        const res = await fetch('/api/init', {
          signal: controller.signal,
        });

        if (!mounted) return;

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const data = await res.json();

        if (!mounted) return;

        if (!data.hasAdmin) {
          clearAuthSession();
          setState((prev) => ({ ...prev, scenario: 'no-admin', checked: true }));
        } else if (!data.user) {
          clearAuthSession();
          setState((prev) => ({ ...prev, scenario: 'no-auth', checked: true }));
        } else if (data.user.first_login || data.user.must_change_password) {
          markAuthSession(data.user);
          setState((prev) => ({ ...prev, checked: true }));
          router.push('/first-login');
        } else {
          markAuthSession(data.user);
          setState((prev) => ({ ...prev, scenario: 'authenticated', checked: true }));
        }
      } catch (error) {
        if (!mounted) return;
        if (error.name === 'AbortError') {
          clearAuthSession();
          setState((prev) => ({
            ...prev,
            scenario: 'no-auth',
            checked: true,
          }));
          return;
        }
        console.error('[Welcome] Auth check error:', error);
        clearAuthSession();
        setState((prev) => ({
          ...prev,
          scenario: 'no-auth',
          checked: true,
        }));
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (failsafeTimeoutId) clearTimeout(failsafeTimeoutId);
      }
    };

    checkAuthState();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (failsafeTimeoutId) clearTimeout(failsafeTimeoutId);
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleNavigate = async (path) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push(path);
    } catch (err) {
      console.error('Navigation error:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Erreur lors de la navigation',
      }));
    }
  };

  const buttonConfig = {
    'no-admin': {
      label: 'Créer le premier administrateur',
      path: '/first-admin',
    },
    'no-auth': {
      label: 'Commencer dès maintenant',
      path: '/login',
    },
    authenticated: {
      label: 'Accéder à mon espace',
      path: '/dashboard',
    },
  };

  const config = buttonConfig[state.scenario];

  if (!state.checked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-sky-100 dark:bg-slate-950">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-700 dark:text-indigo-300" />
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          Vérification de l&apos;application...
        </p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-sky-100 p-6 dark:bg-slate-950">
        <p className="font-semibold text-red-700 dark:text-red-400">
          Erreur: état d&apos;authentification invalide
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-indigo-700 px-4 py-2 font-medium text-white hover:bg-indigo-800"
        >
          Recharger la page
        </button>
      </div>
    );
  }

  return (
    <LandingPage
      primaryLabel={config.label}
      onPrimary={() => handleNavigate(config.path)}
      loading={state.loading}
      error={state.error}
      showLogin={state.scenario === 'no-auth'}
      onLogin={() => handleNavigate('/login')}
    />
  );
}
