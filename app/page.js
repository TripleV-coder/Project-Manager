'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        // Vérifier si premier admin existe
        const checkResponse = await fetch('/api/check');
        const checkData = await checkResponse.json();

        if (!checkData.hasAdmin) {
          // Aucun admin, rediriger vers création premier admin
          router.push('/first-admin');
          return;
        }

        // Vérifier si utilisateur est connecté
        const token = localStorage.getItem('pm_token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Vérifier le token
        const meResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!meResponse.ok) {
          localStorage.removeItem('pm_token');
          router.push('/login');
          return;
        }

        const userData = await meResponse.json();

        // Vérifier si premier login
        if (userData.first_login || userData.must_change_password) {
          router.push('/first-login');
          return;
        }

        // Tout est OK, rediriger vers dashboard
        router.push('/dashboard');

      } catch (error) {
        console.error('Erreur check auth:', error);
        router.push('/login');
      }
    }

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-lg font-medium">Chargement...</p>
      </div>
    </div>
  );
}
