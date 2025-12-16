'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';

/**
 * Burndown Chart Component
 * Shows remaining work vs ideal burndown line for a sprint
 */
export default function BurndownChart({ sprint, tasks = [] }) {
  const chartData = useMemo(() => {
    if (!sprint?.date_début || !sprint?.date_fin) return [];

    const startDate = new Date(sprint.date_début);
    const endDate = new Date(sprint.date_fin);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate total story points for this sprint
    const sprintTasks = tasks.filter(t => t.sprint_id === sprint._id);
    const totalPointsFromTasks = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
    // Prefer stored story_points_planifiés if available
    const totalPoints = sprint.story_points_planifiés || totalPointsFromTasks;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Use existing burndown_data if available
    if (sprint.burndown_data && sprint.burndown_data.length > 0) {
      // Create a map of stored data by date
      const storedDataMap = new Map();
      sprint.burndown_data.forEach(entry => {
        const dateKey = new Date(entry.date).toDateString();
        storedDataMap.set(dateKey, entry);
      });

      // Build complete chart data for all days
      const data = [];
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateKey = currentDate.toDateString();

        // Calculate ideal burndown (linear)
        const idealRemaining = Math.max(0, totalPoints - (totalPoints / Math.max(1, totalDays - 1)) * i);

        // Get stored data for this day if available
        const storedEntry = storedDataMap.get(dateKey);

        // Only show actual values for past/present dates
        let actualRemaining = null;
        if (currentDate <= today) {
          if (storedEntry && storedEntry.story_points_restants !== null) {
            actualRemaining = storedEntry.story_points_restants;
          } else {
            // Calculate from tasks if no stored data
            const completedByDate = sprintTasks.filter(t => {
              if (t.statut !== 'Terminé') return false;
              const completedDate = t.date_complétion ? new Date(t.date_complétion) : new Date(t.updated_at);
              return completedDate <= currentDate;
            });
            const completedPoints = completedByDate.reduce((sum, t) => sum + (t.story_points || 0), 0);
            actualRemaining = totalPoints - completedPoints;
          }
        }

        data.push({
          date: currentDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          fullDate: currentDate.toLocaleDateString('fr-FR'),
          réel: actualRemaining,
          idéal: storedEntry?.idéal ?? Math.round(idealRemaining * 10) / 10,
          jour: i + 1
        });
      }
      return data;
    }

    // Generate chart data based on task completion dates (fallback)
    const data = [];

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      // Calculate ideal burndown (linear)
      const idealRemaining = Math.max(0, totalPoints - (totalPoints / Math.max(1, totalDays - 1)) * i);

      // Calculate actual remaining points up to this date
      let actualRemaining = null;
      if (currentDate <= today) {
        const completedByDate = sprintTasks.filter(t => {
          if (t.statut !== 'Terminé') return false;
          const completedDate = t.date_complétion ? new Date(t.date_complétion) : new Date(t.updated_at);
          return completedDate <= currentDate;
        });
        const completedPoints = completedByDate.reduce((sum, t) => sum + (t.story_points || 0), 0);
        actualRemaining = totalPoints - completedPoints;
      }

      data.push({
        date: currentDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        fullDate: currentDate.toLocaleDateString('fr-FR'),
        réel: actualRemaining,
        idéal: Math.round(idealRemaining * 10) / 10,
        jour: i + 1
      });
    }

    return data;
  }, [sprint, tasks]);

  const totalPoints = useMemo(() => {
    // Prefer stored story_points_planifiés
    if (sprint?.story_points_planifiés) return sprint.story_points_planifiés;
    const sprintTasks = tasks.filter(t => t.sprint_id === sprint?._id);
    return sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  }, [sprint, tasks]);

  const completedPoints = useMemo(() => {
    // Prefer stored story_points_complétés
    if (sprint?.story_points_complétés !== undefined) return sprint.story_points_complétés;
    const sprintTasks = tasks.filter(t => t.sprint_id === sprint?._id && t.statut === 'Terminé');
    return sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  }, [sprint, tasks]);

  if (!sprint || chartData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <TrendingDown className="w-12 h-12 mb-2 text-gray-300" />
            <p>Aucune donnée de burndown disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value !== null ? `${entry.value} pts` : 'N/A'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-indigo-600" />
              Burndown Chart
            </CardTitle>
            <CardDescription>
              Progression du sprint - {completedPoints}/{totalPoints} story points complétés
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">
              {totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-500">complété</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                label={{ value: 'Story Points', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="#000" />
              <Line
                type="monotone"
                dataKey="idéal"
                stroke="#9ca3af"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                name="Idéal"
              />
              <Line
                type="monotone"
                dataKey="réel"
                stroke="#4f46e5"
                strokeWidth={3}
                dot={{ fill: '#4f46e5', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                name="Réel"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
