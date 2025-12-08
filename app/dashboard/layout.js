'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        localStorage.removeItem('pm_token');
        router.push('/login');
        return;
      }

      const userData = await response.json();
      setUser(userData);

      // Charger notifications
      const notifResponse = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const notifData = await notifResponse.json();
      setNotifications(notifData.notifications || []);
    } catch (error) {
      console.error('Erreur:', error);
      router.push('/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
    router.push('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', visible: true },
    { icon: FolderKanban, label: 'Projets', href: '/dashboard/projects', visible: user?.role?.visible_menus?.projects },
    { icon: ListTodo, label: 'Kanban', href: '/dashboard/kanban', visible: user?.role?.visible_menus?.kanban },
    { icon: ListTodo, label: 'Backlog', href: '/dashboard/backlog', visible: user?.role?.visible_menus?.backlog },
    { icon: Calendar, label: 'Sprints', href: '/dashboard/sprints', visible: user?.role?.visible_menus?.sprints },
    { icon: TrendingUp, label: 'Roadmap', href: '/dashboard/roadmap', visible: user?.role?.visible_menus?.roadmap },
    { icon: CheckCircle2, label: 'Tâches', href: '/dashboard/tasks', visible: user?.role?.visible_menus?.tasks },
    { icon: FileText, label: 'Fichiers', href: '/dashboard/files', visible: user?.role?.visible_menus?.files },
    { icon: MessageSquare, label: 'Commentaires', href: '/dashboard/comments', visible: user?.role?.visible_menus?.comments },
    { icon: Clock, label: 'Timesheets', href: '/dashboard/timesheets', visible: user?.role?.visible_menus?.timesheets },
    { icon: Euro, label: 'Budget', href: '/dashboard/budget', visible: user?.role?.visible_menus?.budget },
    { icon: FileText, label: 'Rapports', href: '/dashboard/reports', visible: user?.role?.visible_menus?.reports },
    { icon: Users, label: 'Utilisateurs', href: '/dashboard/users', visible: user?.role?.permissions?.admin_config },
    { icon: Settings, label: 'Administration', href: '/dashboard/settings', visible: user?.role?.visible_menus?.admin },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
            {menuItems.filter(item => item.visible !== false).map((item, idx) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={idx}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium">{item.label}</span>}
                </button>
              );
            })}
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
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push('/dashboard/settings')}>
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
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.filter(n => !n.lu).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
