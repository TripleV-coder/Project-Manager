'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BarChart3, Users, Zap, Target, CheckCircle2, Loader2 } from 'lucide-react';

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

    const checkAuthState = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('pm_token') : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        timeoutId = setTimeout(() => {
          if (mounted) {
            controller.abort();
          }
        }, 5000);

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

        if (!data.hasAdmin) {
          setState(prev => ({ ...prev, scenario: 'no-admin', checked: true }));
        } else if (!data.user) {
          setState(prev => ({ ...prev, scenario: 'no-auth', checked: true }));
        } else if (data.user.first_login || data.user.must_change_password) {
          router.push('/first-login');
        } else {
          setState(prev => ({ ...prev, scenario: 'authenticated', checked: true }));
        }
      } catch (error) {
        if (!mounted) return;
        if (error.name === 'AbortError') {
          return;
        }
        console.error('Auth check error:', error);
        setState(prev => ({
          ...prev,
          scenario: 'no-auth',
          checked: true
        }));
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    checkAuthState();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      controller.abort();
    };
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
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

        <div className="py-12 text-center text-gray-600">
          <p>© 2025 PM - Gestion de Projets Agile</p>
        </div>
      </div>
    </div>
  );
}
