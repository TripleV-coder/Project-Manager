'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';

export default function MaintenanceModePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        // Vérifier si le mode maintenance est toujours actif
        const response = await fetch('/api/settings/maintenance');
        const data = await response.json();

        if (!data.data?.enabled) {
          // Mode maintenance désactivé, rediriger vers l'accueil
          router.push('/welcome');
          return;
        }

        // Vérifier si l'utilisateur est admin
        const token = localStorage.getItem('pm_token');
        if (token) {
          const meResponse = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (meResponse.ok) {
            const userData = await meResponse.json();
            if (userData.role?.permissions?.adminConfig) {
              // Admin peut accéder au dashboard
              router.push('/dashboard');
              return;
            }
          }
        }

        setChecking(false);
      } catch (error) {
        console.error('Erreur vérification maintenance:', error);
        setChecking(false);
      }
    };

    checkMaintenanceStatus();

    // Vérifier toutes les 30 secondes si la maintenance est terminée
    const interval = setInterval(checkMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center p-8 max-w-md">
        <div className="mb-6">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <Wrench className="w-12 h-12 text-orange-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Maintenance en cours
        </h1>

        <p className="text-gray-600 mb-6">
          L'application est actuellement en maintenance.
          Nous serons de retour très bientôt.
        </p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">
            Cette page se rafraîchira automatiquement lorsque la maintenance sera terminée.
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={() => router.push('/login')}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Connexion administrateur
          </button>
        </div>
      </div>
    </div>
  );
}
