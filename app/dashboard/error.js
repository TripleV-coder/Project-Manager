'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardError({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    console.error('Erreur dashboard capturée:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-8 h-8" />
            <CardTitle>Le dashboard a rencontré une erreur</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Vous pouvez relancer cet écran sans recharger toute l’application.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => reset()} className="flex-1">
              Réessayer
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline" className="flex-1">
              Retour au dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
