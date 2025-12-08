'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  FolderKanban, 
  ListTodo, 
  Calendar, 
  Users, 
  FileText, 
  Clock, 
  Euro, 
  MessageSquare, 
  Bell, 
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    projectsCount: 0,
    tasksCount: 0,
    completedTasks: 0,
    pendingTasks: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Charger profil utilisateur
      const userResponse = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userResponse.ok) {
        localStorage.removeItem('pm_token');
        router.push('/login');
        return;
      }

      const userData = await userResponse.json();
      setUser(userData);

      // Charger projets
      const projectsResponse = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const projectsData = await projectsResponse.json();
      setProjects(projectsData.projects || []);

      // Charger tâches
      const tasksResponse = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tasksData = await tasksResponse.json();
      setTasks(tasksData.tasks || []);

      // Charger notifications
      const notifResponse = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const notifData = await notifResponse.json();
      setNotifications(notifData.notifications || []);

      // Calculer statistiques
      setStats({
        projectsCount: projectsData.projects?.length || 0,
        tasksCount: tasksData.tasks?.length || 0,
        completedTasks: tasksData.tasks?.filter(t => t.statut === 'Terminé').length || 0,
        pendingTasks: tasksData.tasks?.filter(t => t.statut !== 'Terminé').length || 0
      });

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
    router.push('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true, visible: true },
    { icon: FolderKanban, label: 'Projets', active: false, visible: user?.role?.visible_menus?.projects },
    { icon: ListTodo, label: 'Kanban', active: false, visible: user?.role?.visible_menus?.kanban },
    { icon: ListTodo, label: 'Backlog', active: false, visible: user?.role?.visible_menus?.backlog },
    { icon: Calendar, label: 'Sprints', active: false, visible: user?.role?.visible_menus?.sprints },
    { icon: TrendingUp, label: 'Roadmap', active: false, visible: user?.role?.visible_menus?.roadmap },
    { icon: CheckCircle2, label: 'Tâches', active: false, visible: user?.role?.visible_menus?.tasks },
    { icon: FileText, label: 'Fichiers', active: false, visible: user?.role?.visible_menus?.files },
    { icon: MessageSquare, label: 'Commentaires', active: false, visible: user?.role?.visible_menus?.comments },
    { icon: Clock, label: 'Timesheets', active: false, visible: user?.role?.visible_menus?.timesheets },
    { icon: Euro, label: 'Budget', active: false, visible: user?.role?.visible_menus?.budget },
    { icon: FileText, label: 'Rapports', active: false, visible: user?.role?.visible_menus?.reports },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-lg font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-30 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-gray-200">
            {sidebarOpen ? (
              <h1 className="text-xl font-bold text-indigo-600">PM Gestion</h1>
            ) : (
              <FolderKanban className="w-8 h-8 text-indigo-600" />
            )}
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {menuItems.filter(item => item.visible !== false).map((item, idx) => (
              <button
                key={idx}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200">
            {sidebarOpen ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-indigo-100 text-indigo-600">
                      {user?.nom_complet?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user?.nom_complet}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.role?.nom}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button onClick={handleLogout} className="w-full p-2 rounded-lg hover:bg-gray-50">
                <LogOut className="w-5 h-5 text-gray-600 mx-auto" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.filter(n => !n.lu).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau projet
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Projets actifs</CardTitle>
                  <FolderKanban className="w-4 h-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.projectsCount}</div>
                  <p className="text-xs text-gray-500 mt-1">Projets en cours</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Tâches totales</CardTitle>
                  <ListTodo className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.tasksCount}</div>
                  <p className="text-xs text-gray-500 mt-1">Toutes tâches</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Tâches terminées</CardTitle>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.completedTasks}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.tasksCount > 0 ? Math.round((stats.completedTasks / stats.tasksCount) * 100) : 0}% de progression
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">En attente</CardTitle>
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</div>
                  <p className="text-xs text-gray-500 mt-1">Tâches à faire</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Projects */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Projets récents</CardTitle>
                <CardDescription>Vos derniers projets actifs</CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FolderKanban className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Aucun projet pour le moment</p>
                    <Button className="mt-4" size="sm">Créer un projet</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 5).map((project) => (
                      <div key={project._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{project.nom}</h4>
                          <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                        </div>
                        <Badge variant={project.statut === 'En cours' ? 'default' : 'secondary'}>
                          {project.statut}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mes tâches</CardTitle>
                <CardDescription>Tâches qui vous sont assignées</CardDescription>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Aucune tâche assignée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.slice(0, 5).map((task) => (
                      <div key={task._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.titre}</h4>
                          <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                        </div>
                        <Badge variant={task.statut === 'Terminé' ? 'success' : 'default'}>
                          {task.statut}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
