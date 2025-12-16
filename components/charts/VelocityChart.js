'use client';

import { useMemo } from 'react';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Target } from 'lucide-react';

/**
 * Velocity Chart Component
 * Shows team velocity across sprints with average velocity line
 */
export default function VelocityChart({ sprints = [], tasks = [] }) {
  const chartData = useMemo(() => {
    // Only include completed sprints or active sprint
    const relevantSprints = sprints
      .filter(s => s.statut === 'Terminé' || s.statut === 'Actif')
      .sort((a, b) => new Date(a.date_début) - new Date(b.date_début))
      .slice(-10); // Last 10 sprints

    return relevantSprints.map(sprint => {
      const sprintTasks = tasks.filter(t => t.sprint_id === sprint._id);
      const completedTasks = sprintTasks.filter(t => t.statut === 'Terminé');

      // Calculate from tasks
      const plannedFromTasks = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
      const completedFromTasks = completedTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);

      // Prefer stored metrics if available
      const planned = sprint.story_points_planifiés || plannedFromTasks;
      const completed = sprint.story_points_complétés !== undefined ? sprint.story_points_complétés : completedFromTasks;
      const velocity = sprint.velocity || completed;

      // Calculate engagement based on best available data
      const engagement = planned > 0 ? Math.round((completed / planned) * 100) : 0;

      return {
        name: sprint.nom.length > 15 ? sprint.nom.substring(0, 12) + '...' : sprint.nom,
        fullName: sprint.nom,
        planifié: planned,
        complété: completed,
        velocity: velocity,
        statut: sprint.statut,
        engagement: engagement,
        // Add date for better sorting/debugging
        date_début: sprint.date_début
      };
    });
  }, [sprints, tasks]);

  const averageVelocity = useMemo(() => {
    if (chartData.length === 0) return 0;
    const completedSprints = chartData.filter(d => d.statut === 'Terminé');
    if (completedSprints.length === 0) return 0;
    const total = completedSprints.reduce((sum, d) => sum + d.complété, 0);
    return Math.round(total / completedSprints.length);
  }, [chartData]);

  const predictedCapacity = useMemo(() => {
    // Use last 3 sprints for more accurate prediction
    const lastSprints = chartData.filter(d => d.statut === 'Terminé').slice(-3);
    if (lastSprints.length === 0) return averageVelocity;
    const total = lastSprints.reduce((sum, d) => sum + d.complété, 0);
    return Math.round(total / lastSprints.length);
  }, [chartData, averageVelocity]);

  const trend = useMemo(() => {
    const completedSprints = chartData.filter(d => d.statut === 'Terminé');
    if (completedSprints.length < 2) return 0;
    const lastTwo = completedSprints.slice(-2);
    return lastTwo[1].complété - lastTwo[0].complété;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <TrendingUp className="w-12 h-12 mb-2 text-gray-300" />
            <p>Aucun sprint terminé pour calculer la vélocité</p>
            <p className="text-sm text-gray-400 mt-1">La vélocité sera affichée après le premier sprint complété</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg min-w-48">
          <p className="font-medium text-gray-900 mb-2">{data?.fullName || label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Planifié:</span>
              <span className="font-medium">{data?.planifié} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Complété:</span>
              <span className="font-medium text-green-600">{data?.complété} pts</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="text-gray-600">Engagement:</span>
              <span className={`font-medium ${data?.engagement >= 80 ? 'text-green-600' : data?.engagement >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {data?.engagement}%
              </span>
            </div>
          </div>
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
              <TrendingUp className="w-5 h-5 text-green-600" />
              Vélocité de l'équipe
            </CardTitle>
            <CardDescription>
              Story points complétés par sprint
            </CardDescription>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{averageVelocity}</div>
              <div className="text-xs text-gray-500">Moyenne</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{predictedCapacity}</div>
              <div className="text-xs text-gray-500">Prédiction</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? '+' : ''}{trend}
                {trend !== 0 && (
                  <Target className={`w-4 h-4 ${trend >= 0 ? 'rotate-0' : 'rotate-180'}`} />
                )}
              </div>
              <div className="text-xs text-gray-500">Tendance</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                label={{ value: 'Story Points', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine
                y={averageVelocity}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{ value: `Moyenne: ${averageVelocity}`, position: 'right', fill: '#f59e0b', fontSize: 11 }}
              />
              <Bar
                dataKey="planifié"
                fill="#e5e7eb"
                name="Planifié"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="complété"
                fill="#4f46e5"
                name="Complété"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="complété"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', strokeWidth: 2 }}
                name="Tendance"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{chartData.length}</div>
            <div className="text-xs text-gray-500">Sprints analysés</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {chartData.reduce((sum, d) => sum + d.planifié, 0)}
            </div>
            <div className="text-xs text-gray-500">Total planifié</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {chartData.reduce((sum, d) => sum + d.complété, 0)}
            </div>
            <div className="text-xs text-gray-500">Total complété</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-indigo-600">
              {chartData.length > 0
                ? Math.round(chartData.reduce((sum, d) => sum + d.engagement, 0) / chartData.length)
                : 0}%
            </div>
            <div className="text-xs text-gray-500">Engagement moyen</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
