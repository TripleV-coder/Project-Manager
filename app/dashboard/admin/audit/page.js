'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye, Download, AlertTriangle, Activity, Users, Clock,
  Filter, Search, Calendar, ChevronDown, AlertCircle, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function AuditDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    entityType: '',
    severity: '',
    startDate: '',
    endDate: '',
    limit: 50,
    skip: 0
  });

  const [availableActions, setAvailableActions] = useState([]);
  const [availableEntityTypes, setAvailableEntityTypes] = useState([]);
  const [totalResults, setTotalResults] = useState(0);

  // Load available filter options and check auth
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const token = localStorage.getItem('pm_token');

        // Check authorization first
        const userRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userRes.ok) {
          router.push('/login');
          return;
        }

        const userData = await userRes.json();

        // Client-side guard: redirect if not admin
        if (!userData.role?.permissions?.adminConfig) {
          router.push('/dashboard');
          return;
        }

        setUser(userData);

        const response = await fetch('/api/audit/actions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setAvailableActions(data.actions || []);
          setAvailableEntityTypes(data.entityTypes || []);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    loadOptions();
  }, [router]);

  // Load audit data
  const loadAuditData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');

      // Load summary
      const summaryRes = await fetch('/api/audit/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      // Build query string
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      // Load logs
      const logsRes = await fetch(`/api/audit?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.logs || []);
        setTotalResults(logsData.total || 0);
      } else if (logsRes.status === 403) {
        router.push('/login');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading audit data:', error);
      toast.error('Failed to load audit data');
      setLoading(false);
    }
  }, [filters, router]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, skip: 0 }));
  };

  // Handle export
  const handleExport = async (format = 'csv') => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'limit' && key !== 'skip') {
          queryParams.append(key, value);
        }
      });
      queryParams.append('format', format);

      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/audit/export?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Export failed');

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export completed');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export audit logs');
    }
  };

  // Get severity badge color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-orange-100 text-orange-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get action badge color
  const getActionColor = (action) => {
    if (['création', 'upload_fichier', 'validation'].includes(action))
      return 'bg-green-100 text-green-800';
    if (['suppression', 'modification'].includes(action))
      return 'bg-blue-100 text-blue-800';
    if (['connexion'].includes(action))
      return 'bg-purple-100 text-purple-800';
    if (['access_denied', 'login_failed'].includes(action))
      return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Audit Activity</h1>
        <p className="text-gray-600 mt-2">Track all user activities and system events</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.summary.totalActivities}</div>
              <p className="text-xs text-gray-500 mt-1">Last {summary.period.days} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Critical Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.summary.criticalEvents}</div>
              <p className="text-xs text-gray-500 mt-1">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Failed Logins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.summary.failedLogins}</div>
              <p className="text-xs text-gray-500 mt-1">Security alerts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.summary.activeUsersCount}</div>
              <p className="text-xs text-gray-500 mt-1">Today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Activities Alert */}
      {summary && summary.recentCriticalActivities.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Recent Critical Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.recentCriticalActivities.map((activity, idx) => (
                <div key={idx} className="text-sm py-2 border-b last:border-b-0">
                  <span className="font-medium">{activity.utilisateur?.nom_complet}</span>
                  {' - '}
                  <span className="text-red-600">{activity.action}</span>
                  {' on '} 
                  <span>{activity.entity_type}</span>
                  <span className="text-gray-500 ml-2 text-xs">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Action</label>
              <Select value={filters.action} onValueChange={(v) => handleFilterChange('action', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  {availableActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Entity Type</label>
              <Select value={filters.entityType} onValueChange={(v) => handleFilterChange('entityType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {availableEntityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Severity</label>
              <Select value={filters.severity} onValueChange={(v) => handleFilterChange('severity', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Limit</label>
              <Select value={String(filters.limit)} onValueChange={(v) => handleFilterChange('limit', parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  userId: '',
                  action: '',
                  entityType: '',
                  severity: '',
                  startDate: '',
                  endDate: '',
                  limit: 50,
                  skip: 0
                })}
              >
                Reset
              </Button>
              <Button onClick={loadAuditData} disabled={loading}>
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => handleExport('csv')}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('json')}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export JSON
        </Button>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Logs</span>
            <span className="text-sm font-normal text-gray-600">
              Showing {auditLogs.length} of {totalResults}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No audit logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium">User</th>
                    <th className="px-4 py-2 text-left font-medium">Action</th>
                    <th className="px-4 py-2 text-left font-medium">Entity</th>
                    <th className="px-4 py-2 text-left font-medium">IP Address</th>
                    <th className="px-4 py-2 text-left font-medium">Device</th>
                    <th className="px-4 py-2 text-left font-medium">Severity</th>
                    <th className="px-4 py-2 text-left font-medium">Time</th>
                    <th className="px-4 py-2 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{log.utilisateur_nom}</div>
                        <div className="text-xs text-gray-500">{log.utilisateur_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{log.entity_type}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{log.ip_address}</td>
                      <td className="px-4 py-3 text-xs">{log.navigateur} / {log.os}</td>
                      <td className="px-4 py-3">
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
            <DialogDescription>
              Complete information about this activity
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">User</label>
                  <p className="font-medium">{selectedLog.utilisateur_nom}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Email</label>
                  <p className="text-sm">{selectedLog.utilisateur_email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Action</label>
                  <Badge className={getActionColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Severity</label>
                  <Badge className={getSeverityColor(selectedLog.severity)}>
                    {selectedLog.severity}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Entity Type</label>
                  <p className="text-sm">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Time</label>
                  <p className="text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">IP Address</label>
                  <p className="text-sm font-mono">{selectedLog.ip_address}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Device</label>
                  <p className="text-sm">{selectedLog.navigateur} / {selectedLog.os}</p>
                </div>
              </div>

              {selectedLog.description && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Description</label>
                  <p className="text-sm">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.old_value && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Old Value</label>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div>
                  <label className="text-xs font-medium text-gray-600">New Value</label>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
