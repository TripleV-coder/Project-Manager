'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, BarChart3, Users, Zap, Target } from 'lucide-react';

export default function Welcome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState(null);
  const [buttonText, setButtonText] = useState('Commencer maintenant');

  useEffect(() => {
    async function determineRedirect() {
      try {
        const checkResponse = await fetch('/api/check');
        const checkData = await checkResponse.json();

        if (!checkData.hasAdmin) {
          setRedirectPath('/first-admin');
          setButtonText('Créer le compte administrateur');
        } else {
          const token = localStorage.getItem('pm_token');
          if (!token) {
            setRedirectPath('/login');
            setButtonText('Se connecter');
          } else {
            const meResponse = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (!meResponse.ok) {
              localStorage.removeItem('pm_token');
              setRedirectPath('/login');
              setButtonText('Se connecter');
            } else {
              const userData = await meResponse.json();
              if (userData.first_login || userData.must_change_password) {
                setRedirectPath('/first-login');
                setButtonText('Finaliser votre profil');
              } else {
                setRedirectPath('/dashboard');
                setButtonText('Aller au tableau de bord');
              }
            }
          }
        }
      } catch (error) {
        console.error('Erreur:', error);
        setRedirectPath('/login');
        setButtonText('Se connecter');
      } finally {
        setLoading(false);
      }
    }

    determineRedirect();
  }, []);

  const handleStart = () => {
    if (redirectPath) {
      router.push(redirectPath);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">PM</span>
          </div>
          <div className="text-sm text-gray-600">Gestion Agile</div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/10 rounded-full mb-6">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Pilotez Vos Projets <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Agiles</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Une plateforme intuitive pour gérer vos projets en toute sérénité, qu'ils soient Scrum, Kanban ou mixtes
          </p>

          {/* CTA Button */}
          <button
            onClick={handleStart}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                {buttonText}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Core Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 py-16">
          <div className="p-6 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 transition">
            <BarChart3 className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Suivi en Temps Réel</h3>
            <p className="text-sm text-gray-600">Visualisez l'avancement de vos projets instantanément</p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 transition">
            <Users className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Collaboration</h3>
            <p className="text-sm text-gray-600">Travaillez ensemble et coordonnez vos équipes</p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 transition">
            <Zap className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Flexibilité</h3>
            <p className="text-sm text-gray-600">Adaptez la plateforme à votre méthodologie</p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 transition">
            <Target className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Résultats</h3>
            <p className="text-sm text-gray-600">Atteignez vos objectifs plus rapidement</p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="py-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Conçu pour les Équipes Agiles</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Contrôle d'Accès Granulaire</h3>
                  <p className="text-sm text-gray-600">Gérez les permissions par rôle facilement</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Gestion du Budget</h3>
                  <p className="text-sm text-gray-600">Suivez les dépenses et alertes en temps réel</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Organisation</h3>
                  <p className="text-sm text-gray-600">Centralisez vos fichiers et documents</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Communication</h3>
                  <p className="text-sm text-gray-600">Restez connecté avec votre équipe</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Planification</h3>
                  <p className="text-sm text-gray-600">Visualisez votre roadmap et timeline</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Rapports</h3>
                  <p className="text-sm text-gray-600">Générez des rapports d'avancement</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="space-y-6">
              <div>
                <Zap className="w-12 h-12 mb-3 text-indigo-100" />
                <h3 className="text-2xl font-bold mb-2">Prêt à Utiliser</h3>
                <p className="text-indigo-100">Démarrez immédiatement sans configuration complexe. Une expérience utilisateur fluide et intuitive.</p>
              </div>
              <div className="pt-6 border-t border-indigo-400">
                <p className="text-sm text-indigo-100">
                  ✅ Interface intuitive<br />
                  ✅ Responsive et moderne<br />
                  ✅ Performance optimisée<br />
                  ✅ Support complet
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="py-16 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Scrum Masters</h3>
            <p className="text-sm text-gray-600">Gérez sprints, backlogs et rituels agiles facilement</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Chefs de Projet</h3>
            <p className="text-sm text-gray-600">Pilotez budgets, délais et ressources efficacement</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Équipes</h3>
            <p className="text-sm text-gray-600">Collaborez, partagez et progressez ensemble</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Transformez votre Gestion de Projets</h2>
          <button
            onClick={handleStart}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                {buttonText}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="py-12 border-t border-gray-200 text-center text-gray-600">
          <p>© 2025 PM - Gestion de Projets Agile</p>
        </div>
      </div>
    </div>
  );
}
