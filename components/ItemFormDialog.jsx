'use client';

import { useMemo } from 'react';
import { Layers, BookOpen, CheckSquare, Bug, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation, useFormatters } from '@/contexts/AppSettingsContext';
import { useItemFormValidation } from '@/hooks/useItemFormValidation';
import { ItemFormFields } from '@/components/ItemFormFields';

/**
 * Composant de formulaire unifie pour creer/editer des Epics, Stories, Taches et Bugs
 *
 * @param {Object} props
 * @param {boolean} props.open - Etat d'ouverture du dialog
 * @param {Function} props.onOpenChange - Callback pour changer l'etat d'ouverture
 * @param {string} props.type - Type d'item a creer ('Epic', 'Story', 'Tache', 'Bug')
 * @param {Object} props.editingItem - Item a editer (null pour creation)
 * @param {Object} props.parentItem - Item parent (pour creation de sous-elements)
 * @param {string} props.projectId - ID du projet selectionne
 * @param {Array} props.projects - Liste des projets disponibles
 * @param {Array} props.users - Liste des utilisateurs disponibles
 * @param {Array} props.sprints - Liste des sprints disponibles
 * @param {Array} props.deliverables - Liste des livrables disponibles
 * @param {Array} props.epics - Liste des epics disponibles (pour parent)
 * @param {Array} props.stories - Liste des stories disponibles (pour parent)
 * @param {boolean} props.dataLoading - Indique si les donnees sont en cours de chargement
 * @param {boolean} props.dataReady - Indique si les donnees sont pretes
 * @param {Object} props.dataErrors - Erreurs de chargement des donnees
 * @param {Function} props.onSuccess - Callback apres creation/modification reussie
 * @param {Function} props.onUnauthorized - Callback en cas d'erreur 401
 * @param {boolean} props.showProjectSelect - Afficher le selecteur de projet
 * @param {boolean} props.showTypeSelect - Afficher le selecteur de type
 * @param {boolean} props.showParentSelect - Afficher le selecteur de parent
 */
export function ItemFormDialog({
  open,
  onOpenChange,
  type = 'Tâche',
  editingItem = null,
  parentItem = null,
  projectId = '',
  projects = [],
  users = [],
  sprints = [],
  deliverables = [],
  epics = [],
  stories = [],
  dataLoading = false,
  dataReady = true,
  dataErrors = {},
  onSuccess = () => {},
  onUnauthorized = () => {},
  showProjectSelect = false,
  showTypeSelect = false,
  showParentSelect = false,
  onProjectChange = null,
}) {
  const { t } = useTranslation();
  const { formatDate: _formatDate } = useFormatters();

  const ITEM_TYPES = useMemo(
    () => ({
      Épic: {
        icon: Layers,
        iconColor: 'text-purple-600',
        label: t('epic'),
        articleUn: 'un',
      },
      Story: {
        icon: BookOpen,
        iconColor: 'text-blue-600',
        label: t('story'),
        articleUn: 'une',
      },
      Tâche: {
        icon: CheckSquare,
        iconColor: 'text-green-600',
        label: t('task'),
        articleUn: 'une',
      },
      Bug: {
        icon: Bug,
        iconColor: 'text-red-600',
        label: t('bug'),
        articleUn: 'un',
      },
    }),
    [t]
  );

  // Hook de validation / logique formulaire
  const {
    formData,
    submitting,
    validationErrors,
    isEditing,
    currentType,
    fieldVisibility,
    handleSubmit,
    handleClose,
    updateField,
  } = useItemFormValidation({
    open,
    editingItem,
    parentItem,
    type,
    projectId,
    dataReady,
    dataLoading,
    onSuccess,
    onUnauthorized,
    onOpenChange,
    t,
  });

  const handleFieldUpdate = (field, value) => {
    updateField(field, value);
    if (field === 'projet_id' && typeof onProjectChange === 'function') {
      onProjectChange(value);
    }
  };

  const typeConfig = ITEM_TYPES[currentType] || ITEM_TYPES['Tâche'];
  const TypeIcon = typeConfig.icon;

  // Verifier si des donnees sont manquantes
  const hasDataErrors = Object.values(dataErrors).some((e) => e !== null);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className={`w-5 h-5 ${typeConfig.iconColor}`} />
            {isEditing ? t('edit') : t('create')} {typeConfig.articleUn} {typeConfig.label}
          </DialogTitle>
          {parentItem && <DialogDescription>Rattaché à : {parentItem.titre}</DialogDescription>}
        </DialogHeader>

        {/* Alerte si donnees en chargement */}
        {dataLoading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>{t('loadingData')}</AlertDescription>
          </Alert>
        )}

        {/* Alerte si erreurs de chargement */}
        {hasDataErrors && !dataLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('dataLoadError')}</AlertDescription>
          </Alert>
        )}

        <ItemFormFields
          formData={formData}
          validationErrors={validationErrors}
          submitting={submitting}
          isEditing={isEditing}
          currentType={currentType}
          fieldVisibility={fieldVisibility}
          updateField={handleFieldUpdate}
          ITEM_TYPES={ITEM_TYPES}
          showTypeSelect={showTypeSelect}
          showProjectSelect={showProjectSelect}
          showParentSelect={showParentSelect}
          projectId={projectId}
          projects={projects}
          users={users}
          sprints={sprints}
          deliverables={deliverables}
          epics={epics}
          stories={stories}
          dataLoading={dataLoading}
          dataErrors={dataErrors}
          parentItem={parentItem}
          t={t}
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={submitting || (dataLoading && !isEditing) || !formData.titre.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? t('updating') : t('creating')}
              </>
            ) : isEditing ? (
              t('save')
            ) : (
              t('create')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ItemFormDialog;
