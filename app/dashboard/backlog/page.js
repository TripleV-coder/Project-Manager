'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ListTodo, ChevronDown, ChevronRight, Plus, Search, Filter,
  Layers, BookOpen, CheckSquare, GripVertical, Edit2, Trash2,
  Calendar, User, Clock, MoreVertical, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { safeFetch } from '@/lib/fetch-with-timeout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';

export default function BacklogPage() {
  const { confirm } = useConfirmation();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEpics, setExpandedEpics] = useState({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState('epic'); // epic, story, task
  const [parentItem, setParentItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    type: 'epic',
    priorité: 'Moyenne',
    estimation_points: '',
    assigné_à: '',
    sprint_id: '',
    date_échéance: ''
  });

  const { hasPermission: canManageTasks } = user ? useRBACPermissions(user) : { hasPermission: () => false };

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  // Auto-select first project on initial load
  useEffect(() => {
    if (projects.length > 0 && selectedProject === 'all') {
      setSelectedProject(projects[0]._id);
    }
  }, [projects]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const projectFilter = selectedProject !== 'all' ? `?projet_id=${selectedProject}` : '';

      const [userData, projectsData, tasksData, sprintsData, usersData] = await Promise.all([
        safeFetch('/api/auth/me', token),
        safeFetch('/api/projects?limit=50&page=1', token),
        safeFetch(`/api/tasks${projectFilter}&limit=100&page=1`, token),
        safeFetch(`/api/sprints${projectFilter}`, token),
        safeFetch('/api/users?limit=100&page=1', token)
      ]);

      setUser(userData);
      setProjects(projectsData.projects || []);
      setTasks(tasksData.tasks || []);
      setSprints(sprintsData.sprints || []);
      setUsers(usersData.users || []);

      // Expand all epics by default
      const epics = (tasksData.tasks || []).filter(t => t.type === 'epic');
      const expanded = {};
      epics.forEach(e => expanded[e._id] = true);
      setExpandedEpics(expanded);

      setLoading(false);
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') {
        router.push('/login');
      } else if (error.message === 'TIMEOUT') {
        toast.error('Chargement dépassé - Veuillez recharger');
      } else {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement du backlog');
      }
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.titre.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    if (selectedProject === 'all') {
      toast.error('Veuillez sélectionner un projet');
      return;
    }

    try {
      const token = localStorage.getItem('pm_token');
      await safeFetch('/api/tasks', token, {
        method: 'POST',
        body: JSON.stringify({
          titre: formData.titre,
          description: formData.description,
          priorité: formData.priorité,
          estimation_points: formData.estimation_points ? parseInt(formData.estimation_points) : null,
          assigné_à: formData.assigné_à || null,
          sprint_id: formData.sprint_id || null,
          date_échéance: formData.date_échéance || null,
          projet_id: selectedProject,
          type: createType,
          parent_id: parentItem?._id || null
        })
      });

      toast.success(`${createType === 'epic' ? 'Épic' : createType === 'story' ? 'Story' : 'Tâche'} créé(e) avec succès`);
      setCreateDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') {
        router.push('/login');
      } else if (error.message === 'TIMEOUT') {
        toast.error('La requête a dépassé le délai');
      } else {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la création');
      }
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/tasks/${editingItem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          titre: formData.titre,
          description: formData.description,
          priorité: formData.priorité,
          estimation_points: formData.estimation_points ? parseInt(formData.estimation_points) : null,
          assigné_à: formData.assigné_à || null,
          sprint_id: formData.sprint_id || null,
          date_échéance: formData.date_échéance || null
        })
      });

      if (response.ok) {
        toast.success('Mis à jour avec succès');
        setEditingItem(null);
        setCreateDialogOpen(false);
        resetForm();
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

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
        await loadData();
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
        await loadData();
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const resetForm = () => {
    setFormData({
      titre: '',
      description: '',
      type: 'epic',
      priorité: 'Moyenne',
      estimation_points: '',
      assigné_à: '',
      sprint_id: '',
      date_échéance: ''
    });
    setParentItem(null);
    setEditingItem(null);
  };

  const openCreateDialog = (type, parent = null) => {
    resetForm();
    setCreateType(type);
    setParentItem(parent);
    setCreateDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      titre: item.titre || '',
      description: item.description || '',
      type: item.type || 'task',
      priorité: item.priorité || 'Moyenne',
      estimation_points: item.estimation_points?.toString() || '',
      assigné_à: item.assigné_à?._id || item.assigné_à || '',
      sprint_id: item.sprint_id || '',
      date_échéance: item.date_échéance ? item.date_échéance.split('T')[0] : ''
    });
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
      case 'epic': return <Layers className="w-4 h-4 text-purple-600" />;
      case 'story': return <BookOpen className="w-4 h-4 text-blue-600" />;
      default: return <CheckSquare className="w-4 h-4 text-green-600" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'epic': return <Badge className="bg-purple-100 text-purple-700">Epic</Badge>;
      case 'story': return <Badge className="bg-blue-100 text-blue-700">Story</Badge>;
      default: return <Badge className="bg-green-100 text-green-700">Tâche</Badge>;
    }
  };

  // Organiser les tâches en hiérarchie
  const epics = tasks.filter(t => t.type === 'epic');
  const stories = tasks.filter(t => t.type === 'story');
  const regularTasks = tasks.filter(t => t.type === 'task' || !t.type);
  const backlogTasks = regularTasks.filter(t => !t.sprint_id);

  // Stats
  const totalPoints = tasks.reduce((sum, t) => sum + (t.estimation_points || 0), 0);
  const completedPoints = tasks.filter(t => t.statut === 'Terminé').reduce((sum, t) => sum + (t.estimation_points || 0), 0);

  const filteredTasks = tasks.filter(t =>
    t.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <DropdownMenuItem onClick={() => openCreateDialog('epic')}>
                  <Layers className="w-4 h-4 mr-2 text-purple-600" />
                  Nouvel Epic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateDialog('story')}>
                  <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
                  Nouvelle Story
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateDialog('task')}>
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
                <p className="text-2xl font-bold text-purple-600">{epics.length}</p>
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
                <p className="text-2xl font-bold text-blue-600">{stories.length}</p>
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
        {epics.length === 0 && stories.length === 0 && backlogTasks.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <ListTodo className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Backlog vide</h3>
              <p className="text-gray-600 mb-4">Commencez par créer votre premier Epic</p>
              {canManageTasks('gererTaches') && (
                <Button onClick={() => openCreateDialog('epic')} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un Epic
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <>
            {/* Epics avec leurs stories et tâches */}
            {epics.filter(e => e.titre?.toLowerCase().includes(searchTerm.toLowerCase()) || !searchTerm).map((epic) => {
              const epicStories = stories.filter(s => s.parent_id === epic._id);
              const epicTasks = regularTasks.filter(t => t.parent_id === epic._id);
              const epicPoints = [...epicStories, ...epicTasks].reduce((sum, t) => sum + (t.estimation_points || 0), 0);
              
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
                                <DropdownMenuItem onClick={() => openCreateDialog('story', epic)}>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Ajouter Story
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openCreateDialog('task', epic)}>
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
                                  {story.estimation_points && (
                                    <Badge variant="outline">{story.estimation_points} pts</Badge>
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
                                      <DropdownMenuItem onClick={() => openCreateDialog('task', story)}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Ajouter Tâche
                                      </DropdownMenuItem>
                                      {sprints.length > 0 && (
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
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openEditDialog(story)}>
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Modifier
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDelete(story)} className="text-red-600">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Supprimer
                                      </DropdownMenuItem>
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
                                {task.estimation_points && (
                                  <Badge variant="outline">{task.estimation_points} pts</Badge>
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
                                    {sprints.length > 0 && sprints.map(sprint => (
                                      <DropdownMenuItem 
                                        key={sprint._id}
                                        onClick={() => handleAssignToSprint(task._id, sprint._id)}
                                      >
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Ajouter au {sprint.nom}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(task)} className="text-red-600">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Supprimer
                                    </DropdownMenuItem>
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
                              onClick={() => openCreateDialog('story', epic)}
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
            {stories.filter(s => !s.parent_id && (s.titre?.toLowerCase().includes(searchTerm.toLowerCase()) || !searchTerm)).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Stories (sans Epic)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stories.filter(s => !s.parent_id).map((story) => (
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

            {/* Orphan Tasks (sans parent) */}
            {backlogTasks.filter(t => !t.parent_id && (t.titre?.toLowerCase().includes(searchTerm.toLowerCase()) || !searchTerm)).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Tâches Backlog (non assignées)
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
                          {task.estimation_points && (
                            <Badge variant="outline">{task.estimation_points} pts</Badge>
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
                              {sprints.map(sprint => (
                                <DropdownMenuItem 
                                  key={sprint._id}
                                  onClick={() => handleAssignToSprint(task._id, sprint._id)}
                                >
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Ajouter au {sprint.nom}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(task)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
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

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) { resetForm(); setCreateDialogOpen(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTypeIcon(editingItem?.type || createType)}
              {editingItem ? 'Modifier' : 'Créer'} {createType === 'epic' ? 'un Epic' : createType === 'story' ? 'une Story' : 'une Tâche'}
            </DialogTitle>
            {parentItem && (
              <DialogDescription>
                Dans: {parentItem.titre}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                placeholder={`Titre ${createType === 'epic' ? "de l'Epic" : createType === 'story' ? 'de la Story' : 'de la tâche'}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description détaillée..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select 
                  value={formData.priorité} 
                  onValueChange={(v) => setFormData({ ...formData, priorité: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critique">Critique</SelectItem>
                    <SelectItem value="Haute">Haute</SelectItem>
                    <SelectItem value="Moyenne">Moyenne</SelectItem>
                    <SelectItem value="Basse">Basse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estimation (points)</Label>
                <Input
                  type="number"
                  value={formData.estimation_points}
                  onChange={(e) => setFormData({ ...formData, estimation_points: e.target.value })}
                  placeholder="Ex: 5"
                />
              </div>
            </div>
            {(createType === 'task' || createType === 'story' || editingItem?.type === 'task' || editingItem?.type === 'story') && (
              <>
                <div className="space-y-2">
                  <Label>Assigné à</Label>
                  <Select
                    value={formData.assigné_à || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, assigné_à: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un utilisateur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non assigné</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u._id} value={u._id}>{u.nom_complet}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {sprints.length > 0 && (
                  <div className="space-y-2">
                    <Label>Sprint</Label>
                    <Select
                      value={formData.sprint_id || 'backlog'}
                      onValueChange={(v) => setFormData({ ...formData, sprint_id: v === 'backlog' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un sprint" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        {sprints.map(s => (
                          <SelectItem key={s._id} value={s._id}>{s.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Échéance</Label>
                  <Input
                    type="date"
                    value={formData.date_échéance}
                    onChange={(e) => setFormData({ ...formData, date_échéance: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setCreateDialogOpen(false); }}>
              Annuler
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700" 
              onClick={editingItem ? handleUpdate : handleCreate}
            >
              {editingItem ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
