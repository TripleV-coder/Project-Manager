'use client';

import {
  Zap,
  Activity,
  CheckCircle,
  TrendingUp,
  Target,
  Clock,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import dynamic from 'next/dynamic';

const BurndownChart = dynamic(() => import('@/components/charts/BurndownChart'), { ssr: false });
const VelocityChart = dynamic(() => import('@/components/charts/VelocityChart'), { ssr: false });

export function SprintMetrics({
  sprints,
  tasks,
  globalStats,
  showCharts,
  setShowCharts,
  selectedSprintForChart,
  setSelectedSprintForChart,
  getSprintTasks,
}) {
  if (!sprints || sprints.length === 0) return null;

  return (
    <>
      {/* Explication synthétique pour tout utilisateur */}
      <div className="mb-6 p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-950 dark:text-indigo-200">
          <p className="font-semibold mb-0.5">
            Comment fonctionnent les périodes de travail (Sprints) ?
          </p>
          <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80">
            Un sprint est une période définie (ex : 1 à 2 semaines) où votre équipe s'engage sur un
            lot de tâches précises. Cela permet d'avancer étape par étape avec des objectifs clairs
            et mesurables.
          </p>
        </div>
      </div>

      {/* Global Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Périodes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {globalStats.total}
                </p>
                <span className="text-[10px] text-gray-400">Cycles planifiés</span>
              </div>
              <Zap className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">En cours</p>
                <p className="text-2xl font-bold text-blue-600">{globalStats.active}</p>
                <span className="text-[10px] text-blue-500">Période active</span>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Finalisées</p>
                <p className="text-2xl font-bold text-green-600">{globalStats.completed}</p>
                <span className="text-[10px] text-green-500">Périodes terminées</span>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Vitesse moyenne</p>
                <p className="text-2xl font-bold text-purple-600">{globalStats.avgVelocity} pts</p>
                <span className="text-[10px] text-purple-500">Effort réalisé / cycle</span>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Effort réalisé</p>
                <p className="text-2xl font-bold text-orange-600">
                  {globalStats.totalCompleted}
                  <span className="text-sm text-gray-400">/{globalStats.totalPlanned}</span>
                </p>
                <span className="text-[10px] text-orange-500">Points accomplis</span>
              </div>
              <Target className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Taux de réussite</p>
                <p
                  className={`text-2xl font-bold ${
                    globalStats.engagementRate >= 80
                      ? 'text-green-600'
                      : globalStats.engagementRate >= 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {globalStats.engagementRate}%
                </p>
                <span className="text-[10px] text-gray-400">Objectifs atteints</span>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="mb-8">
        <div
          className="flex items-center justify-between mb-4 cursor-pointer"
          onClick={() => setShowCharts(!showCharts)}
        >
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Graphiques d'avancement & de rythme
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Visualisez la régularité et le volume de travail accompli par votre équipe au fil du
              temps
            </p>
          </div>
          <Button variant="ghost" size="sm">
            {showCharts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {showCharts && (
          <Tabs defaultValue="velocity" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="velocity" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Vitesse de réalisation (Vélocité)
              </TabsTrigger>
              <TabsTrigger value="burndown" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Rythme d'avancement (Burndown)
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Bilan global
              </TabsTrigger>
            </TabsList>

            <TabsContent value="velocity">
              <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 italic">
                Ce graphique compare la quantité de travail prévue vs la quantité réellement
                terminée pour chaque période.
              </div>
              <VelocityChart sprints={sprints} tasks={tasks} />
            </TabsContent>

            <TabsContent value="burndown">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Suivez la réduction du travail restant jour par jour jusqu'à l'échéance.
                </div>
                <Select
                  value={selectedSprintForChart || ''}
                  onValueChange={setSelectedSprintForChart}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Choisir une période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les périodes</SelectItem>
                    {sprints.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.nom} (
                        {s.statut === 'Actif'
                          ? 'En cours'
                          : s.statut === 'Terminé'
                            ? 'Finalisé'
                            : 'Planifié'}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSprintForChart === 'all' ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-gray-500 py-8">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Sélectionnez une période précise pour afficher sa courbe d'avancement</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <BurndownChart
                  sprint={sprints.find((s) => s._id === selectedSprintForChart)}
                  tasks={tasks}
                />
              )}
            </TabsContent>

            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Bilan de réalisation des périodes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Taux de réussite par sprint */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                        Pourcentage d'actions complétées
                      </h4>
                      <div className="space-y-3">
                        {sprints
                          .filter((s) => s.statut === 'Terminé' || s.statut === 'Actif')
                          .slice(-5)
                          .map((sprint) => {
                            const sprintTasks = getSprintTasks(sprint._id);
                            const planned =
                              sprint.story_points_planifiés ||
                              sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
                            const completed =
                              sprint.story_points_complétés !== undefined
                                ? sprint.story_points_complétés
                                : sprintTasks
                                    .filter((t) => t.statut === 'Terminé')
                                    .reduce((sum, t) => sum + (t.story_points || 0), 0);
                            const percent =
                              planned > 0 ? Math.round((completed / planned) * 100) : 0;

                            return (
                              <div key={sprint._id} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {sprint.nom}
                                  </span>
                                  <span
                                    className={`font-medium ${
                                      percent >= 80
                                        ? 'text-green-600'
                                        : percent >= 50
                                          ? 'text-yellow-600'
                                          : 'text-red-600'
                                    }`}
                                  >
                                    {percent}%
                                  </span>
                                </div>
                                <Progress value={percent} className="h-2" />
                              </div>
                            );
                          })}
                        {sprints.filter((s) => s.statut === 'Terminé' || s.statut === 'Actif')
                          .length === 0 && (
                          <p className="text-gray-500 text-sm">
                            Aucune période active ou terminée pour le moment
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Statistiques de performance */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                        Chiffres clés
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <span className="text-gray-600 dark:text-gray-300 font-medium block">
                              Vitesse moyenne
                            </span>
                            <span className="text-xs text-gray-400">Points réalisés par cycle</span>
                          </div>
                          <span className="text-xl font-bold text-indigo-600">
                            {globalStats.avgVelocity} pts
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <span className="text-gray-600 dark:text-gray-300 font-medium block">
                              Taux d'engagement
                            </span>
                            <span className="text-xs text-gray-400">
                              % de travail prévu mené à terme
                            </span>
                          </div>
                          <span className="text-xl font-bold text-green-600">
                            {globalStats.engagementRate}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <span className="text-gray-600 dark:text-gray-300 font-medium block">
                              Total des tâches
                            </span>
                            <span className="text-xs text-gray-400">
                              Sur l'ensemble des projets
                            </span>
                          </div>
                          <span className="text-xl font-bold text-gray-900 dark:text-white">
                            {tasks.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}
