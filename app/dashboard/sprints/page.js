'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Plus, Play, CheckCircle, Calendar, BarChart3, TrendingUp, ChevronDown, ChevronUp, Target, Clock, Activity, ListTodo, User, Check, X, Edit2, Trash2, FolderKanban } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import BurndownChart from '@/components/charts/BurndownChart';
import VelocityChart from '@/components/charts/VelocityChart';
import { useFormatters, useTranslation } from '@/contexts/AppSettingsContext';

export default function SprintsPage() {
  const router = useRouter();
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
    capacité_équipe: ''
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
  const getSprintTasks = useCallback((sprintId) => {
    if (!sprintId || !tasks.length) return [];
    return tasks.filter(t => {
      const taskSprintId = t.sprint_id?._id || t.sprint_id;
      return compareIds(taskSprintId, sprintId);
    });
  }, [tasks, compareIds]);

  // Memoize grouped sprints by project (for future use with project filtering)
  const _sprintsByProject = useMemo(() => {
    const grouped = {};
    sprints.forEach(sprint => {
      if (!grouped[sprint.projet_id]) {
        grouped[sprint.projet_id] = [];
      }
      grouped[sprint.projet_id].push(sprint);
    });
    return grouped;
  }, [sprints]);

  // Calcul des statistiques globales des sprints
  const globalStats = useMemo(() => {
    const completedSprints = sprints.filter(s => s.statut === 'Terminé');
    const activeSprints = sprints.filter(s => s.statut === 'Actif');
    const plannedSprints = sprints.filter(s => s.statut === 'Planifié');

    // Calculer les story points depuis les sprints et les tâches
    let totalPlanned = 0;
    let totalCompleted = 0;

    sprints.forEach(sprint => {
      const sprintTasks = getSprintTasks(sprint._id);
      const planned = sprint.story_points_planifiés || sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
      const completed = sprint.story_points_complétés !== undefined
        ? sprint.story_points_complétés
        : sprintTasks.filter(t => t.statut === 'Terminé').reduce((sum, t) => sum + (t.story_points || 0), 0);

      totalPlanned += planned;
      totalCompleted += completed;
    });

    // Vélocité moyenne (sur les sprints terminés uniquement)
    const avgVelocity = completedSprints.length > 0
      ? Math.round(completedSprints.reduce((sum, s) => {
          const sprintTasks = getSprintTasks(s._id);
          return sum + (s.velocity || s.story_points_complétés || sprintTasks.filter(t => t.statut === 'Terminé').reduce((acc, t) => acc + (t.story_points || 0), 0));
        }, 0) / completedSprints.length)
      : 0;

    // Taux d'engagement moyen
    const engagementRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

    return {
      total: sprints.length,
      completed: completedSprints.length,
      active: activeSprints.length,
      planned: plannedSprints.length,
      totalPlanned,
      totalCompleted,
      avgVelocity,
      engagementRate
    };
  }, [sprints, getSprintTasks]);

  /**
   * Extrait les données d'une réponse API de manière sécurisée
   */
  const extractApiData = useCallback((response, keys = ['data']) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    for (const key of keys) {
      if (response[key] && Array.isArray(response[key])) {
        return response[key];
      }
    }
    return [];
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Load user
      const userRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });

      if (!userRes.ok) {
        if (userRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load user');
      }

      const userData = await userRes.json();
      setUser(userData);

      // Load projects first (faster)
      const projectsRes = await fetch('/api/projects?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });

      if (!projectsRes.ok) {
        toast.error(t('errorOccurred'));
      } else {
        const projectsData = await projectsRes.json();
        // Vérification sécurisée du format de réponse API
        const projectsList = extractApiData(projectsData, ['data', 'projects']);
        if (!Array.isArray(projectsList)) {
          console.error('Format de réponse invalide pour les projets:', projectsData);
          setProjects([]);
        } else {
          setProjects(projectsList);
        }
      }

      // Load sprints with a limit for faster initial load
      const sprintsRes = await fetch('/api/sprints?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });

      let sprintsList = [];
      if (!sprintsRes.ok) {
        toast.error(t('errorOccurred'));
      } else {
        const sprintsData = await sprintsRes.json();
        // Vérification sécurisée du format de réponse API
        sprintsList = extractApiData(sprintsData, ['sprints', 'data']);
        if (!Array.isArray(sprintsList)) {
          console.error('Format de réponse invalide pour les sprints:', sprintsData);
          sprintsList = [];
        }
        setSprints(sprintsList);
      }

      // Load tasks for burndown/velocity charts
      const tasksRes = await fetch('/api/tasks?limit=500', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(10000)
      });

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        // Vérification sécurisée du format de réponse API
        const tasksList = extractApiData(tasksData, ['data', 'tasks']);
        if (!Array.isArray(tasksList)) {
          console.error('Format de réponse invalide pour les tâches:', tasksData);
          setTasks([]);
        } else {
          setTasks(tasksList);
        }
      }

      // Auto-select active sprint for burndown chart
      const activeSprint = sprintsList.find(s => s.statut === 'Actif');
      if (activeSprint) {
        setSelectedSprintForChart(activeSprint._id);
      } else if (sprintsList.length > 0) {
        setSelectedSprintForChart(sprintsList[0]._id);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      if (error.name !== 'AbortError') {
        toast.error(t('errorOccurred'));
      }
      setLoading(false);
    }
  }, [router, extractApiData]);

  useEffect(() => {
    const initLoad = async () => {
      await loadData();
    };
    initLoad();
  }, [loadData]);

  const handleCreateSprint = useCallback(async () => {
    if (!newSprint.nom || !newSprint.projet_id || !newSprint.date_début || !newSprint.date_fin) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setCreatingSprint(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSprint),
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('sprintCreated'));
        setCreateDialogOpen(false);
        setNewSprint({ projet_id: '', nom: '', objectif: '', date_début: '', date_fin: '', capacité_équipe: '' });
        await loadData();
      } else {
        toast.error(data.error || t('errorOccurred'));
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erreur:', error);
        toast.error(t('connectionError'));
      }
    } finally {
      setCreatingSprint(false);
    }
  }, [newSprint, loadData]);

  const handleStartSprint = useCallback(async (sprintId) => {
    setStartingSprintId(sprintId);
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        toast.error(t('unauthorized'));
        setStartingSprintId(null);
        return;
      }

      const response = await fetch(`/api/sprints/${sprintId}/start`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      console.log('Sprint start response:', { status: response.status, data });

      if (response.ok) {
        toast.success(t('sprintStarted'));
        setSprints(prev => prev.map(s => s._id === sprintId ? { ...s, statut: 'Actif' } : s));
      } else {
        const errorMessage = data.error || data.message || t('errorOccurred');
        console.error('Sprint start error:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Sprint start exception:', error);
        toast.error(t('connectionError'));
      }
    } finally {
      setStartingSprintId(null);
    }
  }, []);

  const handleCompleteSprint = useCallback(async (sprintId) => {
    const confirmed = await confirm({
      title: t('endSprint'),
      description: t('confirmAction'),
      actionLabel: t('endSprint'),
      cancelLabel: t('cancel')
    });
    if (!confirmed) return;

    setCompletingSprintId(sprintId);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/sprints/${sprintId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('sprintEnded'));
        setSprints(prev => prev.map(s => s._id === sprintId ? { ...s, statut: 'Terminé' } : s));
      } else {
        const errorMessage = data.error || data.message || 'Erreur lors de la terminaison';
        toast.error(errorMessage);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erreur:', error);
        toast.error(t('connectionError'));
      }
    } finally {
      setCompletingSprintId(null);
    }
  }, [confirm]);

  // Ouvrir le dialog de gestion des tâches pour un sprint
  const openManageTasksDialog = useCallback(async (sprint) => {
    setSelectedSprintForTasks(sprint);
    setManageTasksDialogOpen(true);

    // Charger les tâches disponibles (du même projet, sans sprint ou du sprint actuel)
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/tasks?projet_id=${sprint.projet_id?._id || sprint.projet_id}&limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        const tasksList = data.data || data.tasks || [];
        // Filtrer: tâches sans sprint OU tâches de ce sprint
        const available = tasksList.filter(t => !t.sprint_id || t.sprint_id === sprint._id);
        setAvailableTasks(available);
      }
    } catch (error) {
      console.error('Erreur chargement tâches:', error);
    }
  }, []);

  // Assigner/retirer une tâche d'un sprint
  const handleToggleTaskInSprint = useCallback(async (taskId, addToSprint) => {
    if (!selectedSprintForTasks) return;

    setAssigningTask(taskId);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sprint_id: addToSprint ? selectedSprintForTasks._id : null
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        // Mettre à jour les listes locales
        setTasks(prev => prev.map(t =>
          t._id === taskId ? { ...t, sprint_id: addToSprint ? selectedSprintForTasks._id : null } : t
        ));
        setAvailableTasks(prev => prev.map(t =>
          t._id === taskId ? { ...t, sprint_id: addToSprint ? selectedSprintForTasks._id : null } : t
        ));
        toast.success(t('savedSuccessfully'));
      } else {
        const data = await response.json();
        toast.error(data.error || t('errorOccurred'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(t('connectionError'));
    } finally {
      setAssigningTask(null);
    }
  }, [selectedSprintForTasks]);

  // Helper pour obtenir le nom du projet
  const getProjectName = useCallback((projectId) => {
    if (!projectId) return t('unassigned');
    const id = projectId?._id || projectId;
    const project = projects.find(p => compareIds(p._id, id));
    return project?.nom || t('project');
  }, [projects, compareIds]);

  // Ouvrir le dialogue de modification
  const openEditDialog = useCallback((sprint) => {
    setEditingSprint({
      _id: sprint._id,
      nom: sprint.nom || '',
      objectif: sprint.objectif || '',
      projet_id: sprint.projet_id?._id || sprint.projet_id || '',
      date_début: sprint.date_début ? new Date(sprint.date_début).toISOString().split('T')[0] : '',
      date_fin: sprint.date_fin ? new Date(sprint.date_fin).toISOString().split('T')[0] : '',
      capacité_équipe: sprint.capacité_équipe || ''
    });
    setEditDialogOpen(true);
  }, []);

  // Sauvegarder les modifications du sprint
  const handleSaveSprint = useCallback(async () => {
    if (!editingSprint) return;

    setSavingSprint(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/sprints/${editingSprint._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nom: editingSprint.nom,
          objectif: editingSprint.objectif,
          date_début: editingSprint.date_début,
          date_fin: editingSprint.date_fin,
          capacité_équipe: editingSprint.capacité_équipe ? Number(editingSprint.capacité_équipe) : null
        }),
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('sprintUpdated'));
        setSprints(prev => prev.map(s =>
          s._id === editingSprint._id
            ? { ...s, ...editingSprint }
            : s
        ));
        setEditDialogOpen(false);
        setEditingSprint(null);
      } else {
        toast.error(data.error || t('errorOccurred'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(t('connectionError'));
    } finally {
      setSavingSprint(false);
    }
  }, [editingSprint]);

  // Supprimer un sprint
  const handleDeleteSprint = useCallback(async (sprintId, sprintName) => {
    const confirmed = await confirm({
      title: t('delete'),
      description: `${t('confirmDelete')} "${sprintName}" ? ${t('deleteWarning')}`,
      actionLabel: t('delete'),
      cancelLabel: t('cancel'),
      variant: 'destructive'
    });

    if (!confirmed) return;

    setDeletingSprintId(sprintId);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        toast.success(t('sprintDeleted'));
        setSprints(prev => prev.filter(s => s._id !== sprintId));
      } else {
        const data = await response.json();
        toast.error(data.error || t('errorOccurred'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(t('connectionError'));
    } finally {
      setDeletingSprintId(null);
    }
  }, [confirm]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('sprintManagement')}</h1>
          <p className="text-gray-600">Planifiez et suivez vos sprints Agile</p>
        </div>
        {canManageSprints('gererSprints') && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('createSprint')}
          </Button>
        )}
      </div>

      {/* Global Stats Section */}
      {sprints.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Sprints</p>
                  <p className="text-2xl font-bold text-gray-900">{globalStats.total}</p>
                </div>
                <Zap className="w-8 h-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Actifs</p>
                  <p className="text-2xl font-bold text-blue-600">{globalStats.active}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Terminés</p>
                  <p className="text-2xl font-bold text-green-600">{globalStats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Vélocité Moy.</p>
                  <p className="text-2xl font-bold text-purple-600">{globalStats.avgVelocity}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Story Points</p>
                  <p className="text-2xl font-bold text-orange-600">{globalStats.totalCompleted}<span className="text-sm text-gray-400">/{globalStats.totalPlanned}</span></p>
                </div>
                <Target className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Engagement</p>
                  <p className={`text-2xl font-bold ${globalStats.engagementRate >= 80 ? 'text-green-600' : globalStats.engagementRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {globalStats.engagementRate}%
                  </p>
                </div>
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {sprints.length > 0 && (
        <div className="mb-8">
          <div
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => setShowCharts(!showCharts)}
          >
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Métriques Agile
            </h2>
            <Button variant="ghost" size="sm">
              {showCharts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {showCharts && (
            <Tabs defaultValue="velocity" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="velocity" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Vélocité
                </TabsTrigger>
                <TabsTrigger value="burndown" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Burndown Chart
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Performance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="velocity">
                <VelocityChart sprints={sprints} tasks={tasks} />
              </TabsContent>

              <TabsContent value="burndown">
                <div className="mb-4">
                  <Select
                    value={selectedSprintForChart || ''}
                    onValueChange={setSelectedSprintForChart}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Sélectionner un sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les sprints</SelectItem>
                      {sprints.map(s => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.nom} ({s.statut})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedSprintForChart === 'all' ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-gray-500 py-8">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Sélectionnez un sprint spécifique pour voir son burndown chart</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <BurndownChart
                    sprint={sprints.find(s => s._id === selectedSprintForChart)}
                    tasks={tasks}
                  />
                )}
              </TabsContent>

              <TabsContent value="performance">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600" />
                      Performance globale des sprints
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Taux de réussite par sprint */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-4">Taux de complétion par sprint</h4>
                        <div className="space-y-3">
                          {sprints.filter(s => s.statut === 'Terminé' || s.statut === 'Actif').slice(-5).map(sprint => {
                            const sprintTasks = getSprintTasks(sprint._id);
                            const planned = sprint.story_points_planifiés || sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
                            const completed = sprint.story_points_complétés !== undefined
                              ? sprint.story_points_complétés
                              : sprintTasks.filter(t => t.statut === 'Terminé').reduce((sum, t) => sum + (t.story_points || 0), 0);
                            const percent = planned > 0 ? Math.round((completed / planned) * 100) : 0;

                            return (
                              <div key={sprint._id} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-700">{sprint.nom}</span>
                                  <span className={`font-medium ${percent >= 80 ? 'text-green-600' : percent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {percent}%
                                  </span>
                                </div>
                                <Progress value={percent} className="h-2" />
                              </div>
                            );
                          })}
                          {sprints.filter(s => s.statut === 'Terminé' || s.statut === 'Actif').length === 0 && (
                            <p className="text-gray-500 text-sm">Aucun sprint terminé ou actif</p>
                          )}
                        </div>
                      </div>

                      {/* Statistiques de performance */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-4">Métriques clés</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">Vélocité moyenne</span>
                            <span className="text-xl font-bold text-indigo-600">{globalStats.avgVelocity} pts/sprint</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">Taux d'engagement global</span>
                            <span className={`text-xl font-bold ${globalStats.engagementRate >= 80 ? 'text-green-600' : globalStats.engagementRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {globalStats.engagementRate}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">Sprints réussis (&ge;80%)</span>
                            <span className="text-xl font-bold text-green-600">
                              {sprints.filter(s => {
                                if (s.statut !== 'Terminé') return false;
                                const sprintTasks = getSprintTasks(s._id);
                                const planned = s.story_points_planifiés || sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
                                const completed = s.story_points_complétés !== undefined ? s.story_points_complétés : sprintTasks.filter(t => t.statut === 'Terminé').reduce((sum, t) => sum + (t.story_points || 0), 0);
                                return planned > 0 && (completed / planned) >= 0.8;
                              }).length}/{globalStats.completed}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">Total story points livrés</span>
                            <span className="text-xl font-bold text-purple-600">{globalStats.totalCompleted} pts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      {/* Sprints List */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-indigo-600" />
        Liste des Sprints
      </h2>

      {sprints.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('noSprints')}</h3>
            <p className="text-gray-600 mb-4">Créez votre premier sprint pour commencer</p>
            {canManageSprints('gererSprints') && (
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                {t('createSprint')}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sprints.map((sprint, idx) => {
            // Calculer les stats pour ce sprint avec comparaison d'ID correcte
            const sprintTasks = getSprintTasks(sprint._id);
            const plannedPoints = sprint.story_points_planifiés || sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
            const completedPoints = sprint.story_points_complétés !== undefined
              ? sprint.story_points_complétés
              : sprintTasks.filter(t => t.statut === 'Terminé').reduce((sum, t) => sum + (t.story_points || 0), 0);
            const progressPercent = plannedPoints > 0 ? Math.round((completedPoints / plannedPoints) * 100) : 0;
            const velocity = sprint.velocity || completedPoints;
            const totalTasks = sprintTasks.length;
            const completedTasks = sprintTasks.filter(t => t.statut === 'Terminé').length;

            return (
              <motion.div
                key={sprint._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{sprint.nom}</CardTitle>
                        {/* Projet associé */}
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <FolderKanban className="w-3 h-3" />
                          <span className="truncate">{getProjectName(sprint.projet_id)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={sprint.statut === 'Actif' ? 'default' : sprint.statut === 'Terminé' ? 'secondary' : 'outline'}
                          className={sprint.statut === 'Actif' ? 'bg-blue-600' : sprint.statut === 'Terminé' ? 'bg-green-600 text-white' : ''}
                        >
                          {sprint.statut}
                        </Badge>
                        {/* Boutons Modifier/Supprimer */}
                        {canManageSprints('gererSprints') && sprint.statut !== 'Terminé' && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-gray-500 hover:text-indigo-600"
                              onClick={() => openEditDialog(sprint)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-gray-500 hover:text-red-600"
                              onClick={() => handleDeleteSprint(sprint._id, sprint.nom)}
                              disabled={deletingSprintId === sprint._id}
                            >
                              {deletingSprintId === sprint._id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {sprint.objectif && (
                      <CardDescription className="line-clamp-2 mt-2">{sprint.objectif}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Dates */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(sprint.date_début)} - {formatDate(sprint.date_fin)}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Progression</span>
                          <span className={`font-medium ${progressPercent >= 80 ? 'text-green-600' : progressPercent >= 50 ? 'text-yellow-600' : 'text-gray-600'}`}>
                            {progressPercent}%
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                        <div className="text-center">
                          <p className="text-lg font-bold text-indigo-600">{completedPoints}<span className="text-xs text-gray-400">/{plannedPoints}</span></p>
                          <p className="text-xs text-gray-500">Story Points</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">{completedTasks}<span className="text-xs text-gray-400">/{totalTasks}</span></p>
                          <p className="text-xs text-gray-500">Tâches</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-purple-600">{velocity}</p>
                          <p className="text-xs text-gray-500">Vélocité</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 pt-2">
                        <div className="flex gap-2">
                          {canManageSprints('gererSprints') && sprint.statut === 'Planifié' && (
                            <Button
                              size="sm"
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => handleStartSprint(sprint._id)}
                              disabled={startingSprintId === sprint._id}
                            >
                              {startingSprintId === sprint._id ? (
                                <>
                                  <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Démarrage...
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-1" />
                                  {t('startSprint')}
                                </>
                              )}
                            </Button>
                          )}
                          {canManageSprints('gererSprints') && sprint.statut === 'Actif' && (
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleCompleteSprint(sprint._id)}
                              disabled={completingSprintId === sprint._id}
                            >
                              {completingSprintId === sprint._id ? (
                                <>
                                  <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Finalisation...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  {t('endSprint')}
                                </>
                              )}
                            </Button>
                          )}
                          {sprint.statut === 'Terminé' && (
                            <div className="flex-1 text-center py-2">
                              <span className="text-sm text-green-600 font-medium flex items-center justify-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                {t('completed')}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Bouton pour gérer les tâches du sprint */}
                        {canManageSprints('gererSprints') && sprint.statut !== 'Terminé' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => openManageTasksDialog(sprint)}
                          >
                            <ListTodo className="w-4 h-4 mr-1" />
                            Gérer les tâches ({totalTasks})
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un nouveau sprint</DialogTitle>
            <DialogDescription>Définissez les paramètres de votre sprint</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nom du sprint *</Label>
                <Input
                  value={newSprint.nom}
                  onChange={(e) => setNewSprint({ ...newSprint, nom: e.target.value })}
                  placeholder="Sprint 1"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Projet *</Label>
                <Select value={newSprint.projet_id} onValueChange={(val) => setNewSprint({ ...newSprint, projet_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Objectif</Label>
                <Textarea
                  value={newSprint.objectif}
                  onChange={(e) => setNewSprint({ ...newSprint, objectif: e.target.value })}
                  placeholder="Objectif du sprint..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de début *</Label>
                <Input
                  type="date"
                  value={newSprint.date_début}
                  onChange={(e) => setNewSprint({ ...newSprint, date_début: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin *</Label>
                <Input
                  type="date"
                  value={newSprint.date_fin}
                  onChange={(e) => setNewSprint({ ...newSprint, date_fin: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Capacité équipe (heures)</Label>
                <Input
                  type="number"
                  value={newSprint.capacité_équipe}
                  onChange={(e) => setNewSprint({ ...newSprint, capacité_équipe: e.target.value })}
                  placeholder="80"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creatingSprint}>{t('cancel')}</Button>
            <Button onClick={handleCreateSprint} disabled={creatingSprint} className="bg-indigo-600 hover:bg-indigo-700">
              {creatingSprint ? 'Création...' : 'Créer le sprint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Tasks Dialog */}
      <Dialog open={manageTasksDialogOpen} onOpenChange={(open) => {
        setManageTasksDialogOpen(open);
        if (!open) {
          setSelectedSprintForTasks(null);
          setAvailableTasks([]);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-indigo-600" />
              Gérer les tâches - {selectedSprintForTasks?.nom}
            </DialogTitle>
            <DialogDescription>
              Ajoutez ou retirez des tâches de ce sprint. Seules les tâches du même projet sont affichées.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {availableTasks.length === 0 ? (
              <div className="text-center py-12">
                <ListTodo className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">Aucune tâche disponible pour ce projet</p>
                <p className="text-sm text-gray-400 mt-1">Créez des tâches dans le projet pour les ajouter au sprint</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Tâches dans le sprint */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Dans le sprint ({availableTasks.filter(t => compareIds(t.sprint_id?._id || t.sprint_id, selectedSprintForTasks?._id)).length})
                  </h4>
                  <div className="space-y-2">
                    {availableTasks.filter(t => compareIds(t.sprint_id?._id || t.sprint_id, selectedSprintForTasks?._id)).map(task => (
                      <div
                        key={task._id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{task.titre}</span>
                            <Badge variant="outline" className="text-xs">
                              {task.story_points || 0} pts
                            </Badge>
                            <Badge
                              variant={task.statut === 'Terminé' ? 'secondary' : 'default'}
                              className={`text-xs ${task.statut === 'Terminé' ? 'bg-green-600 text-white' : ''}`}
                            >
                              {task.statut}
                            </Badge>
                          </div>
                          {task.assigné_à && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <User className="w-3 h-3" />
                              {task.assigné_à.nom_complet || task.assigné_à.email || 'Assigné'}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleToggleTaskInSprint(task._id, false)}
                          disabled={assigningTask === task._id}
                        >
                          {assigningTask === task._id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                    {availableTasks.filter(t => compareIds(t.sprint_id?._id || t.sprint_id, selectedSprintForTasks?._id)).length === 0 && (
                      <p className="text-sm text-gray-400 italic p-3 bg-gray-50 rounded-lg">
                        Aucune tâche dans ce sprint
                      </p>
                    )}
                  </div>
                </div>

                {/* Tâches disponibles (sans sprint) */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-gray-500" />
                    Disponibles ({availableTasks.filter(t => !t.sprint_id).length})
                  </h4>
                  <div className="space-y-2">
                    {availableTasks.filter(t => !t.sprint_id).map(task => (
                      <div
                        key={task._id}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{task.titre}</span>
                            <Badge variant="outline" className="text-xs">
                              {task.story_points || 0} pts
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {task.statut}
                            </Badge>
                          </div>
                          {task.assigné_à && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <User className="w-3 h-3" />
                              {task.assigné_à.nom_complet || task.assigné_à.email || 'Assigné'}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => handleToggleTaskInSprint(task._id, true)}
                          disabled={assigningTask === task._id}
                        >
                          {assigningTask === task._id ? (
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                    {availableTasks.filter(t => !t.sprint_id).length === 0 && (
                      <p className="text-sm text-gray-400 italic p-3 bg-gray-50 rounded-lg">
                        Toutes les tâches sont assignées à des sprints
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageTasksDialogOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sprint Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingSprint(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-600" />
              Modifier le sprint
            </DialogTitle>
            <DialogDescription>
              Modifiez les informations du sprint. Le projet ne peut pas être changé.
            </DialogDescription>
          </DialogHeader>
          {editingSprint && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nom du sprint *</Label>
                  <Input
                    value={editingSprint.nom}
                    onChange={(e) => setEditingSprint({ ...editingSprint, nom: e.target.value })}
                    placeholder="Sprint 1"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Projet</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                    <FolderKanban className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{getProjectName(editingSprint.projet_id)}</span>
                    <Badge variant="outline" className="ml-auto text-xs">Non modifiable</Badge>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Objectif</Label>
                  <Textarea
                    value={editingSprint.objectif}
                    onChange={(e) => setEditingSprint({ ...editingSprint, objectif: e.target.value })}
                    placeholder="Objectif du sprint..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de début *</Label>
                  <Input
                    type="date"
                    value={editingSprint.date_début}
                    onChange={(e) => setEditingSprint({ ...editingSprint, date_début: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin *</Label>
                  <Input
                    type="date"
                    value={editingSprint.date_fin}
                    onChange={(e) => setEditingSprint({ ...editingSprint, date_fin: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Capacité équipe (heures)</Label>
                  <Input
                    type="number"
                    value={editingSprint.capacité_équipe}
                    onChange={(e) => setEditingSprint({ ...editingSprint, capacité_équipe: e.target.value })}
                    placeholder="80"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={savingSprint}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveSprint} disabled={savingSprint || !editingSprint?.nom} className="bg-indigo-600 hover:bg-indigo-700">
              {savingSprint ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
