'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, Plus, Search, Calendar, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { safeFetch } from '@/lib/fetch-with-timeout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import { useItemFormData } from '@/hooks/useItemFormData';
import TablePagination from '@/components/ui/table-pagination';
import ItemFormDialog from '@/components/ItemFormDialog';
import { useFormatters, useTranslation } from '@/contexts/AppSettingsContext';

export default function TasksPage() {
  const router = useRouter();
  const { confirm } = useConfirmation();
  const { formatDate } = useFormatters();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [totalTasks, setTotalTasks] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Hook pour charger les données du formulaire
  const handleUnauthorized = useCallback(() => {
    router.push('/login');
  }, [router]);

  const {
    projects,
    users,
    sprints,
    deliverables,
    epics,
    stories,
    loading: formDataLoading,
    dataReady,
    errors: dataErrors,
    refresh: refreshFormData,
    reloadProjectData
  } = useItemFormData({
    projectId: selectedProject && selectedProject !== 'all' ? selectedProject : null,
    loadProjects: true,
    loadUsers: true,
    loadSprints: true,
    loadDeliverables: true,
    onUnauthorized: handleUnauthorized
  });

  const permissions = useRBACPermissions(user);
  const canManageTasks = permissions.hasPermission;

  // Charger les tâches
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      let tasksUrl = `/api/tasks?limit=${itemsPerPage}&page=${currentPage}`;
      if (selectedProject && selectedProject !== 'all') tasksUrl += `&projet_id=${selectedProject}`;
      if (selectedStatus && selectedStatus !== 'all') tasksUrl += `&statut=${selectedStatus}`;

      const [userData, tasksData] = await Promise.all([
        safeFetch('/api/auth/me', token),
        safeFetch(tasksUrl, token)
      ]);

      setUser(userData);

      // Vérification du format de réponse API
      const tasksList = tasksData?.data || tasksData?.tasks || [];
      if (!Array.isArray(tasksList)) {
        console.error('Format de réponse invalide pour les tâches:', tasksData);
        toast.error('Format de données invalide');
        setTasks([]);
        setTotalTasks(0);
      } else {
        setTasks(tasksList);
        setTotalTasks(tasksData.pagination?.total || tasksData.total || tasksList.length || 0);
      }
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') {
        router.push('/login');
      } else if (error.message === 'TIMEOUT') {
        toast.error('Chargement dépassé - Veuillez recharger');
      } else {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des tâches');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedStatus, currentPage, itemsPerPage, router]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  // Callback après création/modification réussie
  const handleFormSuccess = useCallback(async () => {
    await loadTasks();
    refreshFormData();
    setEditingTask(null);
  }, [loadTasks, refreshFormData]);

  const openCreateDialog = () => {
    setEditingTask(null);
    setCreateDialogOpen(true);
  };

  const openEditDialog = (task) => {
    setEditingTask(task);
    setCreateDialogOpen(true);
  };

  const handleDeleteTask = async (taskId, taskTitle) => {
    const confirmed = await confirm({
      title: t('deleteTask'),
      description: `${t('deleteTaskConfirm')} "${taskTitle}" ?`,
      actionLabel: t('delete'),
      cancelLabel: t('cancel'),
      isDangerous: true
    });
    if (!confirmed) return;

    setDeletingTaskId(taskId);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success(t('taskDeleted'));
        await loadTasks();
      } else {
        const data = await response.json();
        toast.error(data.error || t('errorOccurred'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(t('connectionError'));
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Critique': 'bg-red-100 text-red-700',
      'Haute': 'bg-orange-100 text-orange-700',
      'Moyenne': 'bg-blue-100 text-blue-700',
      'Basse': 'bg-gray-100 text-gray-700'
    };
    return colors[priority] || colors['Moyenne'];
  };

  const getStatusColor = (status) => {
    const colors = {
      'Backlog': 'bg-gray-100 text-gray-700',
      'À faire': 'bg-blue-100 text-blue-700',
      'En cours': 'bg-yellow-100 text-yellow-700',
      'Review': 'bg-purple-100 text-purple-700',
      'Terminé': 'bg-green-100 text-green-700'
    };
    return colors[status] || colors['Backlog'];
  };

  const filteredTasks = tasks.filter(task =>
    task.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil((searchTerm ? filteredTasks.length : totalTasks) / itemsPerPage);
  const displayedTasks = searchTerm ? filteredTasks : tasks;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('taskManagement')}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{totalTasks} {t('tasks').toLowerCase()}</p>
        </div>
        {canManageTasks('gererTaches') && (
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-1" />
            {t('newTask')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder={t('searchPlaceholder')}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={selectedProject} onValueChange={(val) => { setSelectedProject(val); setCurrentPage(1); }}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder={t('project')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allProjects')}</SelectItem>
            {projects.map(p => (
              <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={(val) => { setSelectedStatus(val); setCurrentPage(1); }}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="Backlog">Backlog</SelectItem>
            <SelectItem value="À faire">{t('todo')}</SelectItem>
            <SelectItem value="En cours">{t('inProgress')}</SelectItem>
            <SelectItem value="Review">{t('review')}</SelectItem>
            <SelectItem value="Terminé">{t('completed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead className="text-xs font-medium">{t('task')}</TableHead>
                <TableHead className="text-xs font-medium hidden md:table-cell">{t('project')}</TableHead>
                <TableHead className="text-xs font-medium hidden lg:table-cell">{t('assignedTo')}</TableHead>
                <TableHead className="text-xs font-medium">{t('priority')}</TableHead>
                <TableHead className="text-xs font-medium">{t('status')}</TableHead>
                <TableHead className="text-xs font-medium hidden sm:table-cell">{t('dueDate')}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <CheckSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t('noTasks')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                displayedTasks.map((task) => (
                  <TableRow key={task._id} className="hover:bg-gray-50">
                    <TableCell className="py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{task.titre}</p>
                        {task.description && (
                          <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 hidden md:table-cell">
                      <span className="text-xs text-gray-600">{projects.find(p => p._id === (task.projet_id?._id || task.projet_id))?.nom || task.projet_id?.nom || '-'}</span>
                    </TableCell>
                    <TableCell className="py-2 hidden lg:table-cell">
                      {task.assigné_à && typeof task.assigné_à === 'object' ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-medium text-indigo-600">
                              {task.assigné_à.nom_complet?.charAt(0) || '?'}
                            </span>
                          </div>
                          <span className="text-xs">{task.assigné_à.nom_complet || '-'}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{t('unassigned')}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge className={`text-[10px] ${getPriorityColor(task.priorité)}`}>
                        {task.priorité}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge className={`text-[10px] ${getStatusColor(task.statut)}`}>
                        {task.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 hidden sm:table-cell">
                      {task.date_échéance ? (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(task.date_échéance)}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {canManageTasks('gererTaches') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={deletingTaskId === task._id}>
                              {deletingTaskId === task._id ? (
                                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(task)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task._id, task.titre)}
                              className="text-red-600"
                              disabled={deletingTaskId === task._id}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={searchTerm ? filteredTasks.length : totalTasks}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </Card>

      {/* Formulaire unifié de création/édition */}
      <ItemFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        type="Tâche"
        editingItem={editingTask}
        parentItem={null}
        projectId={selectedProject}
        projects={projects}
        users={users}
        sprints={sprints}
        deliverables={deliverables}
        epics={epics}
        stories={stories}
        dataLoading={formDataLoading}
        dataReady={dataReady}
        dataErrors={dataErrors}
        onSuccess={handleFormSuccess}
        onUnauthorized={handleUnauthorized}
        showProjectSelect={true}
        showTypeSelect={true}
        showParentSelect={true}
      />
    </div>
  );
}
