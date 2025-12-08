'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const PERMISSIONS_CONFIG = {
  'Gestion de Projets': [
    { key: 'voir_tous_projets', label: 'Voir tous les projets du portfolio' },
    { key: 'voir_ses_projets', label: 'Voir uniquement ses projets assignés' },
    { key: 'créer_projet', label: 'Créer de nouveaux projets' },
    { key: 'modifier_charte_projet', label: 'Modifier la charte et informations projet' },
    { key: 'supprimer_projet', label: 'Supprimer un projet' },
    { key: 'gérer_membres_projet', label: 'Ajouter/retirer des membres' },
    { key: 'changer_rôle_membre', label: 'Changer le rôle des membres' },
  ],
  'Gestion des Tâches': [
    { key: 'gérer_tâches', label: 'Créer, modifier et supprimer des tâches' },
    { key: 'déplacer_tâches', label: 'Déplacer les tâches (Kanban)' },
    { key: 'prioriser_backlog', label: 'Prioriser le backlog produit' },
  ],
  'Planification Agile': [
    { key: 'gérer_sprints', label: 'Créer et gérer les sprints' },
  ],
  'Budget et Finances': [
    { key: 'voir_budget', label: 'Consulter le budget des projets' },
    { key: 'modifier_budget', label: 'Modifier le budget des projets' },
  ],
  'Suivi du Temps': [
    { key: 'saisir_temps', label: 'Saisir son propre temps passé' },
    { key: 'voir_temps_passés', label: 'Voir le temps passé de l\'équipe' },
  ],
  'Livrables': [
    { key: 'valider_livrable', label: 'Valider ou refuser des livrables' },
  ],
  'Fichiers et Communication': [
    { key: 'gérer_fichiers', label: 'Télécharger et gérer des fichiers' },
    { key: 'commenter', label: 'Commenter et @mentionner' },
    { key: 'recevoir_notifications', label: 'Recevoir des notifications' },
  ],
  'Rapports et Administration': [
    { key: 'générer_rapports', label: 'Générer et exporter des rapports' },
    { key: 'voir_audit', label: 'Consulter l\'audit trail' },
    { key: 'admin_config', label: 'Accès configuration système (Admin uniquement)' },
  ],
};

const MENU_CONFIG = {
  portfolio: 'Vue Portfolio',
  projects: 'Projets',
  kanban: 'Board Kanban',
  backlog: 'Backlog',
  sprints: 'Sprints',
  roadmap: 'Roadmap',
  tasks: 'Tâches',
  files: 'Fichiers',
  comments: 'Commentaires',
  timesheets: 'Feuilles de temps',
  budget: 'Budget',
  reports: 'Rapports',
  notifications: 'Notifications',
  admin: 'Administration'
};

const ROLES_DISPLAY_NAMES = {
  'Admin': 'Administrateur',
  'Project_Manager': 'Chef de Projet',
  'Team_Lead': 'Lead Équipe',
  'Product_Owner': 'Product Owner',
  'Team_Member': 'Membre Équipe',
  'Stakeholder_Client': 'Client / Stakeholder',
  'Viewer': 'Observateur',
  'Guest': 'Invité'
};

export default function RolesManagement() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [newRole, setNewRole] = useState({
    nom: '',
    description: '',
    permissions: {},
    visible_menus: {}
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

  const handleOpenDialog = (role = null) => {
    if (role) {
      setEditingRole(role);
      setNewRole({
        nom: role.nom,
        description: role.description || '',
        permissions: { ...role.permissions },
        visible_menus: { ...role.visible_menus }
      });
    } else {
      setEditingRole(null);
      setNewRole({
        nom: '',
        description: '',
        permissions: {},
        visible_menus: Object.keys(MENU_CONFIG).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {})
      });
    }
    setDialogOpen(true);
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
        loadRoles();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion');
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/roles/${roleToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        setRoleToDelete(null);
        loadRoles();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion');
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

  const countActivePermissions = (permissions) => {
    return Object.values(permissions || {}).filter(Boolean).length;
  };

  const getDisplayName = (roleName) => {
    return ROLES_DISPLAY_NAMES[roleName] || roleName;
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
          <p className="text-gray-600">Configurez les rôles et leurs permissions d'accès</p>
        </div>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => handleOpenDialog()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Créer un rôle personnalisé
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => {
          const permCount = countActivePermissions(role.permissions);
          const totalPerms = Object.keys(PERMISSIONS_CONFIG).reduce((acc, cat) => acc + PERMISSIONS_CONFIG[cat].length, 0);
          
          return (
            <Card key={role._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-indigo-600" />
                      <CardTitle className="text-lg">{getDisplayName(role.nom)}</CardTitle>
                    </div>
                    {role.description && (
                      <CardDescription className="text-sm">
                        {role.description}
                      </CardDescription>
                    )}
                  </div>
                  {role.is_predefined && (
                    <Badge variant="outline" className="bg-blue-50">Système</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">Permissions</span>
                      <Badge className="bg-indigo-100 text-indigo-700">
                        {permCount} / {totalPerms}
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${(permCount / totalPerms) * 100}%` }}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleOpenDialog(role)}
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      {role.is_predefined ? 'Voir' : 'Configurer'}
                    </Button>
                    {!role.is_predefined && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setRoleToDelete(role);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog - Suite dans le prochain message à cause de la limite de taille */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? `Configurer: ${getDisplayName(editingRole.nom)}` : 'Créer un nouveau rôle'}
            </DialogTitle>
            <DialogDescription>
              {editingRole?.is_predefined 
                ? 'Les rôles système ne peuvent pas être modifiés.'
                : 'Définissez les permissions et accès pour ce rôle'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {!editingRole?.is_predefined && (
                <>
                  <div className="space-y-2">
                    <Label>Nom du rôle</Label>
                    <Input
                      value={newRole.nom}
                      onChange={(e) => setNewRole({ ...newRole, nom: e.target.value })}
                      placeholder="Ex: Consultant Senior"
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

                  <Separator />
                </>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Permissions</h3>

                {Object.entries(PERMISSIONS_CONFIG).map(([category, perms]) => (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {perms.map((perm) => (
                        <div key={perm.key} className="flex items-start justify-between gap-4">
                          <Label 
                            htmlFor={perm.key} 
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {perm.label}
                          </Label>
                          <Switch
                            id={perm.key}
                            checked={newRole.permissions[perm.key] || false}
                            onCheckedChange={(checked) => handlePermissionChange(perm.key, checked)}
                            disabled={editingRole?.is_predefined}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Menus Accessibles</h3>

                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(MENU_CONFIG).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label 
                            htmlFor={`menu-${key}`} 
                            className="text-sm font-normal cursor-pointer"
                          >
                            {label}
                          </Label>
                          <Switch
                            id={`menu-${key}`}
                            checked={newRole.visible_menus[key] || false}
                            onCheckedChange={(checked) => handleMenuChange(key, checked)}
                            disabled={editingRole?.is_predefined}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {editingRole?.is_predefined ? 'Fermer' : 'Annuler'}
            </Button>
            {!editingRole?.is_predefined && (
              <Button 
                onClick={handleSaveRole} 
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {editingRole ? 'Enregistrer' : 'Créer le rôle'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le rôle "{roleToDelete?.nom}" ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRole}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
