'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRouter, useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useFormatters, useTranslation } from '@/contexts/AppSettingsContext';
import { useAuthFetch } from '@/hooks/useAuthFetch';
import { extractApiData, extractApiRecord } from '@/lib/utils';

import { ProjectHeader } from '@/components/project-details/ProjectHeader';
import { ProjectEditForm } from '@/components/project-details/ProjectEditForm';
import { ProjectOverviewTab } from '@/components/project-details/ProjectOverviewTab';
import { ProjectGovernanceTab } from '@/components/project-details/ProjectGovernanceTab';
import { ProjectDeliverablesTab } from '@/components/project-details/ProjectDeliverablesTab';
import { EditMemberRoleDialog } from '@/components/project-details/EditMemberRoleDialog';

export default function ProjectDetailPage() {
  const router = useRouter();
  const { authFetch } = useAuthFetch();
  const params = useParams();
  const projectId = params.id;
  const { confirm } = useConfirmation();
  const { formatCurrency, formatDate } = useFormatters();
  const { t } = useTranslation();

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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deliverables, setDeliverables] = useState([]);
  const [uploadingDeliverableId, setUploadingDeliverableId] = useState(null);

  // États pour la modification de rôle d'un membre
  const [editingMember, setEditingMember] = useState(null);
  const [editingMemberRole, setEditingMemberRole] = useState('');
  const [savingMemberRole, setSavingMemberRole] = useState(false);

  // Fonction pour calculer les permissions fusionnées (système + projet)
  const calculateMergedPermissions = useCallback(() => {
    if (!user || !project) return null;

    let userProjectRole = null;
    if (project.membres) {
      const userId = user.id || user._id;
      const member = project.membres.find((m) => {
        const memberId = m.user_id?._id || m.user_id;
        return memberId?.toString() === userId?.toString();
      });
      if (member && member.project_role_id) {
        userProjectRole = member.project_role_id;
      }
    }

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

  useEffect(() => {
    setMergedPermissions(calculateMergedPermissions());
  }, [user, project, calculateMergedPermissions]);

  const hasPermission = useCallback(
    (permissionKey) => {
      if (mergedPermissions) {
        return mergedPermissions[permissionKey] === true;
      }
      return user?.role?.permissions?.[permissionKey] === true;
    },
    [mergedPermissions, user]
  );

  const canEdit =
    user &&
    (hasPermission('adminConfig') ||
      hasPermission('modifierCharteProjet') ||
      project?.chef_projet?._id?.toString() === (user.id || user._id)?.toString());

  const canDelete = user && (hasPermission('adminConfig') || hasPermission('supprimerProjet'));

  const canManageMembers =
    user &&
    (hasPermission('adminConfig') ||
      hasPermission('gererMembresProjet') ||
      project?.chef_projet?._id?.toString() === (user.id || user._id)?.toString());

  const canViewBudget = hasPermission('voirBudget');
  const canViewTimesheet = hasPermission('voirTempsPasses');
  const canViewReports = hasPermission('genererRapports');
  const canViewAudit = hasPermission('voirAudit');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userRes = await authFetch('/api/auth/me', {});
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData);

      const projectRes = await authFetch(`/api/projects/${projectId}`, {});
      if (!projectRes.ok) {
        toast.error('Projet introuvable');
        router.push('/dashboard/projects');
        return;
      }
      const projectData = await projectRes.json();
      const proj = extractApiRecord(projectData, ['project', 'data']);
      if (!proj) {
        toast.error('Projet introuvable');
        router.push('/dashboard/projects');
        return;
      }
      setProject(proj);
      setEditData({
        nom: proj.nom || '',
        description: proj.description || '',
        statut: proj.statut || 'Planification',
        priorité: proj.priorité || 'Moyenne',
        date_début: proj.date_début ? proj.date_début.split('T')[0] : '',
        date_fin_prévue: proj.date_fin_prévue ? proj.date_fin_prévue.split('T')[0] : '',
        contexte: proj.contexte || '',
        objectifs: proj.objectifs || '',
        termes_de_reference: proj.termes_de_reference || '',
        comite_technique: proj.comite_technique || [],
        comite_pilotage: proj.comite_pilotage || [],
        structures_partenaires: proj.structures_partenaires || [],
        budget_prévisionnel: proj.budget?.prévisionnel || 0,
        budget_devise: proj.budget?.devise || 'FCFA',
      });

      // Charger dépenses si permission budget
      if (canViewBudget) {
        try {
          const expRes = await authFetch(`/api/expenses?projet_id=${projectId}`, {});
          if (expRes.ok) {
            const expData = await expRes.json();
            const expenses = expData.data || expData.expenses || [];
            const total = expenses.reduce((sum, exp) => sum + (exp.montant || 0), 0);
            setTotalExpenses(total);
          }
        } catch (e) {
          console.error('Erreur chargement dépenses:', e);
        }
      }

      // Charger les rôles de projet disponibles
      try {
        const rolesRes = await authFetch(`/api/projects/${projectId}/roles`, {});
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          const roles = rolesData.data || rolesData.roles || [];
          setProjectRoles(roles);
        }
      } catch (e) {
        console.error('Erreur chargement rôles:', e);
      }

      // Charger les livrables
      try {
        const delivRes = await authFetch(`/api/deliverables?projet_id=${projectId}`, {});
        if (delivRes.ok) {
          const delivData = await delivRes.json();
          setDeliverables(extractApiData(delivData, ['data', 'deliverables']));
        }
      } catch (e) {
        console.error('Erreur chargement livrables:', e);
      }

      // Charger utilisateurs disponibles
      try {
        const usersRes = await authFetch('/api/users?limit=200', {});
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const users = usersData.data || usersData.users || [];
          const currentMemberIds = (proj.membres || []).map((m) =>
            (m.user_id?._id || m.user_id)?.toString()
          );
          if (proj.chef_projet?._id) currentMemberIds.push(proj.chef_projet._id.toString());
          if (proj.product_owner?._id) currentMemberIds.push(proj.product_owner._id.toString());

          const available = users.filter((u) => !currentMemberIds.includes(u._id.toString()));
          setAvailableUsers(available);
        }
      } catch (e) {
        console.error('Erreur chargement utilisateurs:', e);
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [projectId, canViewBudget, authFetch, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveChanges = async () => {
    try {
      setSavingChanges(true);
      const payload = {
        ...editData,
        budget: {
          prévisionnel: editData.budget_prévisionnel,
          devise: editData.budget_devise,
          réel: project.budget?.réel || 0,
        },
      };

      const res = await authFetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Projet mis à jour avec succès');
        setEditMode(false);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleDeleteProject = async () => {
    const isConfirmed = await confirm({
      title: 'Supprimer le projet',
      description: 'Voulez-vous vraiment supprimer ce projet ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'destructive',
    });

    if (!isConfirmed) return;

    try {
      setDeletingProject(true);
      const res = await authFetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Projet supprimé');
        router.push('/dashboard/projects');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingProject(false);
    }
  };

  const handleUserSelect = (userId) => {
    setNewMember({ ...newMember, user_id: userId });
    const selectedUser = availableUsers.find((u) => u._id === userId);
    if (selectedUser?.role) {
      setSelectedUserRole(selectedUser.role);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.user_id || !newMember.project_role_id) {
      toast.error('Veuillez sélectionner un utilisateur et un rôle');
      return;
    }

    try {
      setSavingMember(true);
      const updatedMembers = [
        ...(project.membres || []).map((m) => ({
          user_id: m.user_id?._id || m.user_id,
          project_role_id: m.project_role_id?._id || m.project_role_id,
        })),
        { user_id: newMember.user_id, project_role_id: newMember.project_role_id },
      ];

      const res = await authFetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membres: updatedMembers }),
      });

      if (res.ok) {
        toast.success('Membre ajouté avec succès');
        setAddingMember(false);
        setNewMember({ user_id: '', project_role_id: '' });
        setSelectedUserRole(null);
        setSelectedProjectRole(null);
        loadData();
      } else {
        toast.error("Erreur lors de l'ajout du membre");
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    const isConfirmed = await confirm({
      title: 'Retirer le membre',
      description: 'Voulez-vous vraiment retirer ce membre du projet ?',
      confirmText: 'Retirer',
      cancelText: 'Annuler',
      variant: 'destructive',
    });

    if (!isConfirmed) return;

    try {
      setRemovingMemberId(memberId);
      const updatedMembers = (project.membres || [])
        .filter((m) => m._id !== memberId)
        .map((m) => ({
          user_id: m.user_id?._id || m.user_id,
          project_role_id: m.project_role_id?._id || m.project_role_id,
        }));

      const res = await authFetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membres: updatedMembers }),
      });

      if (res.ok) {
        toast.success('Membre retiré du projet');
        loadData();
      } else {
        toast.error('Erreur lors du retrait du membre');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du retrait');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleEditMemberRole = (member) => {
    setEditingMember(member);
    setEditingMemberRole(member.project_role_id?._id || member.project_role_id || '');
  };

  const handleSaveMemberRole = async () => {
    if (!editingMember || !editingMemberRole) return;

    try {
      setSavingMemberRole(true);
      const updatedMembers = (project.membres || []).map((m) => {
        if (m._id === editingMember._id) {
          return {
            user_id: m.user_id?._id || m.user_id,
            project_role_id: editingMemberRole,
          };
        }
        return {
          user_id: m.user_id?._id || m.user_id,
          project_role_id: m.project_role_id?._id || m.project_role_id,
        };
      });

      const res = await authFetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membres: updatedMembers }),
      });

      if (res.ok) {
        toast.success('Rôle du membre mis à jour');
        setEditingMember(null);
        setEditingMemberRole('');
        loadData();
      } else {
        toast.error('Erreur lors de la modification du rôle');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSavingMemberRole(false);
    }
  };

  const handleUploadDeliverableFile = async (e, deliverableId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDeliverableId(deliverableId);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deliverable_id', deliverableId);
      formData.append('projet_id', projectId);

      const res = await authFetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast.success('Fichier téléversé avec succès');
        loadData();
      } else {
        toast.error('Erreur lors du téléversement');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors du téléversement');
    } finally {
      setUploadingDeliverableId(null);
    }
  };

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'Planification':
        return 'bg-blue-100 text-blue-800';
      case 'En cours':
        return 'bg-green-100 text-green-800';
      case 'En pause':
        return 'bg-yellow-100 text-yellow-800';
      case 'Terminé':
        return 'bg-gray-100 text-gray-800';
      case 'Annulé':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priorité) => {
    switch (priorité) {
      case 'Critique':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Haute':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Moyenne':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Basse':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-10 bg-gray-200 rounded animate-pulse w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <ProjectHeader
        project={project}
        canEdit={canEdit}
        canDelete={canDelete}
        editMode={editMode}
        setEditMode={setEditMode}
        deletingProject={deletingProject}
        handleDeleteProject={handleDeleteProject}
        router={router}
        getStatusColor={getStatusColor}
        getPriorityColor={getPriorityColor}
      />

      {editMode && (
        <ProjectEditForm
          editData={editData}
          setEditData={setEditData}
          canViewBudget={canViewBudget}
          savingChanges={savingChanges}
          handleSaveChanges={handleSaveChanges}
          setEditMode={setEditMode}
        />
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-2 mb-6 justify-start bg-transparent">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            {t('projectOverview')}
          </TabsTrigger>
          <TabsTrigger
            value="gouvernance"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            {t('projectGovernance')}
          </TabsTrigger>
          <TabsTrigger
            value="livrables"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            {t('projectDeliverables')}
          </TabsTrigger>
          <TabsTrigger
            value="taches"
            onClick={() => router.push(`/dashboard/kanban?project=${projectId}`)}
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            {t('projectTasks')}
          </TabsTrigger>
          <TabsTrigger
            value="budget"
            onClick={() => router.push(`/dashboard/budget?project=${projectId}`)}
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            {t('projectBudgetTab')}
          </TabsTrigger>
          <TabsTrigger
            value="fichiers"
            onClick={() => router.push(`/dashboard/files?project=${projectId}`)}
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            {t('projectFiles')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <ProjectOverviewTab
            project={project}
            totalExpenses={totalExpenses}
            canViewBudget={canViewBudget}
            canViewTimesheet={canViewTimesheet}
            canViewReports={canViewReports}
            canViewAudit={canViewAudit}
            canManageMembers={canManageMembers}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
            t={t}
            router={router}
            projectId={projectId}
            addingMember={addingMember}
            setAddingMember={setAddingMember}
            availableUsers={availableUsers}
            projectRoles={projectRoles}
            newMember={newMember}
            setNewMember={setNewMember}
            selectedUserRole={selectedUserRole}
            handleUserSelect={handleUserSelect}
            selectedProjectRole={selectedProjectRole}
            setSelectedProjectRole={setSelectedProjectRole}
            savingMember={savingMember}
            handleAddMember={handleAddMember}
            removingMemberId={removingMemberId}
            handleRemoveMember={handleRemoveMember}
            handleEditMemberRole={handleEditMemberRole}
          />
        </TabsContent>

        <TabsContent value="gouvernance" className="space-y-6 mt-4">
          <ProjectGovernanceTab project={project} />
        </TabsContent>

        <TabsContent value="livrables" className="space-y-6 mt-4">
          <ProjectDeliverablesTab
            deliverables={deliverables}
            projectId={projectId}
            router={router}
            uploadingDeliverableId={uploadingDeliverableId}
            handleUploadDeliverableFile={handleUploadDeliverableFile}
            t={t}
          />
        </TabsContent>
      </Tabs>

      <EditMemberRoleDialog
        editingMember={editingMember}
        setEditingMember={setEditingMember}
        editingMemberRole={editingMemberRole}
        setEditingMemberRole={setEditingMemberRole}
        projectRoles={projectRoles}
        savingMemberRole={savingMemberRole}
        handleSaveMemberRole={handleSaveMemberRole}
      />
    </div>
  );
}
