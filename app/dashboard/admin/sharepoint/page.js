'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cloud, Check, X, RefreshCw, FileText, Settings, AlertCircle, CheckCircle } from 'lucide-react';
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

  useEffect(() => {
    checkAuth();
    loadConfig();
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

  const loadConfig = async () => {
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
  };

  const handleTestConnection = async () => {
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
        toast.error(data.error || 'Échec de la connexion');
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
    }
  };

  const handleManualSync = async () => {
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
      <div className=\"flex items-center justify-center h-screen\">
        <div className=\"w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin\" />
      </div>
    );
  }

  return (
    <div className=\"p-6 max-w-5xl mx-auto\">
      <div className=\"mb-8\">
        <h1 className=\"text-3xl font-bold text-gray-900 mb-2\">Configuration SharePoint</h1>
        <p className=\"text-gray-600\">Intégrez SharePoint pour la gestion des fichiers</p>
      </div>

      <div className=\"space-y-6\">
        {/* Statut */}
        <Card>
          <CardHeader>
            <div className=\"flex items-center justify-between\">
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
            <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
              <div className=\"p-4 bg-gray-50 rounded-lg\">
                <div className=\"flex items-center gap-2 mb-1\">
                  {status.connected ? (
                    <CheckCircle className=\"w-5 h-5 text-green-600\" />
                  ) : (
                    <AlertCircle className=\"w-5 h-5 text-orange-600\" />
                  )}
                  <span className=\"font-medium\">Connexion</span>
                </div>
                <p className=\"text-2xl font-bold text-gray-900\">
                  {status.connected ? 'Connecté' : 'Non connecté'}
                </p>
              </div>
              
              <div className=\"p-4 bg-gray-50 rounded-lg\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <FileText className=\"w-5 h-5 text-gray-600\" />
                  <span className=\"font-medium\">Fichiers synchronisés</span>
                </div>
                <p className=\"text-2xl font-bold text-gray-900\">{status.files_synced || 0}</p>
              </div>
              
              <div className=\"p-4 bg-gray-50 rounded-lg\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <Clock className=\"w-5 h-5 text-gray-600\" />
                  <span className=\"font-medium\">Dernière sync</span>
                </div>
                <p className=\"text-sm text-gray-600\">
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
            <CardDescription>Paramètres de connexion Microsoft SharePoint</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue=\"credentials\">
              <TabsList className=\"grid w-full grid-cols-3\">
                <TabsTrigger value=\"credentials\">Identifiants</TabsTrigger>
                <TabsTrigger value=\"sync\">Synchronisation</TabsTrigger>
                <TabsTrigger value=\"advanced\">Avancé</TabsTrigger>
              </TabsList>

              <TabsContent value=\"credentials\" className=\"space-y-4 mt-4\">
                <div className=\"space-y-2\">
                  <Label>Tenant ID (Organisation Microsoft)</Label>
                  <Input
                    value={config.tenant_id}
                    onChange={(e) => setConfig({ ...config, tenant_id: e.target.value })}
                    placeholder=\"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\"
                  />
                  <p className=\"text-xs text-gray-500\">
                    Trouvez votre Tenant ID dans Azure Active Directory
                  </p>
                </div>

                <div className=\"space-y-2\">
                  <Label>Site ID SharePoint</Label>
                  <Input
                    value={config.site_id}
                    onChange={(e) => setConfig({ ...config, site_id: e.target.value })}
                    placeholder=\"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\"
                  />
                </div>

                <div className=\"space-y-2\">
                  <Label>Client ID (Application ID)</Label>
                  <Input
                    value={config.client_id}
                    onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
                    placeholder=\"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\"
                  />
                </div>

                <div className=\"space-y-2\">
                  <Label>Client Secret</Label>
                  <Input
                    type=\"password\"
                    value={config.client_secret}
                    onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
                    placeholder=\"******************\"
                  />
                  <p className=\"text-xs text-gray-500\">
                    Le secret sera chiffré et stocké de manière sécurisée
                  </p>
                </div>

                <Button onClick={handleTestConnection} disabled={testing} variant=\"outline\" className=\"w-full\">
                  {testing ? (
                    <>
                      <RefreshCw className=\"w-4 h-4 mr-2 animate-spin\" />
                      Test en cours...
                    </>
                  ) : (
                    <>
                      <Cloud className=\"w-4 h-4 mr-2\" />
                      Tester la connexion
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value=\"sync\" className=\"space-y-4 mt-4\">
                <div className=\"flex items-center justify-between p-4 bg-gray-50 rounded-lg\">
                  <div>
                    <p className=\"font-medium\">Synchronisation automatique</p>
                    <p className=\"text-sm text-gray-600\">
                      Synchroniser automatiquement les fichiers
                    </p>
                  </div>
                  <Switch
                    checked={config.auto_sync}
                    onCheckedChange={(val) => setConfig({ ...config, auto_sync: val })}
                  />
                </div>

                <div className=\"space-y-2\">
                  <Label>Intervalle de synchronisation (minutes)</Label>
                  <Input
                    type=\"number\"
                    value={config.sync_interval}
                    onChange={(e) => setConfig({ ...config, sync_interval: parseInt(e.target.value) })}
                    min=\"5\"
                    max=\"1440\"
                  />
                </div>

                <Button onClick={handleManualSync} variant=\"outline\" className=\"w-full\">
                  <RefreshCw className=\"w-4 h-4 mr-2\" />
                  Synchroniser maintenant
                </Button>
              </TabsContent>

              <TabsContent value=\"advanced\" className=\"space-y-4 mt-4\">
                <div className=\"p-4 bg-yellow-50 border border-yellow-200 rounded-lg\">
                  <p className=\"text-sm text-yellow-800\">
                    <AlertCircle className=\"w-4 h-4 inline mr-1\" />
                    Les paramètres avancés sont gérés automatiquement
                  </p>
                </div>

                <div className=\"space-y-2\">
                  <Label>Permissions Microsoft Graph</Label>
                  <div className=\"text-sm text-gray-600 space-y-1\">
                    <p>• Files.ReadWrite.All</p>
                    <p>• Sites.ReadWrite.All</p>
                    <p>• User.Read.All</p>
                  </div>
                </div>

                <div className=\"space-y-2\">
                  <Label>Chiffrement</Label>
                  <p className=\"text-sm text-gray-600\">
                    AES-256 pour les tokens et secrets
                  </p>
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
          <CardContent className=\"space-y-4\">
            <div className=\"flex items-center justify-between p-4 bg-gray-50 rounded-lg\">
              <div>
                <p className=\"font-medium\">Activer l'intégration SharePoint</p>
                <p className=\"text-sm text-gray-600\">
                  Active la synchronisation pour tous les projets
                </p>
              </div>
              <Switch
                checked={sharePointEnabled}
                onCheckedChange={setSharePointEnabled}
              />
            </div>

            <div className=\"flex gap-2\">
              <Button onClick={handleSaveConfig} className=\"flex-1 bg-indigo-600 hover:bg-indigo-700\">
                <Check className=\"w-4 h-4 mr-2\" />
                Enregistrer la configuration
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Guide de configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className=\"space-y-3 text-sm text-gray-600\">
              <div className=\"flex items-start gap-3\">
                <div className=\"w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0\">1</div>
                <div>
                  <p className=\"font-medium text-gray-900\">Créer une application Azure AD</p>
                  <p>Rendez-vous sur portal.azure.com → Azure Active Directory → App registrations</p>
                </div>
              </div>
              <div className=\"flex items-start gap-3\">
                <div className=\"w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0\">2</div>
                <div>
                  <p className=\"font-medium text-gray-900\">Configurer les permissions</p>
                  <p>Ajoutez les permissions Microsoft Graph nécessaires</p>
                </div>
              </div>
              <div className=\"flex items-start gap-3\">
                <div className=\"w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0\">3</div>
                <div>
                  <p className=\"font-medium text-gray-900\">Copier les identifiants</p>
                  <p>Récupérez le Tenant ID, Client ID et créez un Client Secret</p>
                </div>
              </div>
              <div className=\"flex items-start gap-3\">
                <div className=\"w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0\">4</div>
                <div>
                  <p className=\"font-medium text-gray-900\">Tester et activer</p>
                  <p>Entrez les identifiants ci-dessus, testez la connexion et activez</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
