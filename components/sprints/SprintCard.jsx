'use client';

import { motion } from 'framer-motion';
import { Calendar, FolderKanban, Edit2, Trash2, Play, CheckCircle, ListTodo } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function SprintCard({
  sprint,
  idx,
  getSprintTasks,
  getProjectName,
  canManageSprints,
  openEditDialog,
  handleDeleteSprint,
  deletingSprintId,
  handleStartSprint,
  startingSprintId,
  handleCompleteSprint,
  completingSprintId,
  openManageTasksDialog,
  formatDate,
  _t,
}) {
  const sprintTasks = getSprintTasks(sprint._id);
  const plannedPoints =
    sprint.story_points_planifiés || sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const completedPoints =
    sprint.story_points_complétés !== undefined
      ? sprint.story_points_complétés
      : sprintTasks
          .filter((t) => t.statut === 'Terminé')
          .reduce((sum, t) => sum + (t.story_points || 0), 0);
  const progressPercent =
    plannedPoints > 0 ? Math.round((completedPoints / plannedPoints) * 100) : 0;
  const velocity = sprint.velocity || completedPoints;
  const totalTasks = sprintTasks.length;
  const completedTasks = sprintTasks.filter((t) => t.statut === 'Terminé').length;

  const statusLabel =
    sprint.statut === 'Actif' ? 'En cours' : sprint.statut === 'Terminé' ? 'Finalisé' : 'Planifié';

  return (
    <motion.div
      key={sprint._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{sprint.nom}</CardTitle>
              {/* Projet associé */}
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <FolderKanban className="w-3.5 h-3.5" />
                <span className="truncate">{getProjectName(sprint.projet_id)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  sprint.statut === 'Actif'
                    ? 'default'
                    : sprint.statut === 'Terminé'
                      ? 'secondary'
                      : 'outline'
                }
                className={
                  sprint.statut === 'Actif'
                    ? 'bg-blue-600 text-white'
                    : sprint.statut === 'Terminé'
                      ? 'bg-green-600 text-white'
                      : ''
                }
              >
                {statusLabel}
              </Badge>
              {/* Boutons Modifier/Supprimer */}
              {canManageSprints('gererSprints') && sprint.statut !== 'Terminé' && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-gray-500 hover:text-indigo-600"
                    onClick={() => openEditDialog(sprint)}
                    title="Modifier la période"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-gray-500 hover:text-red-600"
                    onClick={() => handleDeleteSprint(sprint._id, sprint.nom)}
                    disabled={deletingSprintId === sprint._id}
                    title="Supprimer la période"
                  >
                    {deletingSprintId === sprint._id ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
          {sprint.objectif && (
            <CardDescription className="line-clamp-2 mt-2 text-xs">
              <strong className="text-gray-700 dark:text-gray-300">Objectif : </strong>
              {sprint.objectif}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Dates */}
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>
                Du {formatDate(sprint.date_début)} au {formatDate(sprint.date_fin)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Avancement des objectifs</span>
                <span
                  className={`font-semibold ${
                    progressPercent >= 80
                      ? 'text-green-600'
                      : progressPercent >= 50
                        ? 'text-yellow-600'
                        : 'text-gray-600'
                  }`}
                >
                  {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
              <div>
                <p className="text-base font-bold text-indigo-600">
                  {completedPoints}
                  <span className="text-xs text-gray-400">/{plannedPoints}</span>
                </p>
                <p className="text-[11px] text-gray-500">Points d'effort</p>
              </div>
              <div>
                <p className="text-base font-bold text-green-600">
                  {completedTasks}
                  <span className="text-xs text-gray-400">/{totalTasks}</span>
                </p>
                <p className="text-[11px] text-gray-500">Tâches finies</p>
              </div>
              <div>
                <p className="text-base font-bold text-purple-600">{velocity} pts</p>
                <p className="text-[11px] text-gray-500">Total réalisé</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-2">
                {canManageSprints('gererSprints') && sprint.statut === 'Planifié' && (
                  <Button
                    size="sm"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => handleStartSprint(sprint._id)}
                    disabled={startingSprintId === sprint._id}
                  >
                    {startingSprintId === sprint._id ? (
                      <>
                        <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Lancement...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Lancer la période
                      </>
                    )}
                  </Button>
                )}
                {canManageSprints('gererSprints') && sprint.statut === 'Actif' && (
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleCompleteSprint(sprint._id)}
                    disabled={completingSprintId === sprint._id}
                  >
                    {completingSprintId === sprint._id ? (
                      <>
                        <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Clôture en cours...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Clôturer la période
                      </>
                    )}
                  </Button>
                )}
                {sprint.statut === 'Terminé' && (
                  <div className="flex-1 text-center py-2 bg-green-50 dark:bg-green-950/40 rounded-lg">
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Période accomplie avec succès
                    </span>
                  </div>
                )}
              </div>
              {/* Bouton pour gérer les tâches du sprint */}
              {canManageSprints('gererSprints') && sprint.statut !== 'Terminé' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => openManageTasksDialog(sprint)}
                >
                  <ListTodo className="w-4 h-4 mr-1 text-indigo-600" />
                  Affecter les tâches ({totalTasks})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
