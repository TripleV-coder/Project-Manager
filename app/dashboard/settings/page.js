'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, Bell, Lock, Database, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUser(data);
    };

    loadUser();
  }, [router]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres</h1>
        <p className="text-gray-600">Gérez vos préférences et configurations</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Sécurité
          </TabsTrigger>
          {user?.role?.permissions?.admin_config && (
            <TabsTrigger value="admin">
              <Shield className="w-4 h-4 mr-2" />
              Administration
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informations du profil</CardTitle>
              <CardDescription>Vos informations personnelles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nom complet</p>
                  <p className="text-lg">{user?.nom_complet}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-lg">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Rôle</p>
                  <p className="text-lg">{user?.role?.nom}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Poste</p>
                  <p className="text-lg">{user?.poste_titre || 'Non défini'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Préférences de notifications</CardTitle>
              <CardDescription>Choisissez comment vous souhaitez être notifié</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Fonctionnalité en cours de développement</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>Gérez votre mot de passe et sécurité</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Changement de mot de passe disponible prochainement</p>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role?.permissions?.admin_config && (
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Configuration système</CardTitle>
                <CardDescription>Paramètres avancés de l'application</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Database className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-medium">Base de données</h3>
                    </div>
                    <p className="text-sm text-gray-600">MongoDB connectée et opérationnelle</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      <h3 className="font-medium">Sécurité</h3>
                    </div>
                    <p className="text-sm text-gray-600">JWT activé, Audit trail en fonctionnement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
