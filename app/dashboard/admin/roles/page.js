'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Plus, Edit, Trash2, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PERMISSIONS = {
  'Projets': [
    { key: 'voir_tous_projets', label: 'Voir tous les projets' },
    { key: 'voir_ses_projets', label: 'Voir ses projets uniquement' },
    { key: 'créer_projet', label: 'Créer un projet' },
    { key: 'supprimer_projet', label: 'Supprimer un projet' },
    { key: 'modifier_charte_projet', label: 'Modifier la charte projet' },
    { key: 'gérer_membres_projet', label: 'Gérer les membres' },
    { key: 'changer_rôle_membre', label: 'Changer rôle des membres' },
  ],
  'Tâches': [
    { key: 'gérer_tâches', label: 'Créer/modifier/supprimer tâches' },
    { key: 'déplacer_tâches', label: 'Déplacer tâches (Kanban)' },
    { key: 'prioriser_backlog', label: 'Prioriser le backlog' },
  ],
  'Sprints & Planning': [
    { key: 'gérer_sprints', label: 'Créer et gérer les sprints' },
  ],
  'Budget': [
    { key: 'modifier_budget', label: 'Modifier le budget' },
    { key: 'voir_budget', label: 'Voir le budget' },
  ],
  'Temps': [
    { key: 'voir_temps_passés', label: 'Voir temps passés équipe' },
    { key: 'saisir_temps', label: 'Saisir son temps' },
  ],
  'Livrables': [
    { key: 'valider_livrable', label: 'Valider/refuser livrables' },
  ],
  'Fichiers & Communication': [
    { key: 'gérer_fichiers', label: 'Gérer les fichiers' },
    { key: 'commenter', label: 'Commenter et @mentionner' },
    { key: 'recevoir_notifications', label: 'Recevoir notifications' },
  ],
  'Administration': [
    { key: 'générer_rapports', label: 'Générer des rapports' },
    { key: 'voir_audit', label: 'Voir audit trail' },
    { key: 'admin_config', label: 'Configuration système (Admin)' },
  ],
};

export default function RolesManagement() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [newRole, setNewRole] = useState({
    nom: '',
    description: '',
    permissions: {},
    visible_menus: {
      portfolio: true,
      projects: true,
      kanban: true,
      backlog: false,
      sprints: false,
      roadmap: false,
      tasks: true,
      files: true,
      comments: true,
      timesheets: true,
      budget: false,
      reports: false,
      notifications: true,
      admin: false
    }
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setRoles(data.roles || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const handlePermissionChange = (key, value) => {
    setNewRole({
      ...newRole,
      permissions: {
        ...newRole.permissions,
        [key]: value
      }
    });
  };

  const handleMenuChange = (key, value) => {
    setNewRole({
      ...newRole,
      visible_menus: {
        ...newRole.visible_menus,
        [key]: value
      }
    });
  };

  const handleSaveRole = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const url = editingRole ? `/api/roles/${editingRole._id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newRole)
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingRole(null);
        setNewRole({
          nom: '',
          description: '',
          permissions: {},
          visible_menus: {
            portfolio: true,
            projects: true,
            kanban: true,
            backlog: false,
            sprints: false,
            roadmap: false,
            tasks: true,
            files: true,
            comments: true,
            timesheets: true,
            budget: false,
            reports: false,
            notifications: true,
            admin: false
          }
        });
        loadRoles();
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDuplicateRole = (role) => {
    setNewRole({
      nom: `${role.nom} (Copie)`,
      description: role.description,
      permissions: { ...role.permissions },
      visible_menus: { ...role.visible_menus }
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Rôles</h1>
          <p className="text-gray-600">Configurez les rôles et leurs permissions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => {
              setEditingRole(null);
              setNewRole({
                nom: '',
                description: '',
                permissions: {},
                visible_menus: {
                  portfolio: true,
                  projects: true,
                  kanban: true,
                  backlog: false,
                  sprints: false,
                  roadmap: false,
                  tasks: true,
                  files: true,
                  comments: true,
                  timesheets: true,
                  budget: false,
                  reports: false,
                  notifications: true,
                  admin: false
                }
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau rôle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Modifier le rôle' : 'Créer un nouveau rôle'}</DialogTitle>
              <DialogDescription>
                Configurez les permissions et l'accès aux menus pour ce rôle
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Nom du rôle</Label>
                <Input
                  value={newRole.nom}
                  onChange={(e) => setNewRole({ ...newRole, nom: e.target.value })}
                  placeholder="Ex: Chef de Projet"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Description du rôle..."
                  rows={2}
                />
              </div>

              <Tabs defaultValue="permissions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="permissions">Permissions (22)</TabsTrigger>
                  <TabsTrigger value="menus">Menus visibles</TabsTrigger>
                </TabsList>

                <TabsContent value="permissions" className="space-y-4 mt-4">
                  {Object.entries(PERMISSIONS).map(([category, perms]) => (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">{category}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {perms.map((perm) => (
                          <div key={perm.key} className="flex items-center justify-between">
                            <Label htmlFor={perm.key} className="text-sm font-normal cursor-pointer">
                              {perm.label}
                            </Label>
                            <Switch
                              id={perm.key}
                              checked={newRole.permissions[perm.key] || false}
                              onCheckedChange={(checked) => handlePermissionChange(perm.key, checked)}
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="menus" className="space-y-3 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Menus accessibles</CardTitle>
                      <CardDescription>Sélectionnez les sections visibles pour ce rôle</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      {Object.entries(newRole.visible_menus).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label htmlFor={`menu-${key}`} className="text-sm font-normal cursor-pointer capitalize">
                            {key.replace('_', ' ')}
                          </Label>
                          <Switch
                            id={`menu-${key}`}
                            checked={value}
                            onCheckedChange={(checked) => handleMenuChange(key, checked)}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveRole} className="bg-indigo-600 hover:bg-indigo-700">
                {editingRole ? 'Mettre à jour' : 'Créer le rôle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => {
          const permCount = Object.values(role.permissions || {}).filter(Boolean).length;
          return (
            <Card key={role._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-600" />
                      {role.nom}
                    </CardTitle>
                    <CardDescription className="mt-2">{role.description}</CardDescription>
                  </div>
                  {role.is_predefined && (
                    <Badge variant="outline">Prédéfini</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Permissions actives</span>
                    <Badge>{permCount} / 22</Badge>
                  </div>
                  <div className="flex gap-2">
                    {!role.is_predefined && (
                      <>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Edit className="w-3 h-3 mr-1" />
                          Modifier
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDuplicateRole(role)}>
                          <Copy className="w-3 h-3 mr-1" />
                          Dupliquer
                        </Button>
                      </>
                    )}
                    {role.is_predefined && (
                      <Button size="sm" variant="outline" className="w-full" onClick={() => handleDuplicateRole(role)}>
                        <Copy className="w-3 h-3 mr-1" />
                        Dupliquer
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
