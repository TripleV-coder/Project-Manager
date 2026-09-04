'use client';

import { ListTodo, Check, User, X, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ManageSprintTasksDialog({
  manageTasksDialogOpen,
  setManageTasksDialogOpen,
  selectedSprintForTasks,
  setSelectedSprintForTasks,
  availableTasks,
  setAvailableTasks,
  compareIds,
  handleToggleTaskInSprint,
  assigningTask,
  _t,
}) {
  const inSprintTasks = availableTasks.filter((tItem) =>
    compareIds(tItem.sprint_id?._id || tItem.sprint_id, selectedSprintForTasks?._id)
  );
  const outOfSprintTasks = availableTasks.filter((tItem) => !tItem.sprint_id);

  return (
    <Dialog
      open={manageTasksDialogOpen}
      onOpenChange={(open) => {
        setManageTasksDialogOpen(open);
        if (!open) {
          setSelectedSprintForTasks(null);
          setAvailableTasks([]);
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-indigo-600" />
            Affecter les tâches à : {selectedSprintForTasks?.nom}
          </DialogTitle>
          <DialogDescription>
            Ajoutez les tâches que vous prévoyez de réaliser pendant cette période, ou retirez
            celles qui sont reportées.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {availableTasks.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">Aucune tâche disponible pour ce projet</p>
              <p className="text-xs text-gray-400 mt-1">
                Créez d'abord des tâches dans le projet pour pouvoir les intégrer dans cette période
                de travail.
              </p>
            </div>
          ) : (
            <>
              {/* Info explicative */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-lg flex items-center gap-2 text-xs text-blue-900 dark:text-blue-300">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  Cliquez sur <strong>+</strong> pour inclure une tâche dans cette période, ou sur{' '}
                  <strong>✕</strong> pour la remettre en attente.
                </span>
              </div>

              {/* Tâches déjà incluses dans la période */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-600" />
                    Tâches au programme ({inSprintTasks.length})
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    Total :{' '}
                    {inSprintTasks.reduce((sum, tItem) => sum + (tItem.story_points || 0), 0)} pts
                    d'effort
                  </span>
                </h4>
                <div className="space-y-2">
                  {inSprintTasks.map((task) => (
                    <div
                      key={task._id}
                      className="flex items-center justify-between p-3 bg-green-50/70 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {task.titre}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-white dark:bg-gray-800"
                          >
                            Effort : {task.story_points || 0} pts
                          </Badge>
                          <Badge
                            variant={task.statut === 'Terminé' ? 'secondary' : 'default'}
                            className={`text-[10px] ${
                              task.statut === 'Terminé' ? 'bg-green-600 text-white' : ''
                            }`}
                          >
                            {task.statut}
                          </Badge>
                        </div>
                        {task.assigné_à && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3 text-indigo-500" />
                            {task.assigné_à.nom_complet || task.assigné_à.email || 'Assigné'}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 h-8 px-2"
                        onClick={() => handleToggleTaskInSprint(task._id, false)}
                        disabled={assigningTask === task._id}
                        title="Retirer de la période"
                      >
                        {assigningTask === task._id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                  {inSprintTasks.length === 0 && (
                    <p className="text-xs text-gray-400 italic p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed text-center">
                      Aucune tâche n'est encore sélectionnée pour cette période.
                    </p>
                  )}
                </div>
              </div>

              {/* Tâches disponibles dans la réserve (Backlog) */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4 text-gray-500" />
                  Tâches en réserve / En attente ({outOfSprintTasks.length})
                </h4>
                <div className="space-y-2">
                  {outOfSprintTasks.map((task) => (
                    <div
                      key={task._id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {task.titre}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-white dark:bg-gray-800"
                          >
                            Effort : {task.story_points || 0} pts
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {task.statut}
                          </Badge>
                        </div>
                        {task.assigné_à && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3 text-gray-400" />
                            {task.assigné_à.nom_complet || task.assigné_à.email || 'Assigné'}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 h-8 px-2"
                        onClick={() => handleToggleTaskInSprint(task._id, true)}
                        disabled={assigningTask === task._id}
                        title="Ajouter au programme de la période"
                      >
                        {assigningTask === task._id ? (
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                  {outOfSprintTasks.length === 0 && (
                    <p className="text-xs text-gray-400 italic p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed text-center">
                      Toutes les tâches du projet sont déjà attribuées à des périodes de travail.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setManageTasksDialogOpen(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
