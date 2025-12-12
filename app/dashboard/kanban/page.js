'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Search, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import TaskCard from '@/components/kanban/TaskCard';
import { toast } from 'sonner';

export default function KanbanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [tasks, setTasks] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [users, setUsers] = useState([]);
  
  const [newTask, setNewTask] = useState({
    titre: '',
    description: '',
    priorité: 'Moyenne',
    assigné_à: '',
    date_début: '',
    date_échéance: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load projects once on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const token = localStorage.getItem('pm_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const projectsRes = await fetch('/api/projects?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(8000)
        });
        
        if (!projectsRes.ok) throw new Error('Failed to load projects');
        
        const projectsData = await projectsRes.json();
        const projectsList = projectsData.projects || [];
        setProjects(projectsList);

        if (!projectId && projectsList.length > 0) {
          setSelectedProject(projectsList[0]._id);
        }
        setProjectsLoaded(true);
      } catch (error) {
        console.error('Error loading projects:', error);
        if (error.name !== 'AbortError') {
          setProjectsLoaded(true);
        }
      }
    };

    loadProjects();
  }, [projectId, router]);

  // Load project data (tasks, columns, users) when project is selected
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

      // Load all data in parallel
      const [tasksRes, projectRes, usersRes] = await Promise.all([
        fetch(`/api/tasks?projet_id=${selectedProject}&limit=200`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(10000)
        }),
        fetch(`/api/projects/${selectedProject}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(10000)
        }),
        fetch('/api/users?limit=200', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(10000)
        })
      ]);

      const [tasksData, projectData, usersData] = await Promise.all([
        tasksRes.json(),
        projectRes.json(),
        usersRes.json()
      ]);

      if (tasksRes.ok) {
        setTasks(tasksData.tasks || []);
      }

      if (projectRes.ok) {
        setColumns(projectData.project?.colonnes_kanban || [
          { id: 'backlog', nom: 'Backlog', couleur: '#94a3b8' },
          { id: 'todo', nom: 'À faire', couleur: '#60a5fa' },
          { id: 'in_progress', nom: 'En cours', couleur: '#f59e0b' },
          { id: 'review', nom: 'Review', couleur: '#8b5cf6' },
          { id: 'done', nom: 'Terminé', couleur: '#10b981' }
        ]);
      }

      if (usersRes.ok) {
        setUsers(usersData.users || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading project data:', error);
      if (error.name !== 'AbortError') {
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

    // Update locally first for instant feedback
    setTasks(tasks.map(t => 
      t._id === taskId 
        ? { ...t, colonne_kanban: newColumnId, statut: columns.find(c => c.id === newColumnId)?.nom || t.statut }
        : t
    ));

    // Update on server
    try {
      const token = localStorage.getItem('pm_token');
      await fetch(`/api/tasks/${taskId}/move`, {
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
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Erreur lors du déplacement');
      loadProjectData();
    }

    setActiveTask(null);
  }, [tasks, columns, loadProjectData]);

  const handleCreateTask = useCallback(async () => {
    try {
      if (!newTask.titre.trim()) {
        toast.error('Le titre est requis');
        return;
      }

      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newTask,
          projet_id: selectedProject,
          statut: 'Backlog',
          colonne_kanban: 'backlog'
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const createdTask = await response.json();
        setTasks([...tasks, createdTask.task || createdTask]);
        setCreateDialogOpen(false);
        setNewTask({ titre: '', description: '', priorité: 'Moyenne', assigné_à: '', date_début: '', date_échéance: '' });
        toast.success('Tâche créée avec succès');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la création');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error creating task:', error);
        toast.error('Erreur de connexion');
      }
    }
  }, [newTask, selectedProject, tasks]);

  if (!projectsLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Chargement des projets...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Aucun projet</h2>
          <p className="text-gray-600 mb-6">Créez un projet pour utiliser le Kanban</p>
          <Button onClick={() => router.push('/dashboard/projects')}>
            Créer un projet
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
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

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une tâche</DialogTitle>
                <DialogDescription>Ajoutez une nouvelle tâche au backlog</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input
                    value={newTask.titre}
                    onChange={(e) => setNewTask({ ...newTask, titre: e.target.value })}
                    placeholder="Titre de la tâche"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Description (optionnel)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={newTask.priorité} onValueChange={(val) => setNewTask({ ...newTask, priorité: val })}>
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
                  <Label>Assigné à</Label>
                  <Select value={newTask.assigné_à || ''} onValueChange={(val) => setNewTask({ ...newTask, assigné_à: val === '' ? null : val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un utilisateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u._id} value={u._id}>{u.nom_complet}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={newTask.date_début}
                    onChange={(e) => setNewTask({ ...newTask, date_début: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date d'échéance</Label>
                  <Input
                    type="date"
                    value={newTask.date_échéance}
                    onChange={(e) => setNewTask({ ...newTask, date_échéance: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleCreateTask} className="bg-indigo-600 hover:bg-indigo-700">Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
    </div>
  );
}
