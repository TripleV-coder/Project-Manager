'use client';

import { Zap, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SprintCard } from './SprintCard';

export function SprintList({
  sprints,
  getSprintTasks,
  getProjectName,
  canManageSprints,
  setCreateDialogOpen,
  openEditDialog,
  handleDeleteSprint,
  deletingSprintId,
  handleStartSprint,
  startingSprintId,
  handleCompleteSprint,
  completingSprintId,
  openManageTasksDialog,
  formatDate,
  t,
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            Toutes les Périodes de travail
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Consultez le statut, la progression et les tâches attribuées à chaque cycle
          </p>
        </div>
      </div>

      {sprints.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aucune période de travail planifiée
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm">
              Créez votre première période de travail (ex: "Semaine 1" ou "Phase de lancement") pour
              y associer des tâches et suivre l'avancement pas à pas.
            </p>
            {canManageSprints('gererSprints') && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Planifier une période
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sprints.map((sprint, idx) => (
            <SprintCard
              key={sprint._id}
              sprint={sprint}
              idx={idx}
              getSprintTasks={getSprintTasks}
              getProjectName={getProjectName}
              canManageSprints={canManageSprints}
              openEditDialog={openEditDialog}
              handleDeleteSprint={handleDeleteSprint}
              deletingSprintId={deletingSprintId}
              handleStartSprint={handleStartSprint}
              startingSprintId={startingSprintId}
              handleCompleteSprint={handleCompleteSprint}
              completingSprintId={completingSprintId}
              openManageTasksDialog={openManageTasksDialog}
              formatDate={formatDate}
              t={t}
            />
          ))}
        </div>
      )}
    </>
  );
}
