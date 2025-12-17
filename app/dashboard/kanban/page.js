'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import TaskCard from '@/components/kanban/TaskCard';
import { toast } from 'sonner';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import { useItemFormData } from '@/hooks/useItemFormData';
import ItemFormDialog from '@/components/ItemFormDialog';
import { useTranslation } from '@/contexts/AppSettingsContext';

/**
 * Extrait les données d'une réponse API de manière sécurisée
 */
function extractApiData(response, keys = ['data']) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  for (const key of keys) {
    if (response[key] && Array.isArray(response[key])) {
      return response[key];
    }
  }
  return [];
}

export default function KanbanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const { t } = useTranslation();

  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [tasks, setTasks] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Hook pour charger les données du formulaire
  const handleUnauthorized = useCallback(() => {
    router.push('/login');
  }, [router]);

  const {
    projects,
    users,
    sprints,
    epics,
    stories,
    loading: formDataLoading,
    dataReady,
    errors: dataErrors,
    refresh: refreshFormData
  } = useItemFormData({
    projectId: selectedProject || null,
    loadProjects: true,
    loadUsers: true,
    loadSprints: true,
    loadDeliverables: false,
    onUnauthorized: handleUnauthorized
  });

  const permissions = useRBACPermissions(user);
  const canManageTasks = permissions.hasPermission;
  const canMoveTasks = permissions.hasPermission;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Auto-select first project when projects are loaded
  useEffect(() => {
    if (projects.length > 0 && !selectedProject && !projectId) {
      setSelectedProject(projects[0]._id);
    }
    if (projects.length > 0) {
      setProjectsLoaded(true);
    }
  }, [projects, selectedProject, projectId]);

  // Load project data (tasks, columns) when project is selected
  const loadProjectData = useCallback(async () => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      setLoading(true);

      // Load tasks and project data in parallel
      const [tasksRes, projectRes, userRes] = await Promise.all([
        fetch(`/api/tasks?projet_id=${selectedProject}&limit=200`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(10000)
        }),
        fetch(`/api/projects/${selectedProject}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(10000)
        }),
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(10000)
        })
      ]);

      const [tasksData, projectData, userData] = await Promise.all([
        tasksRes.json(),
        projectRes.json(),
        userRes.json()
      ]);

      if (userRes.ok) {
        setUser(userData);
      }

      if (tasksRes.ok) {
        // Vérification sécurisée du format de réponse API
        const tasksList = extractApiData(tasksData, ['data', 'tasks']);
        if (!Array.isArray(tasksList)) {
          console.error('Format de réponse invalide pour les tâches:', tasksData);
          toast.error('Erreur de format de données');
          setTasks([]);
        } else {
          setTasks(tasksList);
        }
      } else {
        toast.error('Erreur lors du chargement des tâches');
        setTasks([]);
      }

      if (projectRes.ok) {
        const project = projectData.data || projectData.project || projectData;
        const kanbanColumns = project?.colonnes_kanban;

        // Vérification que les colonnes sont valides
        if (Array.isArray(kanbanColumns) && kanbanColumns.length > 0) {
          setColumns(kanbanColumns);
        } else {
          // Colonnes par défaut
          setColumns([
            { id: 'backlog', nom: 'Backlog', couleur: '#94a3b8' },
            { id: 'todo', nom: 'À faire', couleur: '#60a5fa' },
            { id: 'in_progress', nom: 'En cours', couleur: '#f59e0b' },
            { id: 'review', nom: 'Review', couleur: '#8b5cf6' },
            { id: 'done', nom: 'Terminé', couleur: '#10b981' }
          ]);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading project data:', error);
      if (error.name !== 'AbortError') {
        toast.error('Erreur de connexion');
        setLoading(false);
      }
    }
  }, [selectedProject, router]);

  useEffect(() => {
    if (projectsLoaded && selectedProject) {
      loadProjectData();
    }
  }, [selectedProject, projectsLoaded, loadProjectData]);

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find(t => t._id === active.id);
    setActiveTask(task);
  };

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = active.id;
    const newColumnId = over.id;

    const task = tasks.find(t => t._id === taskId);
    if (!task || task.colonne_kanban === newColumnId) {
      setActiveTask(null);
      return;
    }

    // Check permission before moving
    if (!canMoveTasks('deplacerTaches')) {
      toast.error('Vous n\'avez pas la permission de déplacer les tâches');
      setActiveTask(null);
      return;
    }

    // Update locally first for instant feedback
    setTasks(tasks.map(t =>
      t._id === taskId
        ? { ...t, colonne_kanban: newColumnId, statut: columns.find(c => c.id === newColumnId)?.nom || t.statut }
        : t
    ));

    // Update on server
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/tasks/${taskId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nouvelle_colonne: newColumnId,
          nouveau_statut: columns.find(c => c.id === newColumnId)?.nom
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        toast.success('Tâche déplacée avec succès');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors du déplacement');
        loadProjectData();
      }
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Erreur lors du déplacement');
      loadProjectData();
    }

    setActiveTask(null);
  }, [tasks, columns, loadProjectData, canMoveTasks]);

  // Callback après création réussie
  const handleFormSuccess = useCallback(async () => {
    await loadProjectData();
    refreshFormData();
  }, [loadProjectData, refreshFormData]);

  if (!projectsLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold mb-4 dark:text-white">{t('noProjects')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('createProjectForKanban')}</p>
          <Button onClick={() => router.push('/dashboard/projects')}>
            {t('createProject')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('kanban')}</h1>
            <Select value={selectedProject} onValueChange={(value) => {
              setSelectedProject(value);
              setLoading(true);
            }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Sélectionner un projet" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canManageTasks('gererTaches') && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle tâche
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600">Chargement du tableau...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 min-w-min">
              {columns.map(column => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={tasks.filter(t => t.colonne_kanban === column.id)}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <TaskCard task={activeTask} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Formulaire unifié de création */}
      <ItemFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        type="Tâche"
        editingItem={null}
        parentItem={null}
        projectId={selectedProject}
        projects={projects}
        users={users}
        sprints={sprints}
        epics={epics}
        stories={stories}
        dataLoading={formDataLoading}
        dataReady={dataReady}
        dataErrors={dataErrors}
        onSuccess={handleFormSuccess}
        onUnauthorized={handleUnauthorized}
        showProjectSelect={false}
        showTypeSelect={true}
        showParentSelect={true}
      />
    </div>
  );
}
