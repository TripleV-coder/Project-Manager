'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Edit2, Wallet, AlertCircle, Clock,
  Trash2, Plus, X, BarChart3, CheckCircle2, Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useFormatters, useAppSettings } from '@/contexts/AppSettingsContext';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id;
  const { confirm } = useConfirmation();
  const { formatCurrency, formatDate } = useFormatters();
  const { settings: appSettings } = useAppSettings();

  const [project, setProject] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [editData, setEditData] = useState({});
  const [addingMember, setAddingMember] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [projectRoles, setProjectRoles] = useState([]);
  const [newMember, setNewMember] = useState({ user_id: '', project_role_id: '' });
  const [selectedUserRole, setSelectedUserRole] = useState(null);
  const [selectedProjectRole, setSelectedProjectRole] = useState(null);
  const [mergedPermissions, setMergedPermissions] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // États pour la modification de rôle d'un membre
  const [editingMember, setEditingMember] = useState(null);
  const [editingMemberRole, setEditingMemberRole] = useState('');
  const [savingMemberRole, setSavingMemberRole] = useState(false);

  // Fonction pour calculer les permissions fusionnées (système + projet)
  const calculateMergedPermissions = useCallback(() => {
    if (!user || !project) return null;

    // Trouver le rôle de projet de l'utilisateur
    let userProjectRole = null;
    if (project.membres) {
      const userId = user.id || user._id;
      const member = project.membres.find(m => {
        const memberId = m.user_id?._id || m.user_id;
        return memberId?.toString() === userId?.toString();
      });
      if (member && member.project_role_id) {
        userProjectRole = member.project_role_id;
      }
    }

    // Fusionner les permissions (utiliser la plus restrictive)
    const sysPerms = user?.role?.permissions || {};
    const projPerms = userProjectRole?.permissions || {};

    const merged = {};
    for (const key in sysPerms) {
      const sysAllows = sysPerms[key] === true;
      const projAllows = userProjectRole ? projPerms[key] !== false : true;
      merged[key] = sysAllows && projAllows;
    }

    return merged;
  }, [user, project]);

  // Mettre à jour les permissions fusionnées quand user ou project change
  useEffect(() => {
    setMergedPermissions(calculateMergedPermissions());
  }, [user, project, calculateMergedPermissions]);

  // Vérifications de permission - utiliser les permissions fusionnées
  const hasPermission = useCallback((permissionKey) => {
    if (mergedPermissions) {
      return mergedPermissions[permissionKey] === true;
    }
    return user?.role?.permissions?.[permissionKey] === true;
  }, [mergedPermissions, user]);

  const canEdit = user && (
    hasPermission('adminConfig') ||
    hasPermission('modifierCharteProjet') ||
    project?.chef_projet?._id?.toString() === (user.id || user._id)?.toString()
  );

  const canDelete = user && (
    hasPermission('adminConfig') ||
    hasPermission('supprimerProjet')
  );

  const canManageMembers = user && (
    hasPermission('adminConfig') ||
    hasPermission('gererMembresProjet') ||
    project?.chef_projet?._id?.toString() === (user.id || user._id)?.toString()
  );

  const canViewBudget = hasPermission('voirBudget');
  const canViewTimesheet = hasPermission('voirTempsPasses');
  const canViewReports = hasPermission('genererRapports');
  const canViewAudit = hasPermission('voirAudit');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Charger profil utilisateur
      const userRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userRes.ok) {
        router.push('/login');
        return;
      }

      const userData = await userRes.json();
      setUser(userData);

      // Charger détails du projet
      const projectRes = await fetch(`/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!projectRes.ok) {
        if (projectRes.status === 403) {
          toast.error('Accès refusé à ce projet');
          router.push('/dashboard/projects');
        } else {
          toast.error('Projet non trouvé');
          router.push('/dashboard/projects');
        }
        return;
      }

      const projectData = await projectRes.json();
      // Extraction sécurisée du projet (peut être projectData.project, projectData.data ou directement projectData)
      const projectInfo = projectData?.project || projectData?.data || projectData;

      if (!projectInfo || !projectInfo._id) {
        toast.error('Format de réponse invalide');
        router.push('/dashboard/projects');
        return;
      }

      setProject(projectInfo);
      setEditData({
        nom: projectInfo.nom || '',
        description: projectInfo.description || '',
        statut: projectInfo.statut || 'Planification',
        priorité: projectInfo.priorité || 'Moyenne',
        date_début: projectInfo.date_début ? new Date(projectInfo.date_début).toISOString().split('T')[0] : '',
        date_fin_prévue: projectInfo.date_fin_prévue ? new Date(projectInfo.date_fin_prévue).toISOString().split('T')[0] : '',
        budget_prévisionnel: projectInfo.budget?.prévisionnel || 0,
        budget_devise: projectInfo.budget?.devise || 'FCFA'
      });

      // Charger utilisateurs disponibles seulement si permission de gérer les membres
      const userPerms = userData.role_id?.permissions || userData.role?.permissions || {};
      const canLoadUsers = userPerms.gererUtilisateurs || userPerms.adminConfig || userPerms.gererMembresProjet;
      if (canLoadUsers) {
        try {
          const usersRes = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (usersRes.ok) {
            const usersData = await usersRes.json();
            // API returns { success: true, data: [...] } or legacy format
            setAvailableUsers(usersData.data || usersData.users || []);
          }
        } catch {
          console.warn('Impossible de charger les utilisateurs');
          setAvailableUsers([]);
        }
      } else {
        setAvailableUsers([]);
      }

      // Charger les rôles : d'abord les rôles de projet, sinon les rôles système
      try {
        // Essayer de charger les rôles spécifiques au projet
        const projectRolesRes = await fetch(`/api/projects/${projectId}/roles`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (projectRolesRes.ok) {
          const projectRolesData = await projectRolesRes.json();
          const roles = projectRolesData.roles || [];

          if (roles.length > 0) {
            setProjectRoles(roles);
          } else {
            // Fallback vers les rôles système si pas de rôles projet
            const systemRolesRes = await fetch('/api/roles', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (systemRolesRes.ok) {
              const systemRolesData = await systemRolesRes.json();
              setProjectRoles(systemRolesData.roles || []);
            }
          }
        } else {
          // Fallback vers les rôles système
          const systemRolesRes = await fetch('/api/roles', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (systemRolesRes.ok) {
            const systemRolesData = await systemRolesRes.json();
            setProjectRoles(systemRolesData.roles || []);
          }
        }
      } catch {
        console.warn('Impossible de charger les rôles');
        setProjectRoles([]);
      }

      // Charger les dépenses du projet pour calculer le budget consommé
      const canViewBudgetPerm = userPerms.voirBudget || userPerms.adminConfig;
      if (canViewBudgetPerm) {
        try {
          const expensesRes = await fetch(`/api/expenses?projet_id=${projectId}&limit=200`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (expensesRes.ok) {
            const expensesData = await expensesRes.json();
            const expenses = expensesData.expenses || expensesData.data || [];
            // Calculer le total des dépenses validées ou payées
            const total = expenses
              .filter(e => e.statut === 'validé' || e.statut === 'payé')
              .reduce((sum, e) => sum + (e.montant || 0), 0);
            setTotalExpenses(total);
          }
        } catch {
          console.warn('Impossible de charger les dépenses');
          setTotalExpenses(0);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveChanges = async () => {
    setSavingChanges(true);
    try {
      const token = localStorage.getItem('pm_token');

      // Préparer les données avec le budget formaté correctement
      const dataToSend = {
        nom: editData.nom,
        description: editData.description,
        statut: editData.statut,
        priorité: editData.priorité,
        date_début: editData.date_début,
        date_fin_prévue: editData.date_fin_prévue,
        budget: {
          prévisionnel: editData.budget_prévisionnel || 0,
          devise: editData.budget_devise || 'FCFA'
        }
      };

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (response.ok) {
        // Utiliser les données retournées par l'API si disponibles
        const updatedProject = data.project || data.data || data;

        // Mettre à jour l'état local avec les données du serveur
        if (updatedProject && updatedProject._id) {
          setProject(prev => ({
            ...prev,
            ...updatedProject
          }));
          // Mettre à jour editData aussi pour garder la cohérence
          setEditData({
            nom: updatedProject.nom || '',
            description: updatedProject.description || '',
            statut: updatedProject.statut || 'Planification',
            priorité: updatedProject.priorité || 'Moyenne',
            date_début: updatedProject.date_début ? new Date(updatedProject.date_début).toISOString().split('T')[0] : '',
            date_fin_prévue: updatedProject.date_fin_prévue ? new Date(updatedProject.date_fin_prévue).toISOString().split('T')[0] : '',
            budget_prévisionnel: updatedProject.budget?.prévisionnel || 0,
            budget_devise: updatedProject.budget?.devise || 'FCFA'
          });
        } else {
          // Fallback: mettre à jour avec editData si pas de données du serveur
          setProject(prev => ({
            ...prev,
            ...dataToSend
          }));
        }

        toast.success('Projet mis à jour avec succès');
        setEditMode(false);
      } else {
        console.error('Erreur API:', data);
        toast.error(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.user_id) {
      toast.error('Sélectionnez un utilisateur');
      return;
    }

    if (!newMember.project_role_id) {
      toast.error('Sélectionnez un rôle pour le projet');
      return;
    }

    setSavingMember(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: newMember.user_id,
          project_role_id: newMember.project_role_id
        })
      });

      if (response.ok) {
        toast.success('Membre ajouté avec succès');
        setAddingMember(false);
        setNewMember({ user_id: '', project_role_id: '' });
        setSelectedUserRole(null);
        setSelectedProjectRole(null);
        await loadData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erreur lors de l\'ajout du membre');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setRemovingMemberId(memberId);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Membre supprimé');
        await loadData();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setRemovingMemberId(null);
    }
  };

  // Ouvrir le dialog de modification de rôle
  const handleEditMemberRole = (member) => {
    setEditingMember(member);
    setEditingMemberRole(member.project_role_id?._id || '');
  };

  // Sauvegarder le nouveau rôle du membre
  const handleSaveMemberRole = async () => {
    if (!editingMember || !editingMemberRole) {
      toast.error('Sélectionnez un rôle');
      return;
    }

    setSavingMemberRole(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/projects/${projectId}/members/${editingMember._id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_role_id: editingMemberRole
        })
      });

      if (response.ok) {
        toast.success('Rôle modifié avec succès');
        setEditingMember(null);
        setEditingMemberRole('');
        await loadData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erreur lors de la modification du rôle');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setSavingMemberRole(false);
    }
  };

  const handleDeleteProject = async () => {
    const confirmed = await confirm({
      title: 'Supprimer le projet',
      description: 'Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.',
      actionLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    if (!confirmed) {
      return;
    }

    setDeletingProject(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Projet supprimé avec succès');
        router.push('/dashboard/projects');
      } else {
        toast.error('Erreur lors de la suppression');
        setDeletingProject(false);
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
      setDeletingProject(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <div className="mt-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Projet non trouvé</h2>
          <p className="text-gray-600 mb-4">Le projet que vous recherchez n'existe pas ou vous n'y avez pas accès.</p>
          <Button onClick={() => router.push('/dashboard/projects')}>
            Retour aux projets
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'En cours': return 'bg-blue-100 text-blue-800';
      case 'Terminé': return 'bg-green-100 text-green-800';
      case 'En pause': return 'bg-yellow-100 text-yellow-800';
      case 'Annulé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critique': return 'text-red-600';
      case 'Haute': return 'text-orange-600';
      case 'Moyenne': return 'text-blue-600';
      case 'Basse': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const membersList = project.membres || [];

  const handleUserSelect = (userId) => {
    setNewMember({ ...newMember, user_id: userId });
    const selectedUser = availableUsers.find(u => u._id === userId);
    setSelectedUserRole(selectedUser?.role);
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.nom}</h1>
              <p className="text-gray-600 mt-1">{project.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant={editMode ? 'default' : 'outline'}
                onClick={() => setEditMode(!editMode)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {editMode ? 'Annuler' : 'Modifier'}
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={handleDeleteProject}
                disabled={deletingProject}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Edit Mode */}
      {editMode && canEdit && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Modifier le projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={editData.nom}
                    onChange={(e) => setEditData({ ...editData, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={editData.statut} onValueChange={(val) => setEditData({ ...editData, statut: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Planification">Planification</SelectItem>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="En pause">En pause</SelectItem>
                      <SelectItem value="Terminé">Terminé</SelectItem>
                      <SelectItem value="Annulé">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={editData.priorité} onValueChange={(val) => setEditData({ ...editData, priorité: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basse">Basse</SelectItem>
                      <SelectItem value="Moyenne">Moyenne</SelectItem>
                      <SelectItem value="Haute">Haute</SelectItem>
                      <SelectItem value="Critique">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={editData.date_début}
                    onChange={(e) => setEditData({ ...editData, date_début: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin prévue</Label>
                  <Input
                    type="date"
                    value={editData.date_fin_prévue}
                    onChange={(e) => setEditData({ ...editData, date_fin_prévue: e.target.value })}
                  />
                </div>
              </div>

              {/* Budget Section */}
              {canViewBudget && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Budget du projet
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Budget prévisionnel</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        value={editData.budget_prévisionnel}
                        onChange={(e) => setEditData({ ...editData, budget_prévisionnel: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Devise</Label>
                      <Select value={editData.budget_devise} onValueChange={(val) => setEditData({ ...editData, budget_devise: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FCFA">FCFA</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                          <SelectItem value="CHF">CHF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Le budget consommé est calculé automatiquement à partir des dépenses enregistrées.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleSaveChanges} disabled={savingChanges} className="bg-indigo-600 hover:bg-indigo-700">
                  {savingChanges ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)} disabled={savingChanges}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Statut</p>
                  <div className={`px-3 py-2 rounded-lg w-fit text-sm font-medium ${getStatusColor(project.statut)}`}>
                    {project.statut}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Priorité</p>
                  <div className={`font-semibold ${getPriorityColor(project.priorité)}`}>
                    {project.priorité}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date de début</p>
                  <p className="font-medium">
                    {project.date_début ? formatDate(project.date_début) : 'Non défini'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date de fin prévue</p>
                  <p className="font-medium">
                    {project.date_fin_prévue ? formatDate(project.date_fin_prévue) : 'Non défini'}
                  </p>
                </div>
              </div>

              {/* Budget Display */}
              {canViewBudget && project.budget && (project.budget.prévisionnel > 0 || totalExpenses > 0) && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-4 h-4 text-indigo-600" />
                    <p className="text-sm font-semibold text-gray-700">Budget</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Budget prévisionnel</p>
                      <p className="text-lg font-bold text-indigo-600">
                        {formatCurrency(project.budget.prévisionnel || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Budget consommé</p>
                      <p className={`text-lg font-bold ${totalExpenses > project.budget.prévisionnel ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(totalExpenses)}
                      </p>
                    </div>
                  </div>
                  {project.budget.prévisionnel > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Consommation du budget</span>
                        <span className="text-xs font-medium">
                          {Math.round((totalExpenses / project.budget.prévisionnel) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (totalExpenses / project.budget.prévisionnel) > 1
                              ? 'bg-red-500'
                              : (totalExpenses / project.budget.prévisionnel) > 0.8
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((totalExpenses / project.budget.prévisionnel) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Reste: {formatCurrency(project.budget.prévisionnel - totalExpenses)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Avancement global</span>
                  <span className="text-sm font-bold text-indigo-600">{project.stats?.progression || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${project.stats?.progression || 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-600">Tâches terminées</p>
                  <p className="text-lg font-bold text-green-600">{project.stats?.tâches_terminées || 0}/{project.stats?.total_tâches || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Heures réelles</p>
                  <p className="text-lg font-bold text-blue-600">{project.stats?.heures_réelles || 0}h / {project.stats?.heures_estimées || 0}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Équipe du projet</CardTitle>
                {canManageMembers && (
                  <Dialog open={addingMember} onOpenChange={setAddingMember}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-indigo-600">
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Ajouter un membre au projet</DialogTitle>
                        <DialogDescription>
                          Sélectionnez l'utilisateur et le rôle système à assigner dans ce projet
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Utilisateur et son rôle système</Label>
                          <Select value={newMember.user_id} onValueChange={handleUserSelect}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un utilisateur" />
                            </SelectTrigger>
                            <SelectContent className="w-full max-w-md">
                              {availableUsers.map(u => (
                                <SelectItem key={u._id} value={u._id}>
                                  <div className="text-left">
                                    <div className="font-medium">{u.nom_complet}</div>
                                    <div className="text-xs text-gray-500">
                                      {u.email} • Rôle: <span className="font-semibold">{u.role?.nom}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Afficher les permissions du rôle système sélectionné */}
                        {selectedUserRole && (
                          <div className="space-y-3">
                            <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-bold text-indigo-900">{selectedUserRole.nom}</p>
                                  <p className="text-sm text-indigo-800">{selectedUserRole.description}</p>
                                </div>
                                <Badge className="bg-indigo-600">{selectedUserRole.is_predefined ? '8 rôles' : 'Custom'}</Badge>
                              </div>

                              <div className="mt-3 pt-3 border-t border-indigo-200">
                                <p className="text-xs font-semibold text-indigo-900 mb-2">PERMISSIONS:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-indigo-800">
                                  {selectedUserRole.permissions?.voirTousProjets && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir tous projets</div>}
                                  {selectedUserRole.permissions?.creerProjet && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Créer projets</div>}
                                  {selectedUserRole.permissions?.modifierCharteProjet && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Modifier projets</div>}
                                  {selectedUserRole.permissions?.supprimerProjet && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Supprimer projets</div>}
                                  {selectedUserRole.permissions?.gererMembresProjet && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Gérer membres</div>}
                                  {selectedUserRole.permissions?.gererTaches && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Gérer tâches</div>}
                                  {selectedUserRole.permissions?.voirBudget && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir budget</div>}
                                  {selectedUserRole.permissions?.modifierBudget && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Modifier budget</div>}
                                  {selectedUserRole.permissions?.voirTempsPasses && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir timesheets</div>}
                                  {selectedUserRole.permissions?.gererSprints && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Gérer sprints</div>}
                                  {selectedUserRole.permissions?.genererRapports && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Générer rapports</div>}
                                  {selectedUserRole.permissions?.voirAudit && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir audit</div>}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Rôle système à assigner</Label>
                          <Select value={newMember.project_role_id} onValueChange={(roleId) => {
                            setNewMember({ ...newMember, project_role_id: roleId });
                            const role = projectRoles.find(r => r._id === roleId);
                            setSelectedProjectRole(role);
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un rôle pour le projet" />
                            </SelectTrigger>
                            <SelectContent className="w-full max-w-md">
                              {projectRoles.map(role => (
                                <SelectItem key={role._id} value={role._id}>
                                  <div className="text-left">
                                    <div className="font-medium">{role.nom}</div>
                                    <div className="text-xs text-gray-500">{role.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Afficher les permissions du rôle de projet sélectionné */}
                        {selectedProjectRole && (
                          <div className="space-y-3">
                            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-bold text-blue-900">{selectedProjectRole.nom}</p>
                                  <p className="text-sm text-blue-800">{selectedProjectRole.description}</p>
                                </div>
                                <Badge className="bg-blue-600">Rôle système</Badge>
                              </div>

                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <p className="text-xs font-semibold text-blue-900 mb-2">PERMISSIONS DU RÔLE:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                                  {selectedProjectRole.permissions?.voirTousProjets && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir tous projets</div>}
                                  {selectedProjectRole.permissions?.creerProjet && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Créer projets</div>}
                                  {selectedProjectRole.permissions?.modifierCharteProjet && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Modifier projets</div>}
                                  {selectedProjectRole.permissions?.supprimerProjet && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Supprimer projets</div>}
                                  {selectedProjectRole.permissions?.gererMembresProjet && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Gérer membres</div>}
                                  {selectedProjectRole.permissions?.gererTaches && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Gérer tâches</div>}
                                  {selectedProjectRole.permissions?.voirBudget && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir budget</div>}
                                  {selectedProjectRole.permissions?.modifierBudget && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Modifier budget</div>}
                                  {selectedProjectRole.permissions?.voirTempsPasses && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir timesheets</div>}
                                  {selectedProjectRole.permissions?.gererSprints && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Gérer sprints</div>}
                                  {selectedProjectRole.permissions?.genererRapports && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Générer rapports</div>}
                                  {selectedProjectRole.permissions?.voirAudit && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir audit</div>}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddingMember(false)} disabled={savingMember}>
                          Annuler
                        </Button>
                        <Button onClick={handleAddMember} disabled={savingMember} className="bg-indigo-600">
                          {savingMember ? 'Ajout en cours...' : 'Ajouter le membre'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Chef de projet */}
                {project.chef_projet && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-indigo-600 text-white">
                          {project.chef_projet.nom_complet?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{project.chef_projet.nom_complet}</p>
                        <p className="text-xs text-gray-600">Chef de projet</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Owner */}
                {project.product_owner && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-purple-600 text-white">
                          {project.product_owner.nom_complet?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{project.product_owner.nom_complet}</p>
                        <p className="text-xs text-gray-600">Product Owner</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Other Members */}
                {membersList.length > 0 ? (
                  membersList.map((member) => {
                    const memberRole = member.project_role_id?.nom || member.user_id?.role?.nom || 'Membre';
                    return (
                      <div key={member._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-gray-600 text-white">
                              {member.user_id?.nom_complet?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{member.user_id?.nom_complet}</p>
                            <Badge variant="secondary" className="text-xs">
                              {memberRole}
                            </Badge>
                          </div>
                        </div>
                        {canManageMembers && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMemberRole(member)}
                              className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                              title="Modifier le rôle"
                            >
                              <Settings2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member._id)}
                              disabled={removingMemberId === member._id}
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Retirer du projet"
                            >
                              {removingMemberId === member._id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 py-4">Aucun membre ajouté pour le moment</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar (Infos filtrées selon permissions) */}
        <div className="space-y-6">
          {/* Budget - Visible si permission voirBudget */}
          {canViewBudget && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Prévisionnel</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(project.budget?.prévisionnel || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Réel</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(project.budget?.réel || 0)}
                  </p>
                </div>
                <div className="p-2 bg-gray-100 rounded text-xs text-gray-600">
                  <p>Restant: {formatCurrency((project.budget?.prévisionnel || 0) - (project.budget?.réel || 0))}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timesheets - Visible si permission voirTempsPasses */}
          {canViewTimesheet && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Temps passé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Heures estimées</p>
                  <p className="text-lg font-bold text-gray-900">{project.stats?.heures_estimées || 0}h</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Heures réelles</p>
                  <p className="text-lg font-bold text-indigo-600">{project.stats?.heures_réelles || 0}h</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reports - Visible si permission genererRapports */}
          {canViewReports && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Rapports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={() => router.push(`/dashboard/reports?projectId=${projectId}`)}>
                  Générer un rapport
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Audit Trail - Visible si permission voirAudit */}
          {canViewAudit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Audit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Historique des modifications disponible</p>
              </CardContent>
            </Card>
          )}

          {/* Key Info - Always visible */}
          <Card>
            <CardHeader>
              <CardTitle>Informations clés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Template</p>
                <p className="font-medium">{project.template_id?.nom || 'Non défini'}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Créé par</p>
                <p className="font-medium">{project.créé_par?.nom_complet || 'Inconnu'}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Créé le</p>
                <p className="font-medium">{new Date(project.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              {project.date_fin_réelle && (
                <div>
                  <p className="text-gray-600 mb-1">Terminé le</p>
                  <p className="font-medium">{new Date(project.date_fin_réelle).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de modification de rôle */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le rôle du membre</DialogTitle>
            <DialogDescription>
              Changer le rôle de {editingMember?.user_id?.nom_complet} dans ce projet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Avatar>
                <AvatarFallback className="bg-indigo-600 text-white">
                  {editingMember?.user_id?.nom_complet?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{editingMember?.user_id?.nom_complet}</p>
                <p className="text-xs text-gray-500">{editingMember?.user_id?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nouveau rôle</Label>
              <Select value={editingMemberRole} onValueChange={setEditingMemberRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {projectRoles.map(role => (
                    <SelectItem key={role._id} value={role._id}>
                      <div className="text-left">
                        <div className="font-medium">{role.nom}</div>
                        <div className="text-xs text-gray-500">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingMemberRole && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                  Permissions du rôle sélectionné :
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs text-indigo-800 dark:text-indigo-200">
                  {(() => {
                    const selectedRole = projectRoles.find(r => r._id === editingMemberRole);
                    if (!selectedRole) return null;
                    return (
                      <>
                        {selectedRole.permissions?.voirTousProjets && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir tous projets</div>}
                        {selectedRole.permissions?.gererTaches && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Gérer tâches</div>}
                        {selectedRole.permissions?.gererSprints && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Gérer sprints</div>}
                        {selectedRole.permissions?.voirBudget && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir budget</div>}
                        {selectedRole.permissions?.modifierBudget && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Modifier budget</div>}
                        {selectedRole.permissions?.gererMembresProjet && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Gérer membres</div>}
                        {selectedRole.permissions?.genererRapports && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Générer rapports</div>}
                        {selectedRole.permissions?.voirAudit && <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voir audit</div>}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)} disabled={savingMemberRole}>
              Annuler
            </Button>
            <Button onClick={handleSaveMemberRole} disabled={savingMemberRole || !editingMemberRole} className="bg-indigo-600">
              {savingMemberRole ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
