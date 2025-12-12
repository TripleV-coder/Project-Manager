'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Plus, Edit2, Trash2, Save, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';

export default function RolesPage() {
  const router = useRouter();
  const { confirm } = useConfirmation();
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [newRole, setNewRole] = useState({
    nom: '',
    description: '',
    permissions: {},
    visibleMenus: {}
  });

  // Liste complète des 22 permissions atomiques
  const allPermissions = [
    {
      category: 'Projets',
      items: [
        { key: 'voirTousProjets', label: 'Voir tous les projets (portfolio global)' },
        { key: 'voirSesProjets', label: 'Voir uniquement ses projets' },
        { key: 'creerProjet', label: 'Créer un nouveau projet' },
        { key: 'supprimerProjet', label: 'Supprimer un projet' },
        { key: 'modifierCharteProjet', label: 'Modifier la charte / les infos du projet' }
      ]
    },
    {
      category: 'Équipe',
      items: [
        { key: 'gererMembresProjet', label: 'Ajouter / retirer des membres du projet' },
        { key: 'changerRoleMembre', label: 'Changer le rôle d\'un membre dans un projet' }
      ]
    },
    {
      category: 'Tâches',
      items: [
        { key: 'gererTaches', label: 'Créer / modifier / supprimer des tâches' },
        { key: 'deplacerTaches', label: 'Déplacer des tâches (Kanban / statut)' },
        { key: 'prioriserBacklog', label: 'Prioriser le backlog' }
      ]
    },
    {
      category: 'Sprints',
      items: [
        { key: 'gererSprints', label: 'Créer et lancer des sprints' }
      ]
    },
    {
      category: 'Budget',
      items: [
        { key: 'modifierBudget', label: 'Modifier le budget du projet' },
        { key: 'voirBudget', label: 'Voir le budget du projet' }
      ]
    },
    {
      category: 'Temps',
      items: [
        { key: 'voirTempsPasses', label: 'Voir les temps passés (timesheets)' },
        { key: 'saisirTemps', label: 'Saisir son propre temps passé' }
      ]
    },
    {
      category: 'Livrables',
      items: [
        { key: 'validerLivrable', label: 'Valider / refuser un livrable' }
      ]
    },
    {
      category: 'Fichiers',
      items: [
        { key: 'gererFichiers', label: 'Télécharger / uploader des fichiers' }
      ]
    },
    {
      category: 'Communication',
      items: [
        { key: 'commenter', label: 'Commenter et @mention' },
        { key: 'recevoirNotifications', label: 'Recevoir des notifications' }
      ]
    },
    {
      category: 'Rapports & Audit',
      items: [
        { key: 'genererRapports', label: 'Générer des rapports / exports' },
        { key: 'voirAudit', label: 'Voir l\'historique / audit trail' }
      ]
    },
    {
      category: 'Administration',
      items: [
        { key: 'adminConfig', label: 'Accéder à la configuration globale (Admin seulement)' }
      ]
    }
  ];

  // Liste des menus disponibles
  const allMenus = [
    { key: 'portfolio', label: 'Portfolio / Dashboard' },
    { key: 'projects', label: 'Projets' },
    { key: 'kanban', label: 'Kanban Board' },
    { key: 'backlog', label: 'Backlog & Épics' },
    { key: 'sprints', label: 'Sprints' },
    { key: 'roadmap', label: 'Roadmap / Gantt' },
    { key: 'tasks', label: 'Tâches' },
    { key: 'files', label: 'Fichiers' },
    { key: 'comments', label: 'Commentaires' },
    { key: 'timesheets', label: 'Timesheets' },
    { key: 'budget', label: 'Budget' },
    { key: 'reports', label: 'Rapports' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'admin', label: 'Administration' }
  ];

  const { hasPermission: canManageRoles } = user ? useRBACPermissions(user) : { hasPermission: () => false };

  const loadRoles = useCallback(async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [userRes, rolesRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/roles', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const userData = await userRes.json();
      const rolesData = await rolesRes.json();

      // Client-side guard: redirect if not admin
      if (!userData.role?.permissions?.adminConfig) {
        router.push('/dashboard');
        return;
      }

      setUser(userData);
      setRoles(rolesData.roles || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement des rôles');
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreateRole = async () => {
    try {
      if (!newRole.nom || !newRole.description) {
        toast.error('Le nom et la description sont requis');
        return;
      }

      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newRole)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Rôle créé avec succès');
        setCreateDialogOpen(false);
        setNewRole({ nom: '', description: '', permissions: {}, visibleMenus: {} });
        await loadRoles();
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleUpdateRole = async (roleId, updates) => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Rôle modifié avec succès');
        setEditingRole(null);
        await loadRoles();
      } else {
        toast.error(data.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    const confirmed = await confirm({
      title: 'Supprimer le rôle',
      description: `Êtes-vous sûr de vouloir supprimer le rôle "${roleName}" ?`,
      actionLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Rôle supprimé avec succès');
        await loadRoles();
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const togglePermission = (role, permKey) => {
    const updated = {
      ...role,
      permissions: {
        ...role.permissions,
        [permKey]: !role.permissions[permKey]
      }
    };
    setEditingRole(updated);
  };

  const toggleMenu = (role, menuKey) => {
    const updated = {
      ...role,
      visibleMenus: {
        ...role.visibleMenus,
        [menuKey]: !role.visibleMenus[menuKey]
      }
    };
    setEditingRole(updated);
  };

  const toggleNewRolePermission = (permKey) => {
    setNewRole({
      ...newRole,
      permissions: {
        ...newRole.permissions,
        [permKey]: !newRole.permissions[permKey]
      }
    });
  };

  const toggleNewRoleMenu = (menuKey) => {
    setNewRole({
      ...newRole,
      visibleMenus: {
        ...newRole.visibleMenus,
        [menuKey]: !newRole.visibleMenus[menuKey]
      }
    });
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Rôles</h1>
          <p className="text-gray-600">Configurez les 8 rôles et leurs 22 permissions atomiques</p>
        </div>
        {canManageRoles('adminConfig') && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un rôle personnalisé
          </Button>
        )}
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role, idx) => (
          <motion.div
            key={role._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-5 h-5 text-indigo-600" />
                      <CardTitle className="text-lg">{role.nom}</CardTitle>
                    </div>
                    <CardDescription>{role.description}</CardDescription>
                  </div>
                  {role.is_predefined && (
                    <Badge variant="secondary">Système</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Permissions activées</span>
                    <span className="font-medium">
                      {Object.values(role.permissions || {}).filter(Boolean).length} / 22
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Menus visibles</span>
                    <span className="font-medium">
                      {Object.values(role.visibleMenus || {}).filter(Boolean).length} / 14
                    </span>
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setEditingRole(role)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Configurer
                    </Button>
                    {!role.is_predefined && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteRole(role._id, role.nom)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Edit Role Dialog */}
      {editingRole && (
        <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Configuration : {editingRole.nom}
              </DialogTitle>
              <DialogDescription>
                {editingRole.description}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="permissions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="permissions">Permissions (22)</TabsTrigger>
                <TabsTrigger value="menus">Menus Visibles (14)</TabsTrigger>
              </TabsList>

              <TabsContent value="permissions">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    {allPermissions.map((category) => (
                      <div key={category.category}>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                          {category.category}
                        </h3>
                        <div className="space-y-3 ml-3">
                          {category.items.map((perm) => (
                            <div 
                              key={perm.key} 
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Checkbox
                                id={`edit-${perm.key}`}
                                checked={editingRole.permissions?.[perm.key] || false}
                                onCheckedChange={() => togglePermission(editingRole, perm.key)}
                              />
                              <label
                                htmlFor={`edit-${perm.key}`}
                                className="flex-1 cursor-pointer text-sm"
                              >
                                {perm.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="menus">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allMenus.map((menu) => (
                      <div 
                        key={menu.key}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Checkbox
                          id={`menu-edit-${menu.key}`}
                          checked={editingRole.visibleMenus?.[menu.key] || false}
                          onCheckedChange={() => toggleMenu(editingRole, menu.key)}
                        />
                        <label
                          htmlFor={`menu-edit-${menu.key}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {menu.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditingRole(null)}>
                <X className="w-4 h-4 mr-1" />
                Annuler
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => handleUpdateRole(editingRole._id, {
                  permissions: editingRole.permissions,
                  visibleMenus: editingRole.visibleMenus
                })}
              >
                <Save className="w-4 h-4 mr-1" />
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Créer un rôle personnalisé</DialogTitle>
            <DialogDescription>
              Définissez un nouveau rôle avec des permissions spécifiques
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom du rôle</Label>
                <Input
                  value={newRole.nom}
                  onChange={(e) => setNewRole({ ...newRole, nom: e.target.value })}
                  placeholder="Ex: Consultant Externe"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Courte description du rôle"
                />
              </div>
            </div>

            <Tabs defaultValue="permissions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="permissions">Permissions (22)</TabsTrigger>
                <TabsTrigger value="menus">Menus Visibles (14)</TabsTrigger>
              </TabsList>

              <TabsContent value="permissions">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-6">
                    {allPermissions.map((category) => (
                      <div key={category.category}>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                          {category.category}
                        </h3>
                        <div className="space-y-3 ml-3">
                          {category.items.map((perm) => (
                            <div 
                              key={perm.key} 
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Checkbox
                                id={`new-${perm.key}`}
                                checked={newRole.permissions?.[perm.key] || false}
                                onCheckedChange={() => toggleNewRolePermission(perm.key)}
                              />
                              <label
                                htmlFor={`new-${perm.key}`}
                                className="flex-1 cursor-pointer text-sm"
                              >
                                {perm.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="menus">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allMenus.map((menu) => (
                      <div 
                        key={menu.key}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Checkbox
                          id={`menu-new-${menu.key}`}
                          checked={newRole.visibleMenus?.[menu.key] || false}
                          onCheckedChange={() => toggleNewRoleMenu(menu.key)}
                        />
                        <label
                          htmlFor={`menu-new-${menu.key}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {menu.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              setNewRole({ nom: '', description: '', permissions: {}, visibleMenus: {} });
            }}>
              Annuler
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleCreateRole}
            >
              <Plus className="w-4 h-4 mr-1" />
              Créer le rôle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
