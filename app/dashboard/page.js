'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FolderKanban,
  ListTodo,
  CheckCircle2,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/contexts/AppSettingsContext';

export default function DashboardHome() {
  const router = useRouter();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    projectsCount: 0,
    tasksCount: 0,
    completedTasks: 0,
    pendingTasks: 0
  });
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [projectsRes, tasksRes] = await Promise.all([
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }),
        fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) })
      ]);

      if (!projectsRes.ok || !tasksRes.ok) {
        throw new Error('Failed to load data');
      }

      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();

      // API returns { success: true, data: [...] } or legacy { projects/tasks: [...] }
      const projectsList = projectsData.data || projectsData.projects || [];
      const tasksList = tasksData.data || tasksData.tasks || [];

      setProjects(projectsList);
      setTasks(tasksList);

      // Projets actifs = tous sauf Terminé et Annulé
      const activeProjects = projectsList.filter(p =>
        p.statut !== 'Terminé' && p.statut !== 'Annulé'
      );

      setStats({
        projectsCount: activeProjects.length || 0,
        tasksCount: tasksList.length || 0,
        completedTasks: tasksList.filter(t => t.statut === 'Terminé').length || 0,
        pendingTasks: tasksList.filter(t => t.statut !== 'Terminé').length || 0
      });

      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('dashboard')}</h1>
        <p className="text-gray-600">{t('recentActivity')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{t('activeProjects')}</CardTitle>
              <FolderKanban className="w-4 h-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.projectsCount}</div>
              <p className="text-xs text-gray-500 mt-1">{t('inProgress')}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{t('tasks')}</CardTitle>
              <ListTodo className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.tasksCount}</div>
              <p className="text-xs text-gray-500 mt-1">{t('pendingTasks')}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{t('completed')}</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.completedTasks}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.tasksCount > 0 ? Math.round((stats.completedTasks / stats.tasksCount) * 100) : 0}% {t('progress')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{t('todo')}</CardTitle>
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</div>
              <p className="text-xs text-gray-500 mt-1">{t('pendingTasks')}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Projects & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('recentProjects')}</CardTitle>
                <CardDescription>{t('yourActiveProjects')}</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => router.push('/dashboard/projects')}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('newProject')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FolderKanban className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('noProjects')}</p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => router.push('/dashboard/projects')}
                >
                  {t('createProject')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <button
                    key={project._id}
                    type="button"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer w-full text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => router.push(`/dashboard/projects/${project._id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        router.push(`/dashboard/projects/${project._id}`);
                      }
                    }}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{project.nom}</h4>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{project.description}</p>
                    </div>
                    <Badge variant={project.statut === 'En cours' ? 'default' : 'secondary'}>
                      {project.statut}
                    </Badge>
                  </button>
                ))}
                {projects.length > 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push('/dashboard/projects')}
                  >
                    {t('viewAllProjects')} ({projects.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('myTasks')}</CardTitle>
            <CardDescription>{t('tasksAssignedToYou')}</CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('noTasksAssigned')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div 
                    key={task._id} 
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.titre}</h4>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                    </div>
                    <Badge variant={task.statut === 'Terminé' ? 'success' : 'default'}>
                      {task.statut}
                    </Badge>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push('/dashboard/tasks')}
                  >
                    {t('viewAllTasks')} ({tasks.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
