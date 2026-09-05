'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthSession, markAuthSession } from '@/lib/client-auth';

export default function Home() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    async function checkAuth() {
      try {
        const response = await fetch('/api/init');

        if (!response.ok) {
          console.error('Erreur init:', response.status);
          router.push('/login');
          return;
        }

        const data = await response.json();

        if (!data.hasAdmin) {
          router.push('/first-admin');
          return;
        }

        if (!data.user) {
          clearAuthSession();
          router.push('/login');
          return;
        }

        markAuthSession(data.user);

        if (data.user.first_login || data.user.must_change_password) {
          router.push('/first-login');
          return;
        }

        router.push('/dashboard');
      } catch (error) {
        console.error('Erreur check auth:', error);
        router.push('/login');
      }
    }

    checkAuth();
  }, [router, isHydrated]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-lg font-medium">Chargement...</p>
      </div>
    </div>
  );
}
