'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ListTodo, ChevronDown, ChevronRight, Plus, Search,
  Layers, BookOpen, CheckSquare, Edit2, Trash2,
  Calendar, Clock, MoreVertical, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { safeFetch } from '@/lib/fetch-with-timeout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import { useItemFormData } from '@/hooks/useItemFormData';
import ItemFormDialog from '@/components/ItemFormDialog';

export default function BacklogPage() {
  const { confirm } = useConfirmation();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEpics, setExpandedEpics] = useState({});

  // États du formulaire unifié
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState('Épic');
  const [parentItem, setParentItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

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
    refresh: refreshFormData,
    reloadProjectData
  } = useItemFormData({
    projectId: selectedProject !== 'all' ? selectedProject : null,
    loadProjects: true,
    loadUsers: true,
    loadSprints: true,
    loadDeliverables: false,
    onUnauthorized: handleUnauthorized
  });

  const permissions = useRBACPermissions(user);
  const canManageTasks = permissions.hasPermission;

  // Charger les tâches du projet sélectionné
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Charger l'utilisateur et les tâches
      const projectFilter = selectedProject !== 'all' ? `?projet_id=${selectedProject}` : '';

      const [userData, tasksData] = await Promise.all([
        safeFetch('/api/auth/me', token),
        safeFetch(`/api/tasks${projectFilter}&limit=100&page=1`, token)
      ]);

      setUser(userData);

      // Vérification du format de réponse API
      const tasksList = tasksData?.data || tasksData?.tasks || [];
      if (!Array.isArray(tasksList)) {
        console.error('Format de réponse invalide pour les tâches:', tasksData);
        toast.error('Format de données invalide');
        setTasks([]);
      } else {
        setTasks(tasksList);

        // Expand all epics by default
        const epicsList = tasksList.filter(t => t.type === 'Épic');
        const expanded = {};
        epicsList.forEach(e => expanded[e._id] = true);
        setExpandedEpics(expanded);
      }
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') {
        router.push('/login');
      } else if (error.message === 'TIMEOUT') {
        toast.error('Chargement dépassé - Veuillez recharger');
      } else {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement du backlog');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedProject, router]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Auto-select first project on initial load
  useEffect(() => {
    if (projects.length > 0 && selectedProject === 'all') {
      setSelectedProject(projects[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  // Callback après création/modification réussie
  const handleFormSuccess = useCallback(async () => {
    await loadTasks();
    refreshFormData();
    setEditingItem(null);
    setParentItem(null);
  }, [loadTasks, refreshFormData]);

  const handleDelete = async (item) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'élément',
      description: `Êtes-vous sûr de vouloir supprimer "${item.titre}" ?`,
      actionLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/tasks/${item._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Supprimé avec succès');
        await loadTasks();
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleAssignToSprint = async (taskId, sprintId) => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sprint_id: sprintId })
      });

      if (response.ok) {
        toast.success('Assigné au sprint');
        await loadTasks();
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const openCreateDialog = (type, parent = null) => {
    setEditingItem(null);
    setCreateType(type);
    setParentItem(parent);
    setCreateDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setCreateType(item.type || 'Tâche');
    setParentItem(null);
    setCreateDialogOpen(true);
  };

  const toggleEpic = (epicId) => {
    setExpandedEpics(prev => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'Critique': return <ArrowUp className="w-4 h-4 text-red-600" />;
      case 'Haute': return <ArrowUp className="w-4 h-4 text-orange-500" />;
      case 'Moyenne': return <Minus className="w-4 h-4 text-yellow-500" />;
      case 'Basse': return <ArrowDown className="w-4 h-4 text-green-500" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Épic': return <Layers className="w-4 h-4 text-purple-600" />;
      case 'Story': return <BookOpen className="w-4 h-4 text-blue-600" />;
      default: return <CheckSquare className="w-4 h-4 text-green-600" />;
    }
  };

  // Organiser les tâches en hiérarchie (pour l'affichage)
  const displayEpics = tasks.filter(t => t.type === 'Épic');
  const displayStories = tasks.filter(t => t.type === 'Story');
  const regularTasks = tasks.filter(t => t.type === 'Tâche' || t.type === 'Bug' || !t.type);
  const backlogTasks = regularTasks.filter(t => !t.sprint_id);

  // Stats
  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const completedPoints = tasks.filter(t => t.statut === 'Terminé').reduce((sum, t) => sum + (t.story_points || 0), 0);

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Backlog</h1>
          <p className="text-gray-600 text-sm lg:text-base">Gérez vos Epics, Stories et Tâches</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sélectionner un projet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les projets</SelectItem>
              {projects.map(p => (
                <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManageTasks('gererTaches') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => openCreateDialog('Épic')}>
                  <Layers className="w-4 h-4 mr-2 text-purple-600" />
                  Nouvel Épic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateDialog('Story')}>
                  <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
                  Nouvelle Story
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateDialog('Tâche')}>
                  <CheckSquare className="w-4 h-4 mr-2 text-green-600" />
                  Nouvelle Tâche
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Epics</p>
                <p className="text-2xl font-bold text-purple-600">{displayEpics.length}</p>
              </div>
              <Layers className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stories</p>
                <p className="text-2xl font-bold text-blue-600">{displayStories.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tâches Backlog</p>
                <p className="text-2xl font-bold text-gray-900">{backlogTasks.length}</p>
              </div>
              <CheckSquare className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Points</p>
                <p className="text-2xl font-bold text-indigo-600">{completedPoints}/{totalPoints}</p>
              </div>
              <Clock className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher dans le backlog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Epics List */}
      <div className="space-y-4">
        {displayEpics.length === 0 && displayStories.length === 0 && backlogTasks.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <ListTodo className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Backlog vide</h3>
              <p className="text-gray-600 mb-4">Commencez par créer votre premier Épic</p>
              {canManageTasks('gererTaches') && (
                <Button onClick={() => openCreateDialog('Épic')} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un Épic
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <>
            {/* Epics avec leurs stories et tâches */}
            {displayEpics.filter(e => e.titre?.toLowerCase().includes(searchTerm.toLowerCase()) || !searchTerm).map((epic) => {
              const epicStories = displayStories.filter(s => s.parent_id === epic._id);
              const epicTasks = regularTasks.filter(t => t.parent_id === epic._id);
              const epicPoints = [...epicStories, ...epicTasks].reduce((sum, t) => sum + (t.story_points || 0), 0);
              
              return (
                <Card key={epic._id} className="overflow-hidden">
                  <Collapsible open={expandedEpics[epic._id]} onOpenChange={() => toggleEpic(epic._id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {expandedEpics[epic._id] ? 
                              <ChevronDown className="w-5 h-5 text-gray-500" /> : 
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            }
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Layers className="w-5 h-5 text-purple-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{epic.titre}</CardTitle>
                              {getPriorityIcon(epic.priorité)}
                            </div>
                            <CardDescription>{epic.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium">{epicStories.length + epicTasks.length} items</p>
                              <p className="text-xs text-gray-500">{epicPoints} points</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canManageTasks('gererTaches') && (
                                  <>
                                    <DropdownMenuItem onClick={() => openCreateDialog('Story', epic)}>
                                      <Plus className="w-4 h-4 mr-2" />
                                      Ajouter Story
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openCreateDialog('Tâche', epic)}>
                                      <Plus className="w-4 h-4 mr-2" />
                                      Ajouter Tâche
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => openEditDialog(epic)}>
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(epic)} className="text-red-600">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-2">
                        {/* Stories */}
                        {epicStories.map((story) => {
                          const storyTasks = regularTasks.filter(t => t.parent_id === story._id);
                          return (
                            <div key={story._id} className="ml-8 p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <BookOpen className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium">{story.titre}</span>
                                  {getPriorityIcon(story.priorité)}
                                  {story.story_points && (
                                    <Badge variant="outline">{story.story_points} pts</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{story.statut || 'À faire'}</Badge>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {canManageTasks('gererTaches') && (
                                        <DropdownMenuItem onClick={() => openCreateDialog('Tâche', story)}>
                                          <Plus className="w-4 h-4 mr-2" />
                                          Ajouter Tâche
                                        </DropdownMenuItem>
                                      )}
                                      {sprints.length > 0 && canManageTasks('gererTaches') && (
                                        <>
                                          <DropdownMenuSeparator />
                                          {sprints.map(sprint => (
                                            <DropdownMenuItem
                                              key={sprint._id}
                                              onClick={() => handleAssignToSprint(story._id, sprint._id)}
                                            >
                                              <Calendar className="w-4 h-4 mr-2" />
                                              Ajouter au {sprint.nom}
                                            </DropdownMenuItem>
                                          ))}
                                        </>
                                      )}
                                      {canManageTasks('gererTaches') && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => openEditDialog(story)}>
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            Modifier
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDelete(story)} className="text-red-600">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Supprimer
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              {/* Story tasks */}
                              {storyTasks.length > 0 && (
                                <div className="mt-2 ml-6 space-y-1">
                                  {storyTasks.map(task => (
                                    <div key={task._id} className="flex items-center justify-between p-2 bg-white rounded border">
                                      <div className="flex items-center gap-2">
                                        <CheckSquare className="w-3 h-3 text-green-600" />
                                        <span className="text-sm">{task.titre}</span>
                                      </div>
                                      <Badge variant="outline" className="text-xs">{task.statut || 'À faire'}</Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* Direct Epic Tasks */}
                        {epicTasks.map((task) => (
                          <div key={task._id} className="ml-8 p-3 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CheckSquare className="w-4 h-4 text-green-600" />
                                <span className="font-medium">{task.titre}</span>
                                {getPriorityIcon(task.priorité)}
                                {task.story_points && (
                                  <Badge variant="outline">{task.story_points} pts</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{task.statut || 'À faire'}</Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {canManageTasks('gererTaches') && sprints.length > 0 && sprints.map(sprint => (
                                      <DropdownMenuItem
                                        key={sprint._id}
                                        onClick={() => handleAssignToSprint(task._id, sprint._id)}
                                      >
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Ajouter au {sprint.nom}
                                      </DropdownMenuItem>
                                    ))}
                                    {canManageTasks('gererTaches') && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                          <Edit2 className="w-4 h-4 mr-2" />
                                          Modifier
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(task)} className="text-red-600">
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Supprimer
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        ))}
                        {epicStories.length === 0 && epicTasks.length === 0 && (
                          <div className="ml-8 p-6 text-center text-gray-500 bg-gray-50 rounded-lg">
                            <p>Aucun item dans cet Epic</p>
                            <Button 
                              variant="link" 
                              className="mt-2"
                              onClick={() => openCreateDialog('Story', epic)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Ajouter une Story
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}

            {/* Orphan Stories (sans Epic) */}
            {displayStories.filter(s => !s.parent_id && (s.titre?.toLowerCase().includes(searchTerm.toLowerCase()) || !searchTerm)).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Stories (sans Epic)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {displayStories.filter(s => !s.parent_id).map((story) => (
                    <div key={story._id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{story.titre}</span>
                          {getPriorityIcon(story.priorité)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{story.statut || 'À faire'}</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(story)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Orphan Tasks (sans parent Epic/Story, sans sprint) */}
            {backlogTasks.filter(t => !t.parent_id && (t.titre?.toLowerCase().includes(searchTerm.toLowerCase()) || !searchTerm)).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Tâches Backlog (sans sprint)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {backlogTasks.filter(t => !t.parent_id).map((task) => (
                    <div key={task._id} className="p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{task.titre}</span>
                          {getPriorityIcon(task.priorité)}
                          {task.story_points && (
                            <Badge variant="outline">{task.story_points} pts</Badge>
                          )}
                          {task.assigné_à && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {task.assigné_à.nom_complet || task.assigné_à.email || 'Assigné'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{task.statut || 'À faire'}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canManageTasks('gererTaches') && sprints.map(sprint => (
                                <DropdownMenuItem
                                  key={sprint._id}
                                  onClick={() => handleAssignToSprint(task._id, sprint._id)}
                                >
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Ajouter au {sprint.nom}
                                </DropdownMenuItem>
                              ))}
                              {canManageTasks('gererTaches') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(task)} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Formulaire unifié de création/édition */}
      <ItemFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        type={createType}
        editingItem={editingItem}
        parentItem={parentItem}
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
        showTypeSelect={false}
        showParentSelect={true}
      />
    </div>
  );
}
