'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Activity, AlertTriangle, Eye, Download, Calendar,
  TrendingUp, Smartphone, Globe, Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function UserActivityPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);

  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    severity: '',
    limit: 50,
    skip: 0
  });

  // Check authorization first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('pm_token');

        if (!token) {
          router.push('/login');
          return;
        }

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
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Load user activity
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('pm_token');

        // Get user activities
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });

        const activitiesRes = await fetch(`/api/audit/user/${userId}?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (activitiesRes.ok) {
          const data = await activitiesRes.json();
          setActivities(data.logs || []);
        }

        // Get suspicious activities
        const suspiciousRes = await fetch(`/api/audit/suspicious?userId=${userId}&hoursWindow=72`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (suspiciousRes.ok) {
          const data = await suspiciousRes.json();
          setSuspiciousActivities(data.anomalies || []);
        }

        // Get user sessions
        const sessionsRes = await fetch(`/api/audit/sessions?userId=${userId}&limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setSessions(data.sessions || []);

          // Calculate stats from sessions
          const totalSessions = data.sessions?.length || 0;
          const activeSessions = data.sessions?.filter(s => s.statut === 'actif').length || 0;
          const uniqueIPs = new Set(data.sessions?.map(s => s.ip_address) || []).size;

          setStats({
            totalSessions,
            activeSessions,
            uniqueIPs,
            avgSessionDuration: Math.round(
              (data.sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0) /
              (totalSessions || 1)
            )
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading activity:', error);
        toast.error('Failed to load user activity');
        setLoading(false);
      }
    };

    if (userId) {
      loadData();
    }
  }, [userId, filters]);

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-orange-100 text-orange-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get action color
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Prepare activity chart data
  const activityByDate = {};
  activities.forEach(activity => {
    const date = new Date(activity.timestamp).toLocaleDateString();
    activityByDate[date] = (activityByDate[date] || 0) + 1;
  });
  const chartData = Object.entries(activityByDate).map(([date, count]) => ({ date, count }));

  // Prepare activity by type data
  const activityByType = {};
  activities.forEach(activity => {
    activityByType[activity.action] = (activityByType[activity.action] || 0) + 1;
  });
  const typeData = Object.entries(activityByType).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/audit">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">User Activity</h1>
          <p className="text-gray-600">Complete activity history and audit trail</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-gray-500">All sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeSessions}</div>
              <p className="text-xs text-gray-500">Currently online</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Unique IPs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueIPs}</div>
              <p className="text-xs text-gray-500">Different locations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgSessionDuration}min</div>
              <p className="text-xs text-gray-500">Average duration</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suspicious Activities Alert */}
      {suspiciousActivities.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              Suspicious Activities Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suspiciousActivities.map((anomaly, idx) => (
                <div key={idx} className="text-sm py-2 border-b last:border-b-0">
                  <Badge className={anomaly.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                    {anomaly.type}
                  </Badge>
                  <p className="mt-1">{anomaly.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Activities Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0088FE" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Activity Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium">Login Time</th>
                    <th className="px-4 py-2 text-left font-medium">IP Address</th>
                    <th className="px-4 py-2 text-left font-medium">Device</th>
                    <th className="px-4 py-2 text-left font-medium">Duration</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(session.login_time).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{session.ip_address}</td>
                      <td className="px-4 py-3 text-xs">
                        {session.navigateur} / {session.os}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {session.duration_minutes ? `${session.duration_minutes}min` : 'Active'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={session.statut === 'actif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {session.statut}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No activities found</p>
            ) : (
              activities.map((activity, idx) => (
                <div key={idx} className="border rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getActionColor(activity.action)}>
                          {activity.action}
                        </Badge>
                        <Badge className={getSeverityColor(activity.severity)}>
                          {activity.severity}
                        </Badge>
                      </div>
                      <p className="text-sm">{activity.description}</p>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <Globe className="w-3 h-3" />
                        {activity.ip_address}
                        <Smartphone className="w-3 h-3 ml-2" />
                        {activity.navigateur}
                        <Clock className="w-3 h-3 ml-2" />
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
