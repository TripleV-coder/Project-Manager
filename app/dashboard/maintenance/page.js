'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Play, Pause, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function MaintenancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    'L\'application est actuellement en maintenance. Nous serons de retour bientôt.'
  );

  useEffect(() => {
    checkAuth();
    loadMaintenanceStatus();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (!data.role?.permissions?.adminConfig) {
        router.push('/dashboard');
        return;
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadMaintenanceStatus = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/admin/maintenance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.enabled !== undefined) {
        setMaintenanceMode(data.enabled);
      }
      if (data.message) {
        setMaintenanceMessage(data.message);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: !maintenanceMode,
          message: maintenanceMessage
        })
      });

      if (response.ok) {
        setMaintenanceMode(!maintenanceMode);
        toast.success(
          !maintenanceMode ? 
            'Mode maintenance activé' : 
            'Mode maintenance désactivé'
        );
      } else {
        toast.error('Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mode Maintenance</h1>
        <p className="text-gray-600">Activer le mode maintenance pour bloquer l'accès à l'application</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Statut actuel</CardTitle>
                <CardDescription>
                  {maintenanceMode ? 
                    'L\'application est en mode maintenance' : 
                    'L\'application est accessible aux utilisateurs'
                  }
                </CardDescription>
              </div>
              <div className={`px-4 py-2 rounded-full font-medium ${
                maintenanceMode ? 
                  'bg-orange-100 text-orange-800' : 
                  'bg-green-100 text-green-800'
              }`}>
                {maintenanceMode ? 'Maintenance' : 'Opérationnel'}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">Activer le mode maintenance</p>
                  <p className="text-sm text-gray-500">
                    Seuls les administrateurs pourront accéder à l'application
                  </p>
                </div>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={handleToggleMaintenance}
              />
            </div>

            {maintenanceMode && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">Mode maintenance actif</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Les utilisateurs non-administrateurs verront le message de maintenance ci-dessous
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message de maintenance</CardTitle>
            <CardDescription>
              Message affiché aux utilisateurs pendant la maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Message personnalisé</Label>
              <Textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                rows={4}
                placeholder="Entrez le message à afficher..."
              />
            </div>
            <Button 
              onClick={handleToggleMaintenance}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Enregistrer le message
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aperçu</CardTitle>
            <CardDescription>Ce que les utilisateurs verront pendant la maintenance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <Wrench className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Maintenance en cours</h2>
                <p className="text-gray-600 mb-4">{maintenanceMessage}</p>
                <p className="text-sm text-gray-500">Merci de votre patience</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
