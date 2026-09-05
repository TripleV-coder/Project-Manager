'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, BarChart3, TrendingUp, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import { useAuthFetch } from '@/hooks/useAuthFetch';
import { useTranslation } from '@/contexts/AppSettingsContext';

import { reportExportService } from '@/lib/services/reportExportService';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportPreviewCard } from '@/components/reports/ReportPreviewCard';

export default function ReportsPage() {
  const router = useRouter();
  const { authFetch } = useAuthFetch();
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('all');
  const [reportType, setReportType] = useState('global');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);

  // RBAC: Check permission to generate reports
  const permissions = useRBACPermissions(user);
  const canGenerateReports =
    permissions.hasPermission('genererRapports') || permissions.hasPermission('adminConfig');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select first project on initial load
  useEffect(() => {
    if (projects.length > 0 && selectedProject === 'all') {
      setSelectedProject(projects[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await authFetch('/api/auth/me', {});

      if (!userRes.ok) {
        if (userRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load user data');
      }

      const userData = await userRes.json();
      setUser(userData);

      const userPerms = userData.role_id?.permissions || userData.role?.permissions || {};
      if (!userPerms.genererRapports && !userPerms.adminConfig) {
        setLoading(false);
        return;
      }

      const [projectsRes, tasksRes] = await Promise.all([
        authFetch('/api/projects', { signal: AbortSignal.timeout(10000) }),
        authFetch('/api/tasks', { signal: AbortSignal.timeout(10000) }),
      ]);

      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();

      setProjects(projectsData.data || projectsData.projects || []);
      setTasks(tasksData.data || tasksData.tasks || []);

      const canLoadUsers = userPerms.gererUtilisateurs || userPerms.adminConfig;
      if (canLoadUsers) {
        try {
          const usersRes = await authFetch('/api/users', { signal: AbortSignal.timeout(10000) });
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsers(usersData.data || usersData.users || []);
          }
        } catch {
          console.warn('Impossible de charger les utilisateurs');
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(t('errorLoadingData'));
      setLoading(false);
    }
  };

  // Maps pour optimiser les recherches O(1)
  const projectMap = new Map(projects.map((p) => [p._id, p]));
  const userMap = new Map(users.map((u) => [u._id, u]));

  const handleGenerateReport = async () => {
    setGenerating(true);

    const exportParams = {
      reportType,
      selectedProject,
      projects,
      tasks,
      users,
      projectMap,
      userMap,
      user,
      t,
    };

    try {
      if (exportFormat === 'pdf') {
        reportExportService.generatePDF(exportParams);
      } else if (exportFormat === 'excel') {
        await reportExportService.generateExcel(exportParams);
      } else if (exportFormat === 'csv') {
        reportExportService.generateCSV(exportParams);
      }

      toast.success(`Rapport ${exportFormat.toUpperCase()} généré avec succès !`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(`Erreur lors de la génération : ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    {
      id: 'global',
      name: t('reportGlobal'),
      description: t('reportGlobalDesc'),
      icon: BarChart3,
    },
    {
      id: 'projet',
      name: t('reportProject'),
      description: t('reportProjectDesc'),
      icon: FileText,
    },
    {
      id: 'performance',
      name: t('reportPerformance'),
      description: t('reportPerformanceDesc'),
      icon: TrendingUp,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // RBAC: Show access denied if user doesn't have permission
  if (!canGenerateReports) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-red-900 mb-2">{t('accessDenied')}</h2>
                <p className="text-red-700">
                  {t('noPermissionReports')}
                  <br />
                  {t('contactAdminError')}
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                {t('backToDashboard')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('reportsTitle')}</h1>
        <p className="text-gray-600">{t('reportsSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportFilters
          reportType={reportType}
          setReportType={setReportType}
          reportTypes={reportTypes}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          projects={projects}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          generating={generating}
          handleGenerateReport={handleGenerateReport}
          t={t}
        />

        <ReportPreviewCard
          reportType={reportType}
          projects={projects}
          tasks={tasks}
          users={users}
          t={t}
        />
      </div>
    </div>
  );
}
