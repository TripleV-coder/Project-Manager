'use client';

import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProjectHeader({
  project,
  canEdit,
  canDelete,
  editMode,
  setEditMode,
  deletingProject,
  handleDeleteProject,
  router,
  getStatusColor,
  getPriorityColor,
}) {
  if (!project) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/projects')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{project.nom}</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.statut)}`}
            >
              {project.statut}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(project.priorité)}`}
            >
              {project.priorité}
            </span>
          </div>
          {project.chef_projet && (
            <p className="text-sm text-gray-500 mt-1">
              Chef de projet : {project.chef_projet.nom_complet || project.chef_projet.email}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canEdit && (
          <Button
            variant={editMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className={editMode ? 'bg-indigo-600' : ''}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            {editMode ? 'Fermer' : 'Modifier'}
          </Button>
        )}
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteProject}
            disabled={deletingProject}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deletingProject ? 'Suppression...' : 'Supprimer'}
          </Button>
        )}
      </div>
    </div>
  );
}
