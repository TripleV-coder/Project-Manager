'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { extractApiData } from '@/lib/utils';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import { useFormatters, useTranslation } from '@/contexts/AppSettingsContext';
import { useAuthFetch } from '@/hooks/useAuthFetch';

import { SprintMetrics } from '@/components/sprints/SprintMetrics';
import { SprintList } from '@/components/sprints/SprintList';
import { SprintFormDialog } from '@/components/sprints/SprintFormDialog';
import { ManageSprintTasksDialog } from '@/components/sprints/ManageSprintTasksDialog';

export default function SprintsPage() {
  const router = useRouter();
  const { authFetch } = useAuthFetch();
  const { confirm } = useConfirmation();
  const { formatDate } = useFormatters();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingSprint, setCreatingSprint] = useState(false);
  const [startingSprintId, setStartingSprintId] = useState(null);
  const [completingSprintId, setCompletingSprintId] = useState(null);
  const [newSprint, setNewSprint] = useState({
    projet_id: '',
    nom: '',
    objectif: '',
    date_début: '',
    date_fin: '',
    capacité_équipe: '',
  });
  const [tasks, setTasks] = useState([]);
  const [selectedSprintForChart, setSelectedSprintForChart] = useState(null);
  const [showCharts, setShowCharts] = useState(true);
  const [manageTasksDialogOpen, setManageTasksDialogOpen] = useState(false);
  const [selectedSprintForTasks, setSelectedSprintForTasks] = useState(null);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [assigningTask, setAssigningTask] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [savingSprint, setSavingSprint] = useState(false);
  const [deletingSprintId, setDeletingSprintId] = useState(null);

  const permissions = useRBACPermissions(user);
  const canManageSprints = permissions.hasPermission;

  // Helper pour comparer les ObjectId de manière sécurisée
  const compareIds = useCallback((id1, id2) => {
    if (!id1 || !id2) return false;
    const str1 = typeof id1 === 'object' ? (id1._id || id1).toString() : String(id1);
    const str2 = typeof id2 === 'object' ? (id2._id || id2).toString() : String(id2);
    return str1 === str2;
  }, []);

  // Helper pour obtenir les tâches d'un sprint
  const getSprintTasks = useCallback(
    (sprintId) => {
      if (!sprintId || !tasks.length) return [];
      return tasks.filter((t) => {
        const taskSprintId = t.sprint_id?._id || t.sprint_id;
        return compareIds(taskSprintId, sprintId);
      });
    },
    [tasks, compareIds]
  );

  // Calcul des statistiques globales des sprints
  const globalStats = useMemo(() => {
    const completedSprints = sprints.filter((s) => s.statut === 'Terminé');
    const activeSprints = sprints.filter((s) => s.statut === 'Actif');
    const plannedSprints = sprints.filter((s) => s.statut === 'Planifié');

    let totalPlanned = 0;
    let totalCompleted = 0;

    sprints.forEach((sprint) => {
      const sprintTasks = getSprintTasks(sprint._id);
      const planned =
        sprint.story_points_planifiés ||
        sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
      const completed =
        sprint.story_points_complétés !== undefined
          ? sprint.story_points_complétés
          : sprintTasks
              .filter((t) => t.statut === 'Terminé')
              .reduce((sum, t) => sum + (t.story_points || 0), 0);

      totalPlanned += planned;
      totalCompleted += completed;
    });

    const avgVelocity =
      completedSprints.length > 0
        ? Math.round(
            completedSprints.reduce((sum, s) => {
              const sprintTasks = getSprintTasks(s._id);
              return (
                sum +
                (s.velocity ||
                  s.story_points_complétés ||
                  sprintTasks
                    .filter((t) => t.statut === 'Terminé')
                    .reduce((acc, t) => acc + (t.story_points || 0), 0))
              );
            }, 0) / completedSprints.length
          )
        : 0;

    const engagementRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

    return {
      total: sprints.length,
      completed: completedSprints.length,
      active: activeSprints.length,
      planned: plannedSprints.length,
      totalPlanned,
      totalCompleted,
      avgVelocity,
      engagementRate,
    };
  }, [sprints, getSprintTasks]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userRes = await authFetch('/api/auth/me', {
        signal: AbortSignal.timeout(8000),
      });

      if (!userRes.ok) {
        if (userRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Erreur utilisateur');
      }

      const userData = await userRes.json();
      setUser(userData);

      const [sprintsRes, projectsRes, tasksRes] = await Promise.all([
        authFetch('/api/sprints', { signal: AbortSignal.timeout(8000) }),
        authFetch('/api/projects', { signal: AbortSignal.timeout(8000) }),
        authFetch('/api/tasks?limit=200', { signal: AbortSignal.timeout(8000) }),
      ]);

      if (sprintsRes.ok) {
        const sprintsData = await sprintsRes.json();
        const sprintsList = extractApiData(sprintsData, 'sprints') || [];
        setSprints(sprintsList);
        const active = sprintsList.find((s) => s.statut === 'Actif');
        if (active) {
          setSelectedSprintForChart(active._id);
        } else if (sprintsList.length > 0) {
          setSelectedSprintForChart(sprintsList[0]._id);
        }
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(extractApiData(projectsData, 'projects') || []);
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(extractApiData(tasksData, 'tasks') || []);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [authFetch, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSprint = async () => {
    if (!newSprint.nom || !newSprint.projet_id || !newSprint.date_début || !newSprint.date_fin) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setCreatingSprint(true);
      const res = await authFetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSprint,
          capacité_équipe: newSprint.capacité_équipe
            ? parseInt(newSprint.capacité_équipe)
            : undefined,
        }),
      });

      if (res.ok) {
        toast.success('Sprint créé avec succès');
        setCreateDialogOpen(false);
        setNewSprint({
          projet_id: '',
          nom: '',
          objectif: '',
          date_début: '',
          date_fin: '',
          capacité_équipe: '',
        });
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la création du sprint');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la création du sprint');
    } finally {
      setCreatingSprint(false);
    }
  };

  const handleStartSprint = async (sprintId) => {
    try {
      setStartingSprintId(sprintId);
      const res = await authFetch(`/api/sprints/${sprintId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        toast.success('Sprint démarré avec succès !');
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors du démarrage du sprint');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du démarrage du sprint');
    } finally {
      setStartingSprintId(null);
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    const isConfirmed = await confirm({
      title: 'Terminer le sprint',
      description:
        'Êtes-vous sûr de vouloir terminer ce sprint ? Les tâches non terminées seront déplacées vers le backlog.',
      confirmText: 'Terminer',
      cancelText: 'Annuler',
    });

    if (!isConfirmed) return;

    try {
      setCompletingSprintId(sprintId);
      const res = await authFetch(`/api/sprints/${sprintId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Sprint terminé ! Vélocité: ${data.velocity || 0} pts, ${data.completedTasks || 0} tâches complétées`
        );
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la finalisation du sprint');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la finalisation du sprint');
    } finally {
      setCompletingSprintId(null);
    }
  };

  const openManageTasksDialog = async (sprint) => {
    setSelectedSprintForTasks(sprint);
    try {
      const sprintProjectId = sprint.projet_id?._id || sprint.projet_id;
      const res = await authFetch(`/api/tasks?projet_id=${sprintProjectId}&limit=100`, {});
      if (res.ok) {
        const data = await res.json();
        setAvailableTasks(extractApiData(data, 'tasks') || []);
      }
    } catch (error) {
      console.error('Erreur chargement tâches:', error);
      toast.error('Erreur lors du chargement des tâches');
    }
    setManageTasksDialogOpen(true);
  };

  const handleToggleTaskInSprint = async (taskId, assign) => {
    if (!selectedSprintForTasks) return;

    try {
      setAssigningTask(taskId);
      const res = await authFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprint_id: assign ? selectedSprintForTasks._id : null,
        }),
      });

      if (res.ok) {
        toast.success(assign ? 'Tâche ajoutée au sprint' : 'Tâche retirée du sprint');
        const sprintProjectId =
          selectedSprintForTasks.projet_id?._id || selectedSprintForTasks.projet_id;
        const tasksRes = await authFetch(`/api/tasks?projet_id=${sprintProjectId}&limit=100`, {});
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setAvailableTasks(extractApiData(data, 'tasks') || []);
        }
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la modification de l'assignation");
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'assignation");
    } finally {
      setAssigningTask(null);
    }
  };

  const openEditDialog = (sprint) => {
    setEditingSprint({
      _id: sprint._id,
      projet_id: sprint.projet_id?._id || sprint.projet_id,
      nom: sprint.nom,
      objectif: sprint.objectif || '',
      date_début: sprint.date_début ? sprint.date_début.split('T')[0] : '',
      date_fin: sprint.date_fin ? sprint.date_fin.split('T')[0] : '',
      capacité_équipe: sprint.capacité_équipe || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveSprint = async () => {
    if (!editingSprint) return;
    if (!editingSprint.nom || !editingSprint.date_début || !editingSprint.date_fin) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSavingSprint(true);
      const res = await authFetch(`/api/sprints/${editingSprint._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: editingSprint.nom,
          objectif: editingSprint.objectif,
          date_début: editingSprint.date_début,
          date_fin: editingSprint.date_fin,
          capacité_équipe: editingSprint.capacité_équipe
            ? parseInt(editingSprint.capacité_équipe)
            : undefined,
        }),
      });

      if (res.ok) {
        toast.success('Sprint modifié avec succès');
        setEditDialogOpen(false);
        setEditingSprint(null);
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la modification du sprint');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification du sprint');
    } finally {
      setSavingSprint(false);
    }
  };

  const handleDeleteSprint = async (sprintId, sprintNom) => {
    const isConfirmed = await confirm({
      title: 'Supprimer le sprint',
      description: `Êtes-vous sûr de vouloir supprimer le sprint "${sprintNom}" ? Les tâches associées seront replacées dans le backlog.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'destructive',
    });

    if (!isConfirmed) return;

    try {
      setDeletingSprintId(sprintId);
      const res = await authFetch(`/api/sprints/${sprintId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Sprint supprimé avec succès');
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la suppression du sprint');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression du sprint');
    } finally {
      setDeletingSprintId(null);
    }
  };

  const getProjectName = (projectId) => {
    if (!projectId) return 'Projet non assigné';
    const id = typeof projectId === 'object' ? projectId._id : projectId;
    const project = projects.find((p) => p._id === id);
    return project ? project.nom : 'Projet inconnu';
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-80 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-indigo-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Objectifs & Périodes de Travail (Sprints)
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
            Découpez vos projets en périodes courtes et ciblées (ex : 1 à 2 semaines) pour avancer
            efficacement en équipe.
          </p>
        </div>
        {canManageSprints('gererSprints') && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Planifier une période
          </Button>
        )}
      </div>

      <SprintMetrics
        sprints={sprints}
        tasks={tasks}
        globalStats={globalStats}
        showCharts={showCharts}
        setShowCharts={setShowCharts}
        selectedSprintForChart={selectedSprintForChart}
        setSelectedSprintForChart={setSelectedSprintForChart}
        getSprintTasks={getSprintTasks}
      />

      <SprintList
        sprints={sprints}
        getSprintTasks={getSprintTasks}
        getProjectName={getProjectName}
        canManageSprints={canManageSprints}
        setCreateDialogOpen={setCreateDialogOpen}
        openEditDialog={openEditDialog}
        handleDeleteSprint={handleDeleteSprint}
        deletingSprintId={deletingSprintId}
        handleStartSprint={handleStartSprint}
        startingSprintId={startingSprintId}
        handleCompleteSprint={handleCompleteSprint}
        completingSprintId={completingSprintId}
        openManageTasksDialog={openManageTasksDialog}
        formatDate={formatDate}
        t={t}
      />

      <SprintFormDialog
        createDialogOpen={createDialogOpen}
        setCreateDialogOpen={setCreateDialogOpen}
        newSprint={newSprint}
        setNewSprint={setNewSprint}
        creatingSprint={creatingSprint}
        handleCreateSprint={handleCreateSprint}
        projects={projects}
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        editingSprint={editingSprint}
        setEditingSprint={setEditingSprint}
        savingSprint={savingSprint}
        handleSaveSprint={handleSaveSprint}
        getProjectName={getProjectName}
        t={t}
      />

      <ManageSprintTasksDialog
        manageTasksDialogOpen={manageTasksDialogOpen}
        setManageTasksDialogOpen={setManageTasksDialogOpen}
        selectedSprintForTasks={selectedSprintForTasks}
        setSelectedSprintForTasks={setSelectedSprintForTasks}
        availableTasks={availableTasks}
        setAvailableTasks={setAvailableTasks}
        compareIds={compareIds}
        handleToggleTaskInSprint={handleToggleTaskInSprint}
        assigningTask={assigningTask}
        t={t}
      />
    </div>
  );
}
