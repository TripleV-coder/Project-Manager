'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Erreur capturée:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-8 h-8" />
            <CardTitle>Une erreur s'est produite</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Nous sommes désolés, une erreur inattendue s'est produite. L'équipe technique a été informée.
          </p>
          {error?.message && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800 font-mono">{error.message}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={() => reset()} className="flex-1">
              Réessayer
            </Button>
            <Button onClick={() => window.location.href = '/dashboard'} variant="outline" className="flex-1">
              Retour au dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
