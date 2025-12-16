'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, ChevronLeft, ChevronRight,
  Milestone, Flag, CheckCircle2, AlertCircle,
  ZoomIn, ZoomOut, Link2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function RoadmapPage() {
  const router = useRouter();
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [viewMode, setViewMode] = useState('month'); // month, quarter, year
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoom, setZoom] = useState(1);
  const [showDependencies, setShowDependencies] = useState(true);
  const [hoveredTask, setHoveredTask] = useState(null);
  const _ganttRef = useRef(null); // Reserved for future Gantt chart implementation
  const taskRowRefs = useRef({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const projectFilter = selectedProject !== 'all' ? `?projet_id=${selectedProject}` : '';

      const [projectsRes, tasksRes, sprintsRes, deliverablesRes] = await Promise.all([
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }),
        fetch(`/api/tasks${projectFilter}`, { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }),
        fetch(`/api/sprints${projectFilter}`, { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }),
        fetch(`/api/deliverables${projectFilter}`, { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) })
      ]);

      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();
      const sprintsData = await sprintsRes.json();
      const deliverablesData = await deliverablesRes.json();

      // API returns { success: true, data: [...] } or legacy format
      setProjects(projectsData.data || projectsData.projects || []);
      setTasks(tasksData.data || tasksData.tasks || []);
      setSprints(sprintsData.sprints || sprintsData.data || []);
      setDeliverables(deliverablesData.deliverables || deliverablesData.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  }, [selectedProject, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Générer les dates pour la timeline
  const generateTimelineDates = () => {
    const dates = [];
    const start = new Date(currentDate);
    
    if (viewMode === 'month') {
      start.setDate(1);
      for (let i = 0; i < 35; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d);
      }
    } else if (viewMode === 'quarter') {
      start.setDate(1);
      start.setMonth(Math.floor(start.getMonth() / 3) * 3);
      for (let i = 0; i < 13; i++) {
        const d = new Date(start);
        d.setDate(1);
        d.setMonth(start.getMonth() + i * 7);
        dates.push(d);
      }
    } else {
      start.setMonth(0);
      start.setDate(1);
      for (let i = 0; i < 12; i++) {
        const d = new Date(start);
        d.setMonth(i);
        dates.push(d);
      }
    }
    
    return dates;
  };

  const timelineDates = generateTimelineDates();
  const firstDate = timelineDates[0];
  const lastDate = timelineDates[timelineDates.length - 1];
  const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

  const getBarPosition = useCallback((startDate, endDate) => {
    if (!startDate) return null;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);

    if (end < firstDate || start > lastDate) return null;

    const startOffset = Math.max(0, Math.ceil((start - firstDate) / (1000 * 60 * 60 * 24)));
    const endOffset = Math.min(totalDays, Math.ceil((end - firstDate) / (1000 * 60 * 60 * 24)) + 1);
    const width = endOffset - startOffset;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(width / totalDays) * 100}%`
    };
  }, [firstDate, lastDate, totalDays]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Terminé': return 'bg-green-500';
      case 'En cours': return 'bg-blue-500';
      case 'Review': return 'bg-purple-500';
      case 'À faire': return 'bg-yellow-500';
      case 'Backlog': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critique': return 'border-l-red-500';
      case 'Haute': return 'border-l-orange-500';
      case 'Moyenne': return 'border-l-yellow-500';
      case 'Basse': return 'border-l-green-500';
      default: return 'border-l-gray-400';
    }
  };

  const navigateTimeline = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'quarter') {
      newDate.setMonth(newDate.getMonth() + (direction * 3));
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }
    setCurrentDate(newDate);
  };

  const formatDateHeader = (date) => {
    if (viewMode === 'month') {
      return date.getDate();
    } else if (viewMode === 'quarter') {
      return date.toLocaleDateString('fr-FR', { month: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { month: 'short' });
    }
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Filtrer les tâches avec des dates
  const scheduledTasks = tasks.filter(t => t.date_début || t.date_échéance);
  const unscheduledTasks = tasks.filter(t => !t.date_début && !t.date_échéance);

  // Calculer les dépendances pour le rendu SVG
  const dependencyLines = useMemo(() => {
    if (!showDependencies) return [];

    const lines = [];
    scheduledTasks.forEach(task => {
      if (task.dépendances && task.dépendances.length > 0) {
        task.dépendances.forEach(dep => {
          const dependentTask = scheduledTasks.find(t => t._id === dep.task_id);
          if (dependentTask) {
            const fromPos = getBarPosition(dependentTask.date_début || dependentTask.date_échéance, dependentTask.date_échéance);
            const toPos = getBarPosition(task.date_début || task.date_échéance, task.date_échéance);

            if (fromPos && toPos) {
              lines.push({
                from: dependentTask._id,
                to: task._id,
                fromTask: dependentTask,
                toTask: task,
                type: dep.type,
                fromPos,
                toPos
              });
            }
          }
        });
      }
    });
    return lines;
  }, [scheduledTasks, showDependencies, getBarPosition]);

  // Obtenir les tâches qui dépendent de la tâche survolée
  const getRelatedTasks = useCallback((taskId) => {
    if (!taskId) return { blocking: [], blockedBy: [] };

    const task = tasks.find(t => t._id === taskId);
    if (!task) return { blocking: [], blockedBy: [] };

    // Tâches que cette tâche bloque
    const blocking = tasks.filter(t =>
      t.dépendances?.some(d => d.task_id === taskId && d.type === 'bloqué_par')
    );

    // Tâches qui bloquent cette tâche
    const blockedBy = task.dépendances
      ?.filter(d => d.type === 'bloqué_par')
      .map(d => tasks.find(t => t._id === d.task_id))
      .filter(Boolean) || [];

    return { blocking, blockedBy };
  }, [tasks]);

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.statut === 'Terminé').length;
  const overdueTasks = scheduledTasks.filter(t => {
    if (!t.date_échéance) return false;
    return new Date(t.date_échéance) < new Date() && t.statut !== 'Terminé';
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Roadmap & Gantt</h1>
          <p className="text-gray-600 text-sm lg:text-base">Vue chronologique de vos projets et tâches</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les projets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les projets</SelectItem>
              {projects.map(p => (
                <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mois</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Année</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tâches planifiées</p>
                <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
              </div>
              <Calendar className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Terminées</p>
                <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En retard</p>
                <p className="text-2xl font-bold text-red-600">{overdueTasks}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sprints</p>
                <p className="text-2xl font-bold text-purple-600">{sprints.length}</p>
              </div>
              <Flag className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Navigation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateTimeline(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-gray-900 min-w-[150px] text-center">
                {viewMode === 'year' 
                  ? currentDate.getFullYear()
                  : currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                }
              </span>
              <Button variant="outline" size="icon" onClick={() => navigateTimeline(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Aujourd'hui
              </Button>
              <div className="flex items-center gap-2 ml-4 pl-4 border-l">
                <Switch
                  id="show-deps"
                  checked={showDependencies}
                  onCheckedChange={setShowDependencies}
                />
                <Label htmlFor="show-deps" className="text-sm flex items-center gap-1 cursor-pointer">
                  <Link2 className="w-4 h-4" />
                  Dépendances
                </Label>
              </div>
              <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.25))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dependencies Summary */}
      {showDependencies && dependencyLines.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Link2 className="w-5 h-5 text-indigo-600" />
              <span className="font-medium text-gray-700">
                {dependencyLines.length} dépendance{dependencyLines.length > 1 ? 's' : ''} détectée{dependencyLines.length > 1 ? 's' : ''}
              </span>
              <div className="flex gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-red-500" />
                  Bloque
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-blue-500" />
                  Bloqué par
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-gray-400" />
                  Lié à
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gantt Chart */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div 
            ref={containerRef}
            className="min-w-[800px]"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            {/* Timeline Header */}
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              <div className="w-64 flex-shrink-0 p-3 font-semibold text-gray-700 border-r border-gray-200">
                Tâche
              </div>
              <div className="flex-1 flex">
                {timelineDates.map((date, idx) => (
                  <div 
                    key={idx}
                    className={`flex-1 min-w-[40px] p-2 text-center text-xs border-r border-gray-100 ${
                      isToday(date) ? 'bg-indigo-100 font-bold text-indigo-700' :
                      isWeekend(date) && viewMode === 'month' ? 'bg-gray-100 text-gray-400' : ''
                    }`}
                  >
                    {formatDateHeader(date)}
                    {viewMode === 'month' && (
                      <div className="text-[10px] text-gray-400">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sprints Section */}
            {sprints.length > 0 && (
              <>
                <div className="flex border-b border-gray-200 bg-purple-50">
                  <div className="w-64 flex-shrink-0 p-3 font-semibold text-purple-700 border-r border-gray-200">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4" />
                      Sprints
                    </div>
                  </div>
                  <div className="flex-1" />
                </div>
                {sprints.map((sprint) => {
                  const position = getBarPosition(sprint.date_début, sprint.date_fin);
                  return (
                    <div key={sprint._id} className="flex border-b border-gray-100 hover:bg-gray-50">
                      <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4 text-purple-600" />
                          <span className="font-medium truncate">{sprint.nom}</span>
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {sprint.statut}
                        </Badge>
                      </div>
                      <div className="flex-1 relative py-2">
                        {position && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 h-6 rounded bg-purple-500 cursor-pointer hover:bg-purple-600 transition-colors"
                                  style={position}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-semibold">{sprint.nom}</p>
                                <p className="text-xs">
                                  {new Date(sprint.date_début).toLocaleDateString('fr-FR')} - 
                                  {new Date(sprint.date_fin).toLocaleDateString('fr-FR')}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Deliverables Section */}
            {deliverables.length > 0 && (
              <>
                <div className="flex border-b border-gray-200 bg-orange-50">
                  <div className="w-64 flex-shrink-0 p-3 font-semibold text-orange-700 border-r border-gray-200">
                    <div className="flex items-center gap-2">
                      <Milestone className="w-4 h-4" />
                      Livrables ({deliverables.length})
                    </div>
                  </div>
                  <div className="flex-1" />
                </div>
                {deliverables.map((deliverable) => {
                  const position = deliverable.date_échéance ? getBarPosition(deliverable.date_échéance, deliverable.date_échéance) : null;
                  const statusColor = {
                    'À produire': 'bg-gray-400',
                    'En validation': 'bg-yellow-500',
                    'Validé': 'bg-green-500',
                    'Refusé': 'bg-red-500',
                    'Archivé': 'bg-gray-300'
                  }[deliverable.statut_global] || 'bg-gray-400';

                  return (
                    <div key={deliverable._id} className="flex border-b border-gray-100 hover:bg-gray-50">
                      <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <Milestone className="w-4 h-4 text-orange-600" />
                          <span className="font-medium truncate" title={deliverable.nom}>
                            {deliverable.nom}
                          </span>
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {deliverable.statut_global}
                        </Badge>
                      </div>
                      <div className="flex-1 relative py-2">
                        {position && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer hover:opacity-80 transition-opacity ${statusColor}`}
                                  style={position}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-semibold">{deliverable.nom}</p>
                                <p className="text-xs">Statut: {deliverable.statut_global}</p>
                                {deliverable.date_échéance && (
                                  <p className="text-xs">
                                    Échéance: {new Date(deliverable.date_échéance).toLocaleDateString('fr-FR')}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Tasks Section */}
            <div className="flex border-b border-gray-200 bg-blue-50">
              <div className="w-64 flex-shrink-0 p-3 font-semibold text-blue-700 border-r border-gray-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Tâches ({scheduledTasks.length})
                </div>
              </div>
              <div className="flex-1" />
            </div>
            
            {scheduledTasks.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Aucune tâche planifiée avec des dates</p>
                <p className="text-sm">Ajoutez des dates de début et d'échéance à vos tâches</p>
              </div>
            ) : (
              scheduledTasks.map((task, taskIndex) => {
                const position = getBarPosition(task.date_début || task.date_échéance, task.date_échéance);
                const project = projects.find(p => p._id === task.projet_id);
                const hasDependencies = task.dépendances && task.dépendances.length > 0;
                const { blocking, blockedBy } = getRelatedTasks(task._id);
                const isBlocked = blockedBy.some(t => t.statut !== 'Terminé');
                const isHighlighted = hoveredTask && (
                  hoveredTask === task._id ||
                  blocking.some(t => t._id === hoveredTask) ||
                  blockedBy.some(t => t._id === hoveredTask)
                );

                return (
                  <div
                    key={task._id}
                    ref={el => taskRowRefs.current[task._id] = el}
                    data-task-id={task._id}
                    data-task-index={taskIndex}
                    className={`flex border-b border-gray-100 hover:bg-gray-50 border-l-4 ${getPriorityColor(task.priorité)} ${
                      isHighlighted ? 'bg-indigo-50' : ''
                    } ${isBlocked ? 'opacity-70' : ''}`}
                    onMouseEnter={() => setHoveredTask(task._id)}
                    onMouseLeave={() => setHoveredTask(null)}
                  >
                    <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(task.statut)}`} />
                        <span className="font-medium truncate text-sm" title={task.titre}>
                          {task.titre}
                        </span>
                        {hasDependencies && showDependencies && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Link2 className={`w-3 h-3 ${isBlocked ? 'text-red-500' : 'text-gray-400'}`} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {task.dépendances.length} dépendance{task.dépendances.length > 1 ? 's' : ''}
                                </p>
                                {isBlocked && (
                                  <p className="text-xs text-red-500">Bloquée par des tâches non terminées</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {project?.nom || 'Sans projet'}
                      </p>
                      {showDependencies && (blocking.length > 0 || blockedBy.length > 0) && (
                        <div className="flex gap-2 mt-1">
                          {blockedBy.length > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-600 border-red-300">
                              <ArrowRight className="w-2 h-2 mr-0.5 rotate-180" />
                              {blockedBy.length}
                            </Badge>
                          )}
                          {blocking.length > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-blue-600 border-blue-300">
                              <ArrowRight className="w-2 h-2 mr-0.5" />
                              {blocking.length}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 relative py-2">
                      {position && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute top-1/2 -translate-y-1/2 h-5 rounded cursor-pointer transition-all ${getStatusColor(task.statut)} ${
                                  isHighlighted ? 'ring-2 ring-indigo-400 ring-offset-1' : 'hover:opacity-80'
                                } ${isBlocked ? 'opacity-60' : ''}`}
                                style={position}
                              >
                                {task.progression > 0 && (
                                  <div
                                    className="h-full bg-white/30 rounded-l"
                                    style={{ width: `${task.progression}%` }}
                                  />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold">{task.titre}</p>
                              <p className="text-xs">Statut: {task.statut}</p>
                              <p className="text-xs">Priorité: {task.priorité}</p>
                              {task.date_échéance && (
                                <p className="text-xs">
                                  Échéance: {new Date(task.date_échéance).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                              {hasDependencies && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs font-medium">Dépendances:</p>
                                  {blockedBy.map(t => (
                                    <p key={t._id} className="text-xs text-red-500">
                                      ← Bloqué par: {t.titre}
                                    </p>
                                  ))}
                                  {blocking.map(t => (
                                    <p key={t._id} className="text-xs text-blue-500">
                                      → Bloque: {t.titre}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Unscheduled Tasks Section */}
            {unscheduledTasks.length > 0 && (
              <>
                <div className="flex border-b border-gray-200 bg-red-50">
                  <div className="w-64 flex-shrink-0 p-3 font-semibold text-red-700 border-r border-gray-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Tâches non planifiées ({unscheduledTasks.length})
                    </div>
                  </div>
                  <div className="flex-1" />
                </div>
                {unscheduledTasks.map((task) => {
                  const project = projects.find(p => p._id === task.projet_id);
                  return (
                    <div
                      key={task._id}
                      className={`flex border-b border-gray-100 hover:bg-gray-50 border-l-4 ${getPriorityColor(task.priorité)}`}
                    >
                      <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(task.statut)}`} />
                          <span className="font-medium truncate text-sm" title={task.titre}>
                            {task.titre}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {project?.nom || 'Sans projet'}
                        </p>
                        <p className="text-xs text-red-600 font-medium mt-1">
                          ⚠️ Pas de date d'échéance
                        </p>
                      </div>
                      <div className="flex-1 relative py-2 flex items-center px-4">
                        <span className="text-xs text-gray-500">Statut: {task.statut}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Légende */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Légende</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm text-gray-600">Terminé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-sm text-gray-600">En cours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-sm text-gray-600">En attente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-sm text-gray-600">Bloqué</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500" />
              <span className="text-sm text-gray-600">Sprint</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500" />
              <span className="text-sm text-gray-600">Livrable</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
