'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Cloud, Check, RefreshCw, FileText, Settings, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function SharePointConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharePointEnabled, setSharePointEnabled] = useState(false);
  const [config, setConfig] = useState({
    tenant_id: '',
    site_id: '',
    client_id: '',
    client_secret: '',
    auto_sync: true,
    sync_interval: 15
  });
  const [status, setStatus] = useState({
    connected: false,
    last_sync: null,
    files_synced: 0,
    errors: 0
  });

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (!data.role?.permissions?.adminConfig) {
        router.push('/dashboard');
        return;
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, [router]);

  const loadConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/sharepoint/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
          setSharePointEnabled(data.enabled || false);
        }
        if (data.status) {
          setStatus(data.status);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    loadConfig();
  }, [checkAuth, loadConfig]);

  const handleTestConnection = async () => {
    if (!config.tenant_id || !config.client_id || !config.client_secret) {
      toast.error('Veuillez remplir tous les identifiants');
      return;
    }

    setTesting(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/sharepoint/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Connexion SharePoint réussie !');
        setStatus({ ...status, connected: true });
      } else {
        toast.error(data.error || 'Échec de la connexion - Vérifiez vos identifiants');
        setStatus({ ...status, connected: false });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du test de connexion');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/sharepoint/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: sharePointEnabled,
          config: config
        })
      });

      if (response.ok) {
        toast.success('Configuration enregistrée avec succès');
        loadConfig();
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

  const handleManualSync = async () => {
    if (!status.connected) {
      toast.error('Veuillez d\'abord établir une connexion');
      return;
    }

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/sharepoint/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Synchronisation lancée');
        setTimeout(loadConfig, 2000);
      } else {
        toast.error('Échec de la synchronisation');
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuration SharePoint</h1>
        <p className="text-gray-600">Intégrez SharePoint pour la gestion centralisée des fichiers de vos projets</p>
      </div>

      <div className="space-y-6">
        {/* Statut */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Statut de l'intégration</CardTitle>
                <CardDescription>État actuel de la connexion SharePoint</CardDescription>
              </div>
              <Badge className={sharePointEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {sharePointEnabled ? 'Activé' : 'Désactivé'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  {status.connected ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  )}
                  <span className="font-medium">Connexion</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {status.connected ? 'Connecté' : 'Non connecté'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Fichiers synchronisés</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{status.files_synced || 0}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Dernière sync</span>
                </div>
                <p className="text-sm text-gray-600">
                  {status.last_sync ? new Date(status.last_sync).toLocaleString('fr-FR') : 'Jamais'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Paramètres de connexion Microsoft SharePoint via Azure AD</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="credentials">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="credentials">Identifiants</TabsTrigger>
                <TabsTrigger value="sync">Synchronisation</TabsTrigger>
                <TabsTrigger value="advanced">Avancé</TabsTrigger>
              </TabsList>

              <TabsContent value="credentials" className="space-y-4 mt-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Pour configurer l'intégration SharePoint, vous devez créer une application dans Azure Active Directory.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tenant ID (Organisation Microsoft)</Label>
                  <Input
                    value={config.tenant_id}
                    onChange={(e) => setConfig({ ...config, tenant_id: e.target.value })}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500">
                    Trouvez votre Tenant ID dans Azure Portal &rarr; Azure Active Directory &rarr; Propriétés
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Site ID SharePoint</Label>
                  <Input
                    value={config.site_id}
                    onChange={(e) => setConfig({ ...config, site_id: e.target.value })}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500">
                    L&apos;ID du site SharePoint où seront stockés les fichiers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Client ID (Application ID)</Label>
                  <Input
                    value={config.client_id}
                    onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500">
                    L&apos;ID de l&apos;application enregistrée dans Azure AD
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <Input
                    type="password"
                    value={config.client_secret}
                    onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
                    placeholder="******************"
                  />
                  <p className="text-xs text-gray-500">
                    Le secret sera chiffré et stocké de manière sécurisée
                  </p>
                </div>

                <Button 
                  onClick={handleTestConnection} 
                  disabled={testing || !config.tenant_id || !config.client_id || !config.client_secret} 
                  variant="outline" 
                  className="w-full"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Test en cours...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 mr-2" />
                      Tester la connexion
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="sync" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Synchronisation automatique</p>
                    <p className="text-sm text-gray-600">
                      Synchroniser automatiquement les fichiers avec SharePoint
                    </p>
                  </div>
                  <Switch
                    checked={config.auto_sync}
                    onCheckedChange={(val) => setConfig({ ...config, auto_sync: val })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Intervalle de synchronisation (minutes)</Label>
                  <Input
                    type="number"
                    value={config.sync_interval}
                    onChange={(e) => setConfig({ ...config, sync_interval: parseInt(e.target.value) || 15 })}
                    min="5"
                    max="1440"
                  />
                  <p className="text-xs text-gray-500">
                    Minimum 5 minutes, maximum 24 heures (1440 minutes)
                  </p>
                </div>

                <Button 
                  onClick={handleManualSync} 
                  variant="outline" 
                  className="w-full"
                  disabled={!status.connected}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Synchroniser maintenant
                </Button>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Ces paramètres sont gérés automatiquement par l'intégration
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Permissions Microsoft Graph requises</Label>
                  <div className="text-sm text-gray-600 space-y-1 p-3 bg-gray-50 rounded-lg">
                    <p className="font-mono">• Files.ReadWrite.All</p>
                    <p className="font-mono">• Sites.ReadWrite.All</p>
                    <p className="font-mono">• User.Read.All</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sécurité</Label>
                  <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                    <p>• Chiffrement AES-256 pour les tokens et secrets</p>
                    <p>• Connexion OAuth 2.0</p>
                    <p>• Tokens rafraîchis automatiquement</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Activer l'intégration SharePoint</p>
                <p className="text-sm text-gray-600">
                  Active la synchronisation des fichiers pour tous les projets
                </p>
              </div>
              <Switch
                checked={sharePointEnabled}
                onCheckedChange={setSharePointEnabled}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSaveConfig} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Enregistrer la configuration
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Guide de configuration</CardTitle>
            <CardDescription>Étapes pour configurer l'intégration SharePoint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-gray-900">Créer une application Azure AD</p>
                  <p>Rendez-vous sur <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">portal.azure.com</a> &rarr; Azure Active Directory &rarr; App registrations &rarr; New registration</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-gray-900">Configurer les permissions API</p>
                  <p>Dans votre application &rarr; API permissions &rarr; Add permission &rarr; Microsoft Graph &rarr; Application permissions &rarr; Ajoutez Files.ReadWrite.All et Sites.ReadWrite.All</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-gray-900">Créer un Client Secret</p>
                  <p>Certificates &amp; secrets &rarr; New client secret &rarr; Copiez la valeur générée (visible une seule fois)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                <div>
                  <p className="font-medium text-gray-900">Obtenir le consentement admin</p>
                  <p>API permissions &rarr; Grant admin consent for [votre organisation]</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">5</div>
                <div>
                  <p className="font-medium text-gray-900">Copier les identifiants</p>
                  <p>Récupérez le Tenant ID (dans Overview), Application (client) ID, et le Client Secret créé</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">6</div>
                <div>
                  <p className="font-medium text-gray-900">Tester et activer</p>
                  <p>Entrez les identifiants ci-dessus, testez la connexion et activez l'intégration</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
