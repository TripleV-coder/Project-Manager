'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, FileText, Settings, Database, Users, Cloud, Layers,
  AlertTriangle, CheckCircle2, Activity, Server, HardDrive,
  Clock, Lock, Unlock, RefreshCw, Power, Eye, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    users: 0,
    projects: 0,
    tasks: 0,
    roles: 0
  });
  const [systemStatus, setSystemStatus] = useState({
    database: true,
    api: true,
    auth: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Charger les stats
      const [usersRes, projectsRes, tasksRes, rolesRes, maintenanceRes] = await Promise.all([
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/settings/maintenance', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const usersData = await usersRes.json();
      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();
      const rolesData = await rolesRes.json();
      
      if (maintenanceRes.ok) {
        const maintenanceData = await maintenanceRes.json();
        setMaintenanceMode(maintenanceData.enabled || false);
        setMaintenanceMessage(maintenanceData.message || '');
      }

      setStats({
        users: usersData.users?.length || 0,
        projects: projectsData.projects?.length || 0,
        tasks: tasksData.tasks?.length || 0,
        roles: rolesData.roles?.length || 0
      });

      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const toggleMaintenance = async () => {
    if (!maintenanceMode) {
      setMaintenanceDialogOpen(true);
    } else {
      await updateMaintenance(false, '');
    }
  };

  const updateMaintenance = async (enabled, message) => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/settings/maintenance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled, message })
      });

      if (response.ok) {
        setMaintenanceMode(enabled);
        setMaintenanceMessage(message);
        toast.success(enabled ? 'Mode maintenance activé' : 'Mode maintenance désactivé');
        setMaintenanceDialogOpen(false);
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const adminSections = [
    {
      title: 'Rôles & Permissions',
      description: 'Configurez les 8 rôles et 22 permissions atomiques',
      icon: Shield,
      href: '/dashboard/admin/roles',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      count: stats.roles
    },
    {
      title: 'Utilisateurs',
      description: 'Gérez les comptes et les accès',
      icon: Users,
      href: '/dashboard/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      count: stats.users
    },
    {
      title: 'Templates Projets',
      description: 'Créez des modèles avec champs personnalisés',
      icon: FileText,
      href: '/dashboard/admin/templates',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Types de Livrables',
      description: 'Définissez les workflows de validation',
      icon: Layers,
      href: '/dashboard/admin/deliverable-types',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Configuration SharePoint',
      description: 'Intégration Microsoft 365',
      icon: Cloud,
      href: '/dashboard/admin/sharepoint',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100'
    },
    {
      title: 'Paramètres Système',
      description: 'Configuration globale de l\'application',
      icon: Settings,
      href: '/dashboard/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Administration</h1>
          <p className="text-gray-600">Configurez et gérez votre application PM</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={maintenanceMode ? 'destructive' : 'secondary'} className="py-2 px-4">
            {maintenanceMode ? (
              <><AlertTriangle className="w-4 h-4 mr-2" /> Mode Maintenance</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Système Opérationnel</>
            )}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Utilisateurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.users}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Projets</p>
                <p className="text-2xl font-bold text-gray-900">{stats.projects}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tâches</p>
                <p className="text-2xl font-bold text-gray-900">{stats.tasks}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rôles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.roles}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mode Maintenance */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${maintenanceMode ? 'bg-red-100' : 'bg-green-100'}`}>
                {maintenanceMode ? (
                  <Lock className="w-6 h-6 text-red-600" />
                ) : (
                  <Unlock className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div>
                <CardTitle>Mode Maintenance</CardTitle>
                <CardDescription>
                  {maintenanceMode 
                    ? 'L\'application est en maintenance - les utilisateurs ne peuvent pas accéder'
                    : 'L\'application est accessible à tous les utilisateurs'
                  }
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={toggleMaintenance}
            />
          </div>
        </CardHeader>
        {maintenanceMode && maintenanceMessage && (
          <CardContent>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Message affiché :</strong> {maintenanceMessage}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {adminSections.map((section, idx) => (
          <Link key={idx} href={section.href}>
            <Card className="h-full cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${section.bgColor}`}>
                    <section.icon className={`w-6 h-6 ${section.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{section.title}</h3>
                      {section.count !== undefined && (
                        <Badge variant="secondary">{section.count}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            État du Système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Base de données</p>
                  <p className="text-sm text-green-600">MongoDB Connecté</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">API Backend</p>
                  <p className="text-sm text-green-600">Opérationnel</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Authentification</p>
                  <p className="text-sm text-green-600">JWT Actif</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Audit Trail</p>
                  <p className="text-sm text-blue-600">Enregistrement actif</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Dialog */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Activer le Mode Maintenance
            </DialogTitle>
            <DialogDescription>
              Les utilisateurs verront un message de maintenance et ne pourront pas accéder à l'application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Message de maintenance</Label>
              <Textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="Ex: Maintenance en cours. Retour prévu à 18h00."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => updateMaintenance(true, maintenanceMessage)}
            >
              <Power className="w-4 h-4 mr-2" />
              Activer la maintenance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
