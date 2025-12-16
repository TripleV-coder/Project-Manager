'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe, Bell, Shield, Palette, Mail,
  Save, RefreshCw,
  Moon, Sun, Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // Général
    appName: 'PM - Gestion de Projets',
    appDescription: 'Plateforme de gestion de projets Agile',
    langue: 'fr',
    timezone: 'Africa/Douala',
    devise: 'FCFA',
    formatDate: 'DD/MM/YYYY',
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    notifyTaskAssigned: true,
    notifyTaskCompleted: true,
    notifyCommentMention: true,
    notifySprintStart: true,
    notifyBudgetAlert: true,
    // Sécurité
    sessionTimeout: 30,
    passwordMinLength: 8,
    passwordRequireNumbers: true,
    passwordRequireSymbols: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    twoFactorEnabled: false,
    // Apparence
    theme: 'light',
    primaryColor: '#4f46e5',
    sidebarCompact: false
  });

  const loadSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ settings })
      });

      if (response.ok) {
        toast.success('Paramètres enregistrés avec succès');
      } else {
        toast.error('Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setSaving(false);
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
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Paramètres</h1>
          <p className="text-gray-600">Configuration globale de l'application</p>
        </div>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Enregistrer</>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Général</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Sécurité</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Apparence</span>
          </TabsTrigger>
        </TabsList>

        {/* Général */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Généraux</CardTitle>
              <CardDescription>Configuration de base de l'application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nom de l'application</Label>
                  <Input
                    value={settings.appName}
                    onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={settings.appDescription}
                    onChange={(e) => setSettings({ ...settings, appDescription: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Langue</Label>
                  <Select 
                    value={settings.langue}
                    onValueChange={(v) => setSettings({ ...settings, langue: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fuseau horaire</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(v) => setSettings({ ...settings, timezone: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Douala">Afrique/Douala (UTC+1)</SelectItem>
                      <SelectItem value="Africa/Lagos">Afrique/Lagos (UTC+1)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (UTC+1/+2)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <Select
                    value={settings.devise}
                    onValueChange={(v) => setSettings({ ...settings, devise: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FCFA">FCFA (Franc CFA)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="USD">USD (Dollar US)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format de date</Label>
                  <Select
                    value={settings.formatDate}
                    onValueChange={(v) => setSettings({ ...settings, formatDate: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de Notifications</CardTitle>
              <CardDescription>Configurez les alertes et notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Notifications par email</p>
                      <p className="text-sm text-gray-500">Recevoir les notifications par email</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(v) => setSettings({ ...settings, emailNotifications: v })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Notifications push</p>
                      <p className="text-sm text-gray-500">Notifications dans l'application</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(v) => setSettings({ ...settings, pushNotifications: v })}
                  />
                </div>
              </div>

              <Separator />
              <p className="text-sm font-medium text-gray-700">Événements déclencheurs</p>

              <div className="space-y-3">
                {[
                  { key: 'notifyTaskAssigned', label: 'Tâche assignée', desc: 'Quand une tâche vous est assignée' },
                  { key: 'notifyTaskCompleted', label: 'Tâche terminée', desc: 'Quand une tâche de votre projet est terminée' },
                  { key: 'notifyCommentMention', label: 'Mention dans un commentaire', desc: 'Quand vous êtes @mentionné' },
                  { key: 'notifySprintStart', label: 'Début de sprint', desc: 'Quand un sprint démarre' },
                  { key: 'notifyBudgetAlert', label: 'Alerte budget', desc: 'Quand le budget dépasse 80%' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <Switch
                      checked={settings[item.key]}
                      onCheckedChange={(v) => setSettings({ ...settings, [item.key]: v })}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sécurité */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de Sécurité</CardTitle>
              <CardDescription>Configuration de la sécurité et des accès</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Expiration de session (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-xs text-gray-500">Durée d'inactivité avant déconnexion automatique</p>
                </div>
                <div className="space-y-2">
                  <Label>Tentatives de connexion max</Label>
                  <Input
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                  />
                  <p className="text-xs text-gray-500">Nombre de tentatives avant blocage</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Durée de blocage (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.lockoutDuration}
                    onChange={(e) => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) || 15 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longueur min. mot de passe</Label>
                  <Input
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) || 8 })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Exiger des chiffres</p>
                    <p className="text-sm text-gray-500">Le mot de passe doit contenir des chiffres</p>
                  </div>
                  <Switch
                    checked={settings.passwordRequireNumbers}
                    onCheckedChange={(v) => setSettings({ ...settings, passwordRequireNumbers: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Exiger des caractères spéciaux</p>
                    <p className="text-sm text-gray-500">Le mot de passe doit contenir des symboles</p>
                  </div>
                  <Switch
                    checked={settings.passwordRequireSymbols}
                    onCheckedChange={(v) => setSettings({ ...settings, passwordRequireSymbols: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Authentification à deux facteurs (2FA)</p>
                      <p className="text-sm text-gray-500">Sécurité renforcée pour tous les utilisateurs</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.twoFactorEnabled}
                    onCheckedChange={(v) => setSettings({ ...settings, twoFactorEnabled: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Apparence */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>Personnalisez l'interface de l'application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Thème</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'light', icon: Sun, label: 'Clair' },
                    { value: 'dark', icon: Moon, label: 'Sombre' },
                    { value: 'system', icon: Monitor, label: 'Système' }
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => setSettings({ ...settings, theme: theme.value })}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        settings.theme === theme.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <theme.icon className={`w-6 h-6 ${
                        settings.theme === theme.value ? 'text-indigo-600' : 'text-gray-400'
                      }`} />
                      <span className="text-sm font-medium">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Couleur principale</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-32"
                  />
                  <div className="flex gap-2">
                    {['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setSettings({ ...settings, primaryColor: color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          settings.primaryColor === color ? 'border-gray-900' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Sidebar compacte</p>
                  <p className="text-sm text-gray-500">Réduire la taille de la barre latérale</p>
                </div>
                <Switch
                  checked={settings.sidebarCompact}
                  onCheckedChange={(v) => setSettings({ ...settings, sidebarCompact: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
