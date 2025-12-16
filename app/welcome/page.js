'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BarChart3, Users, Zap, Target, CheckCircle2, Loader2 } from 'lucide-react';
import Footer from '@/components/Footer';

export default function WelcomePage() {
  const router = useRouter();
  const [state, setState] = useState({
    scenario: 'no-auth',
    loading: false,
    error: null,
    checked: false
  });

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    let timeoutId = null;
    let failsafeTimeoutId = null;

    const checkAuthState = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('pm_token') : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Timeout pour la requête (5s)
        timeoutId = setTimeout(() => {
          if (mounted) {
            controller.abort();
          }
        }, 5000);

        // Failsafe: si après 8s on n'a toujours pas de réponse, forcer l'état
        failsafeTimeoutId = setTimeout(() => {
          if (mounted && !state.checked) {
            console.warn('[Welcome] Failsafe timeout triggered - forcing no-auth state');
            localStorage.removeItem('pm_token');
            localStorage.removeItem('pm_user');
            setState(prev => ({
              ...prev,
              scenario: 'no-auth',
              checked: true,
              error: 'Timeout de vérification - veuillez vous connecter'
            }));
          }
        }, 8000);

        const res = await fetch('/api/init', {
          headers,
          signal: controller.signal
        });

        if (!mounted) return;

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const data = await res.json();

        if (!mounted) return;

        console.log('[Welcome] Auth check result:', { hasAdmin: data.hasAdmin, user: !!data.user, token: !!token });

        if (!data.hasAdmin) {
          console.log('[Welcome] No admin found - showing first-admin setup');
          localStorage.removeItem('pm_token');
          localStorage.removeItem('pm_user');
          setState(prev => ({ ...prev, scenario: 'no-admin', checked: true }));
        } else if (!data.user) {
          console.log('[Welcome] Admin exists but user not authenticated - showing login');
          if (token) {
            console.warn('[Welcome] Token exists but API returned no user - clearing stale token');
            localStorage.removeItem('pm_token');
            localStorage.removeItem('pm_user');
          }
          setState(prev => ({ ...prev, scenario: 'no-auth', checked: true }));
        } else if (data.user.first_login || data.user.must_change_password) {
          console.log('[Welcome] First login required - redirecting to first-login');
          setState(prev => ({ ...prev, checked: true }));
          router.push('/first-login');
        } else {
          console.log('[Welcome] User authenticated - showing dashboard link');
          setState(prev => ({ ...prev, scenario: 'authenticated', checked: true }));
        }
      } catch (error) {
        if (!mounted) return;
        if (error.name === 'AbortError') {
          console.log('[Welcome] Auth check timed out');
          localStorage.removeItem('pm_token');
          localStorage.removeItem('pm_user');
          setState(prev => ({
            ...prev,
            scenario: 'no-auth',
            checked: true
          }));
          return;
        }
        console.error('[Welcome] Auth check error:', error);
        localStorage.removeItem('pm_token');
        localStorage.removeItem('pm_user');
        setState(prev => ({
          ...prev,
          scenario: 'no-auth',
          checked: true
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
      setState(prev => ({ ...prev, loading: true, error: null }));
      // Give a tiny delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      router.push(path);
    } catch (err) {
      console.error('Navigation error:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erreur lors de la navigation'
      }));
    }
  };

  const buttonConfig = {
    'no-admin': {
      label: 'Créer le premier administrateur',
      path: '/first-admin',
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    'no-auth': {
      label: 'Se connecter',
      path: '/login',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    'authenticated': {
      label: 'Accéder au dashboard',
      path: '/dashboard',
      color: 'bg-green-600 hover:bg-green-700'
    }
  };

  const config = buttonConfig[state.scenario];

  // Show loading state while checking auth
  if (!state.checked) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Vérification de l'application...</p>
          </div>
        </div>
      </div>
    );
  }

  // Safety check: if config not found, show error
  if (!config) {
    console.error('[Welcome] Invalid scenario state:', state.scenario);
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-red-600 font-semibold">Erreur: État d'authentification invalide</p>
            <p className="text-gray-600 text-sm mt-2">Scenario: {state.scenario}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">PM - Gestion de Projets</h1>
              <p className="text-gray-600">Plateforme complète pour gérer vos projets Agile (Scrum, Kanban)</p>
            </div>

            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Une plateforme intuitive pour gérer vos projets en toute sérénité, qu'ils soient Scrum, Kanban ou mixtes
            </p>

            {config && (
              <>
                <button
                  onClick={() => handleNavigate(config.path)}
                  disabled={state.loading}
                  className={`px-6 py-3 ${config.color} disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-2 min-w-full`}
                  type="button"
                >
                  {state.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Chargement...</span>
                    </>
                  ) : (
                    <>
                      <span>{config.label}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {state.error && (
                  <p className="text-sm text-red-600 mt-4">{state.error}</p>
                )}
              </>
            )}
          </div>

          <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-white rounded-xl border border-gray-200">
                <Users className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Collaboration</h3>
                <p className="text-sm text-gray-600">Travaillez ensemble et coordonnez vos équipes</p>
              </div>
              <div className="p-6 bg-white rounded-xl border border-gray-200">
                <Zap className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Flexibilité</h3>
                <p className="text-sm text-gray-600">Adaptez la plateforme à votre méthodologie</p>
              </div>
              <div className="p-6 bg-white rounded-xl border border-gray-200">
                <Target className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Résultats</h3>
                <p className="text-sm text-gray-600">Atteignez vos objectifs plus rapidement</p>
              </div>
              <div className="p-6 bg-white rounded-xl border border-gray-200">
                <CheckCircle2 className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Fiable</h3>
                <p className="text-sm text-gray-600">Conçu pour la production et la collaboration d'équipe</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
