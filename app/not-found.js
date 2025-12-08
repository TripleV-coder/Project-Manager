'use client';

import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            <FileQuestion className="w-16 h-16 text-gray-400" />
            <CardTitle className="text-2xl">Page non trouvée</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                Retour au dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Page d'accueil
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
