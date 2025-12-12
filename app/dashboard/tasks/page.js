'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckSquare, Plus, Search, Calendar, Clock, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { safeFetch } from '@/lib/fetch-with-timeout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';

export default function TasksPage() {
  const router = useRouter();
  const { confirm } = useConfirmation();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    titre: '',
    description: '',
    projet_id: '',
    priorité: 'Moyenne',
    assigné_à: '',
    date_début: '',
    date_échéance: '',
    estimation_heures: '',
    story_points: '',
    deliverable_id: '',
    tags: []
  });

  useEffect(() => {
    loadData();
  }, [selectedProject, selectedStatus]);

  // Auto-select first project on initial load
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]._id);
      setNewTask(prev => ({ ...prev, projet_id: projects[0]._id }));
    }
  }, [projects]);

  const { hasPermission: canManageTasks } = user ? useRBACPermissions(user) : { hasPermission: () => false };

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      let tasksUrl = '/api/tasks?limit=100&page=1';
      if (selectedProject && selectedProject !== 'all') tasksUrl += `&projet_id=${selectedProject}`;
      if (selectedStatus && selectedStatus !== 'all') tasksUrl += `&statut=${selectedStatus}`;

      const [userData, tasksData, projectsData, usersData, deliverablesData] = await Promise.all([
        safeFetch('/api/auth/me', token),
        safeFetch(tasksUrl, token),
        safeFetch('/api/projects?limit=50&page=1', token),
        safeFetch('/api/users?limit=100&page=1', token),
        safeFetch('/api/deliverables?limit=100&page=1', token)
      ]);

      setUser(userData);
      setTasks(tasksData.tasks || []);
      setProjects(projectsData.projects || []);
      setUsers(usersData.users || []);
      setDeliverables(deliverablesData.deliverables || []);
      setLoading(false);
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') {
        router.push('/login');
      } else if (error.message === 'TIMEOUT') {
        toast.error('Chargement dépassé - Veuillez recharger');
      } else {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des tâches');
      }
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      if (!newTask.titre || !newTask.projet_id) {
        toast.error('Le titre et le projet sont requis');
        return;
      }

      const token = localStorage.getItem('pm_token');
      await safeFetch('/api/tasks', token, {
        method: 'POST',
        body: JSON.stringify(newTask)
      });

      toast.success('Tâche créée avec succès');
      setCreateDialogOpen(false);
      setNewTask({ titre: '', description: '', projet_id: '', priorité: 'Moyenne', assigné_à: '', date_début: '', date_échéance: '', estimation_heures: '', story_points: '', deliverable_id: '', tags: [] });
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

  const handleUpdateTask = async () => {
    try {
      if (!editingTask.titre || editingTask.titre.trim() === '') {
        toast.error('Le titre est obligatoire');
        return;
      }

      const token = localStorage.getItem('pm_token');

      // Prepare only allowed fields for update
      const updateData = {
        titre: editingTask.titre.trim(),
        description: editingTask.description || '',
        statut: editingTask.statut,
        priorité: editingTask.priorité,
        assigné_à: editingTask.assigné_à || null,
        date_début: editingTask.date_début || null,
        date_échéance: editingTask.date_échéance || null,
        deliverable_id: editingTask.deliverable_id || null
      };

      const response = await fetch(`/api/tasks/${editingTask._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Tâche modifiée avec succès');
        setEditingTask(null);
        await loadData();
      } else {
        console.error('Erreur réponse:', data);
        toast.error(data.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleDeleteTask = async (taskId, taskTitle) => {
    const confirmed = await confirm({
      title: 'Supprimer la tâche',
      description: `Êtes-vous sûr de vouloir supprimer la tâche "${taskTitle}" ?`,
      actionLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Tâche supprimée avec succès');
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Critique': 'bg-red-100 text-red-800',
      'Haute': 'bg-orange-100 text-orange-800',
      'Moyenne': 'bg-blue-100 text-blue-800',
      'Basse': 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || colors['Moyenne'];
  };

  const getStatusColor = (status) => {
    const colors = {
      'Backlog': 'bg-gray-100 text-gray-800',
      'À faire': 'bg-blue-100 text-blue-800',
      'En cours': 'bg-yellow-100 text-yellow-800',
      'Review': 'bg-purple-100 text-purple-800',
      'Terminé': 'bg-green-100 text-green-800'
    };
    return colors[status] || colors['Backlog'];
  };

  const filteredTasks = tasks.filter(task => 
    task.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Tâches</h1>
          <p className="text-gray-600">Créez, modifiez et suivez toutes vos tâches</p>
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

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une tâche..."
            className="pl-10"
          />
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Tous les projets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les projets</SelectItem>
            {projects.map(p => (
              <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="Backlog">Backlog</SelectItem>
            <SelectItem value="À faire">À faire</SelectItem>
            <SelectItem value="En cours">En cours</SelectItem>
            <SelectItem value="Review">Review</SelectItem>
            <SelectItem value="Terminé">Terminé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>{filteredTasks.length} tâche(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Aucune tâche trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tâche</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task, idx) => (
                  <motion.tr
                    key={task._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{task.titre}</p>
                        {task.description && (
                          <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{projects.find(p => p._id === task.projet_id)?.nom || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      {task.assigné_à && typeof task.assigné_à === 'object' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-600">
                              {task.assigné_à.nom_complet?.charAt(0) || '?'}
                            </span>
                          </div>
                          <span className="text-sm">{task.assigné_à.nom_complet || 'N/A'}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(task.priorité)}>
                        {task.priorité}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(task.statut)}>
                        {task.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.date_échéance ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(task.date_échéance).toLocaleDateString('fr-FR')}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Aucune</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setEditingTask(task)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTask(task._id, task.titre)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle tâche</DialogTitle>
            <DialogDescription>Remplissez les informations de la tâche</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={newTask.titre}
                  onChange={(e) => setNewTask({ ...newTask, titre: e.target.value })}
                  placeholder="Titre de la tâche"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Description détaillée..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Projet *</Label>
                <Select value={newTask.projet_id} onValueChange={(val) => setNewTask({ ...newTask, projet_id: val })}>
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
                <Select value={newTask.assigné_à || 'none'} onValueChange={(val) => setNewTask({ ...newTask, assigné_à: val === 'none' ? null : val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
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
              <div className="col-span-2 space-y-2">
                <Label>Livrable associé</Label>
                <Select value={newTask.deliverable_id || 'none'} onValueChange={(val) => setNewTask({ ...newTask, deliverable_id: val === 'none' ? null : val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun livrable</SelectItem>
                    {deliverables.map(d => (
                      <SelectItem key={d._id} value={d._id}>{d.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateTask} className="bg-indigo-600 hover:bg-indigo-700">
              Créer la tâche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier la tâche</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Titre</Label>
                  <Input
                    value={editingTask.titre}
                    onChange={(e) => setEditingTask({ ...editingTask, titre: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingTask.description || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={['Basse', 'Moyenne', 'Haute', 'Critique'].includes(editingTask.priorité) ? editingTask.priorité : 'Moyenne'} onValueChange={(val) => setEditingTask({ ...editingTask, priorité: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basse">Basse</SelectItem>
                      <SelectItem value="Moyenne">Moyenne</SelectItem>
                      <SelectItem value="Haute">Haute</SelectItem>
                      <SelectItem value="Critique">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={['Backlog', 'À faire', 'En cours', 'Review', 'Terminé'].includes(editingTask.statut) ? editingTask.statut : 'Backlog'} onValueChange={(val) => setEditingTask({ ...editingTask, statut: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Backlog">Backlog</SelectItem>
                      <SelectItem value="À faire">À faire</SelectItem>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="Review">Review</SelectItem>
                      <SelectItem value="Terminé">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assigné à</Label>
                  <Select value={editingTask.assigné_à ? (typeof editingTask.assigné_à === 'string' ? editingTask.assigné_à : editingTask.assigné_à.toString()) : 'none'} onValueChange={(val) => setEditingTask({ ...editingTask, assigné_à: val === 'none' ? null : val })}>
                    <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
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
                    value={editingTask.date_début ? new Date(editingTask.date_début).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingTask({ ...editingTask, date_début: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date d'échéance</Label>
                  <Input
                    type="date"
                    value={editingTask.date_échéance ? new Date(editingTask.date_échéance).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingTask({ ...editingTask, date_échéance: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Livrable associé</Label>
                  <Select value={editingTask.deliverable_id ? (typeof editingTask.deliverable_id === 'string' ? editingTask.deliverable_id : editingTask.deliverable_id.toString()) : 'none'} onValueChange={(val) => setEditingTask({ ...editingTask, deliverable_id: val === 'none' ? null : val })}>
                    <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun livrable</SelectItem>
                      {deliverables.map(d => (
                        <SelectItem key={d._id} value={d._id}>{d.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTask(null)}>Annuler</Button>
              <Button onClick={handleUpdateTask} className="bg-indigo-600 hover:bg-indigo-700">
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
