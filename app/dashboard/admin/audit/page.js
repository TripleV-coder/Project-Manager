'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Download, Activity, RefreshCw, Search, X, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FolderKanban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

export default function AuditDashboard() {
  const router = useRouter();
  const [_user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    entityType: '',
    severity: '',
    projectId: '',
    startDate: '',
    endDate: '',
    limit: 15,
    skip: 0
  });

  const [availableActions, setAvailableActions] = useState([]);
  const [availableEntityTypes, setAvailableEntityTypes] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [totalResults, setTotalResults] = useState(0);

  const severityConfig = {
    critical: { label: 'Critique', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    error: { label: 'Erreur', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    warning: { label: 'Avertissement', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    info: { label: 'Info', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  };

  const actionConfig = {
    création: 'bg-emerald-100 text-emerald-700',
    modification: 'bg-blue-100 text-blue-700',
    suppression: 'bg-red-100 text-red-700',
    connexion: 'bg-purple-100 text-purple-700',
    déconnexion: 'bg-gray-100 text-gray-700',
    default: 'bg-gray-100 text-gray-600'
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const token = localStorage.getItem('pm_token');
        const userRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userRes.ok) {
          router.push('/login');
          return;
        }

        const userData = await userRes.json();
        // Support both role_id and role for permissions
        const userPerms = userData.role_id?.permissions || userData.role?.permissions || {};
        if (!userPerms.adminConfig) {
          router.push('/dashboard');
          return;
        }
        setUser(userData);

        // Charger les actions d'audit et les projets en parallèle
        const [actionsRes, projectsRes] = await Promise.all([
          fetch('/api/audit/actions', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/projects?limit=200', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (actionsRes.ok) {
          const data = await actionsRes.json();
          setAvailableActions(data.actions || []);
          setAvailableEntityTypes(data.entityTypes || []);
        }

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setAvailableProjects(projectsData.data || []);
        }

        // Charger les utilisateurs seulement si permission (adminConfig a déjà été vérifié)
        try {
          const usersRes = await fetch('/api/users?limit=100', { headers: { 'Authorization': `Bearer ${token}` } });
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setAvailableUsers(usersData.data || []);
          }
        } catch {
          console.warn('Impossible de charger les utilisateurs');
          setAvailableUsers([]);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    };
    loadOptions();
  }, [router]);

  const loadAuditData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');

      const [summaryRes, logsRes] = await Promise.all([
        fetch('/api/audit/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/audit?${new URLSearchParams(Object.entries(filters).filter(([_, v]) => v))}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.logs || []);
        setTotalResults(logsData.total || 0);
      } else if (logsRes.status === 403) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [filters, router]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, skip: 0 }));
  };

  const handleExport = async (format = 'csv') => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v && !['limit', 'skip'].includes(k)) params.append(k, v);
      });
      params.append('format', format);

      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/audit/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Échec');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Export terminé');
    } catch (error) {
      toast.error('Erreur export');
    }
  };

  const resetFilters = () => {
    setFilters({ userId: '', action: '', entityType: '', severity: '', projectId: '', startDate: '', endDate: '', limit: 15, skip: 0 });
    setSearchQuery('');
  };

  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => v && !['limit', 'skip'].includes(k)).length;

  const getSeverity = (s) => severityConfig[s] || { label: s, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  const getActionStyle = (a) => actionConfig[a] || actionConfig.default;

  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return [log.utilisateur_nom, log.utilisateur_email, log.action, log.entity_type, log.description]
      .some(f => f?.toLowerCase().includes(q));
  });

  const currentPage = Math.floor(filters.skip / filters.limit) + 1;
  const totalPages = Math.ceil(totalResults / filters.limit);
  const goToPage = (p) => setFilters(prev => ({ ...prev, skip: (p - 1) * prev.limit }));

  // Génération des numéros de page pour la pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Journal d'audit</h1>
          <p className="text-xs text-gray-500">{totalResults} activités enregistrées</p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={loadAuditData} disabled={loading} className="h-8 w-8 p-0">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Download className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-28 p-1">
              <button onClick={() => handleExport('csv')} className="w-full px-2 py-1.5 text-xs text-left hover:bg-gray-100 rounded">CSV</button>
              <button onClick={() => handleExport('json')} className="w-full px-2 py-1.5 text-xs text-left hover:bg-gray-100 rounded">JSON</button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats mini */}
      {summary && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Activités', value: summary.summary?.totalActivities ?? 0 },
            { label: 'Actions', value: summary.summary?.activitiesByAction?.length ?? 0 },
            { label: 'Utilisateurs', value: summary.summary?.topUsers?.length ?? 0 },
            { label: 'Période', value: `${summary.summary?.hoursWindow ?? 24}h` }
          ].map((stat, i) => (
            <div key={i} className="bg-white border rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase">{stat.label}</p>
              <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Barre de filtres */}
      <Card className="border shadow-sm">
        <CardContent className="p-3">
          <div className="flex gap-2 items-center">
            {/* Recherche */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>

            {/* Bouton filtres */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-8 gap-1 ${showFilters ? 'bg-indigo-600' : ''}`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="text-xs">Filtres</span>
              {activeFiltersCount > 0 && (
                <span className={`text-[10px] px-1 rounded ${showFilters ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'}`}>
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {activeFiltersCount > 0 && (
              <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-gray-700">
                Effacer
              </button>
            )}
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <select
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  className="h-8 px-2 text-xs border rounded bg-white"
                >
                  <option value="">Utilisateur</option>
                  {availableUsers.map(u => (
                    <option key={u.id || u._id} value={u.id || u._id}>{u.nom_complet}</option>
                  ))}
                </select>

                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="h-8 px-2 text-xs border rounded bg-white"
                >
                  <option value="">Action</option>
                  {availableActions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                <select
                  value={filters.entityType}
                  onChange={(e) => handleFilterChange('entityType', e.target.value)}
                  className="h-8 px-2 text-xs border rounded bg-white"
                >
                  <option value="">Entité</option>
                  {availableEntityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="h-8 px-2 text-xs border rounded bg-white"
                >
                  <option value="">Sévérité</option>
                  {Object.entries(severityConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <select
                  value={filters.projectId}
                  onChange={(e) => handleFilterChange('projectId', e.target.value)}
                  className="h-8 px-2 text-xs border rounded bg-white col-span-2 sm:col-span-1"
                >
                  <option value="">Filtrer par projet</option>
                  {availableProjects.map(p => (
                    <option key={p._id} value={p._id}>{p.nom}</option>
                  ))}
                </select>

                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Début"
                />

                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Fin"
                />
              </div>

              {filters.projectId && (
                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg">
                  <FolderKanban className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs text-indigo-700">
                    Affichage des activités du projet: <strong>{availableProjects.find(p => p._id === filters.projectId)?.nom}</strong>
                  </span>
                  <button
                    onClick={() => handleFilterChange('projectId', '')}
                    className="ml-auto text-indigo-600 hover:text-indigo-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table compacte */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Utilisateur</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Action</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Entité</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden lg:table-cell">Projet</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden xl:table-cell">Sévérité</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Date</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    <Activity className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Aucune activité</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, i) => (
                  <tr
                    key={i}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => { setSelectedLog(log); setDetailsDialogOpen(true); }}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-medium text-gray-600">
                            {(log.utilisateur_nom || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                          {log.utilisateur_nom}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${getActionStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 hidden md:table-cell">{log.entity_type}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      {log.related_project_id?.nom ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-50 text-indigo-700">
                          <FolderKanban className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">{log.related_project_id.nom}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 hidden xl:table-cell">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded ${getSeverity(log.severity).bg} ${getSeverity(log.severity).text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getSeverity(log.severity).dot}`}></span>
                        {getSeverity(log.severity).label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-2 py-2">
                      <Eye className="w-3.5 h-3.5 text-gray-300" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination professionnelle */}
        {totalPages > 1 && !searchQuery && (
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {filters.skip + 1}-{Math.min(filters.skip + filters.limit, totalResults)} sur {totalResults}
              </span>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="h-7 px-2 text-xs border rounded bg-white"
              >
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              {/* Première page */}
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Page précédente */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Numéros de page */}
              <div className="flex items-center gap-0.5 mx-1">
                {getPageNumbers().map((page, i) => (
                  page === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`min-w-[28px] h-7 px-2 text-xs font-medium rounded transition-colors ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              {/* Page suivante */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Dernière page */}
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialog détails */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Détails de l'activité</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-sm">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-indigo-600">
                    {(selectedLog.utilisateur_nom || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{selectedLog.utilisateur_nom}</p>
                  <p className="text-xs text-gray-500">{selectedLog.utilisateur_email}</p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Action</p>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getActionStyle(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Sévérité</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${getSeverity(selectedLog.severity).bg} ${getSeverity(selectedLog.severity).text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getSeverity(selectedLog.severity).dot}`}></span>
                    {getSeverity(selectedLog.severity).label}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Entité</p>
                  <p>{selectedLog.entity_type}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Date</p>
                  <p>{new Date(selectedLog.timestamp).toLocaleString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase mb-1">IP</p>
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{selectedLog.ip_address || '-'}</code>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Appareil</p>
                  <p className="text-xs">{selectedLog.navigateur || '-'} / {selectedLog.os || '-'}</p>
                </div>
              </div>

              {selectedLog.related_project_id && (
                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg">
                  <FolderKanban className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Projet associé</p>
                    <p className="text-xs font-medium text-indigo-700">
                      {selectedLog.related_project_id?.nom || selectedLog.related_project_id}
                    </p>
                  </div>
                </div>
              )}

              {selectedLog.description && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Description</p>
                  <p className="text-sm p-2 bg-gray-50 rounded">{selectedLog.description}</p>
                </div>
              )}

              {(selectedLog.old_value || selectedLog.new_value) && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedLog.old_value && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase mb-1">Avant</p>
                      <pre className="text-[10px] p-2 bg-red-50 rounded overflow-auto max-h-20">
                        {JSON.stringify(selectedLog.old_value, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.new_value && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase mb-1">Après</p>
                      <pre className="text-[10px] p-2 bg-green-50 rounded overflow-auto max-h-20">
                        {JSON.stringify(selectedLog.new_value, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
