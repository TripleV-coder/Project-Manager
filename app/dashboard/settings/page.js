'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, Lock, Bell, Globe, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      mentions: true,
      taches: true,
      projets: true
    },
    apparence: {
      theme: 'light',
      langue: 'fr'
    },
    securite: {
      deux_facteurs: false,
      sessions_actives: 1
    }
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
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
      setUser(data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    toast.success('Profil mis à jour');
  };

  const handleUpdatePassword = async () => {
    toast.success('Mot de passe modifié');
  };

  const handleSaveSettings = async () => {
    toast.success('Paramètres enregistrés');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres</h1>
        <p className="text-gray-600">Gérez vos préférences personnelles</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Globe className="w-4 h-4 mr-2" />
            Préférences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>Modifiez vos informations de profil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={user?.nom_complet || ''} placeholder="Votre nom" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} type="email" disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Poste</Label>
                <Input placeholder="Chef de projet" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input placeholder="+33 6 12 34 56 78" />
              </div>
              <Button onClick={handleUpdateProfile} className="bg-indigo-600 hover:bg-indigo-700">
                Enregistrer les modifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>Gérez la sécurité de votre compte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Changer le mot de passe</h3>
                <div className="space-y-2">
                  <Label>Mot de passe actuel</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Nouveau mot de passe</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmer le mot de passe</Label>
                  <Input type="password" />
                </div>
                <Button onClick={handleUpdatePassword} className="bg-indigo-600 hover:bg-indigo-700">
                  Changer le mot de passe
                </Button>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Sessions actives</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Vous êtes actuellement connecté sur {settings.securite.sessions_actives} appareil(s)
                </p>
                <Button variant="outline">Déconnecter les autres sessions</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Préférences de notifications</CardTitle>
              <CardDescription>Choisissez quand et comment recevoir les notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifications par email</p>
                  <p className="text-sm text-gray-500">Recevez des notifications par email</p>
                </div>
                <Switch
                  checked={settings.notifications.email}
                  onCheckedChange={(val) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email: val }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifications push</p>
                  <p className="text-sm text-gray-500">Notifications dans le navigateur</p>
                </div>
                <Switch
                  checked={settings.notifications.push}
                  onCheckedChange={(val) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, push: val }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Mentions</p>
                  <p className="text-sm text-gray-500">Quand quelqu'un vous mentionne</p>
                </div>
                <Switch
                  checked={settings.notifications.mentions}
                  onCheckedChange={(val) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, mentions: val }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tâches assignées</p>
                  <p className="text-sm text-gray-500">Quand une tâche vous est assignée</p>
                </div>
                <Switch
                  checked={settings.notifications.taches}
                  onCheckedChange={(val) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, taches: val }
                  })}
                />
              </div>

              <Button onClick={handleSaveSettings} className="bg-indigo-600 hover:bg-indigo-700">
                Enregistrer les préférences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Préférences d'affichage</CardTitle>
              <CardDescription>Personnalisez l'apparence de l'application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Thème</Label>
                <Select value={settings.apparence.theme} onValueChange={(val) => setSettings({
                  ...settings,
                  apparence: { ...settings.apparence, theme: val }
                })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="auto">Automatique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Langue</Label>
                <Select value={settings.apparence.langue} onValueChange={(val) => setSettings({
                  ...settings,
                  apparence: { ...settings.apparence, langue: val }
                })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveSettings} className="bg-indigo-600 hover:bg-indigo-700">
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
