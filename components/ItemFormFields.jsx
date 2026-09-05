'use client';

import { Layers, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Champs de formulaire pour le composant ItemFormDialog.
 *
 * Ce composant rend toutes les sections d'inputs (titre, description, priorite,
 * story points, criteres d'acceptation, parent, assignee, sprint, estimation,
 * livrable) en fonction du type d'item et des flags de visibilite.
 *
 * @param {Object} props
 * @param {Object} props.formData - Donnees du formulaire
 * @param {Object} props.validationErrors - Erreurs de validation par champ
 * @param {boolean} props.submitting - Formulaire en cours de soumission
 * @param {boolean} props.isEditing - Mode edition
 * @param {string} props.currentType - Type d'item courant
 * @param {Object} props.fieldVisibility - Visibilite des champs par type
 * @param {Function} props.updateField - Callback pour mettre a jour un champ
 * @param {Object} props.ITEM_TYPES - Configuration des types d'items
 * @param {boolean} props.showTypeSelect - Afficher le selecteur de type
 * @param {boolean} props.showProjectSelect - Afficher le selecteur de projet
 * @param {boolean} props.showParentSelect - Afficher le selecteur de parent
 * @param {string} props.projectId - ID du projet
 * @param {Array} props.projects - Liste des projets
 * @param {Array} props.users - Liste des utilisateurs
 * @param {Array} props.sprints - Liste des sprints
 * @param {Array} props.deliverables - Liste des livrables
 * @param {Array} props.epics - Liste des epics
 * @param {Array} props.stories - Liste des stories
 * @param {boolean} props.dataLoading - Donnees en chargement
 * @param {Object} props.dataErrors - Erreurs de chargement
 * @param {Object|null} props.parentItem - Item parent
 * @param {Function} props.t - Fonction de traduction
 */
export function ItemFormFields({
  formData,
  validationErrors,
  submitting,
  isEditing,
  currentType,
  fieldVisibility,
  updateField,
  ITEM_TYPES,
  showTypeSelect = false,
  showProjectSelect = false,
  showParentSelect = false,
  projectId = '',
  projects = [],
  users = [],
  sprints = [],
  deliverables = [],
  epics = [],
  stories = [],
  dataLoading = false,
  dataErrors = {},
  parentItem = null,
  t = (k) => k,
}) {
  const {
    showSprintField,
    showAssigneeField,
    showEstimationField,
    showAcceptanceCriteria,
    showDeliverableField,
  } = fieldVisibility;

  return (
    <div className="space-y-4 py-4">
      {/* Selecteur de type (optionnel) */}
      {showTypeSelect && !isEditing && (
        <div className="space-y-2">
          <Label>{t('typeQuestion')}</Label>
          <Select value={formData.type} onValueChange={(v) => updateField('type', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ITEM_TYPES).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.iconColor}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Selecteur de projet (optionnel) */}
      {showProjectSelect && !isEditing && (
        <div className="space-y-2">
          <Label>{t('projectQuestion')} *</Label>
          <Select
            value={formData.projet_id || (projectId && projectId !== 'all' ? projectId : '')}
            onValueChange={(v) => updateField('projet_id', v)}
            disabled={dataLoading || projects.length === 0}
          >
            <SelectTrigger className={validationErrors.projet ? 'border-red-500' : ''}>
              <SelectValue placeholder={t('selectProject')} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.projet && (
            <p className="text-xs text-red-500">{validationErrors.projet}</p>
          )}
        </div>
      )}

      {/* Titre */}
      <div className="space-y-2">
        <Label>{t('itemTitleQuestion')} *</Label>
        <Input
          value={formData.titre}
          onChange={(e) => updateField('titre', e.target.value)}
          placeholder={
            currentType === 'Épic'
              ? 'Un nom inspirant pour cette étape majeure ?'
              : currentType === 'Story'
                ? "Ex: En tant qu'utilisateur, je rêve de..."
                : 'Quelle action allons-nous mener ?'
          }
          className={validationErrors.titre ? 'border-red-500' : ''}
          disabled={submitting}
        />
        {validationErrors.titre && <p className="text-xs text-red-500">{validationErrors.titre}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>
          {currentType === 'Épic'
            ? t('objectivesQuestion')
            : currentType === 'Story'
              ? t('itemDescriptionQuestion')
              : t('taskDescription')}
        </Label>
        <Textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder={
            currentType === 'Épic'
              ? 'Partagez la vision globale de ce chantier...'
              : currentType === 'Story'
                ? "Décrivez le besoin et la valeur apportée à l'utilisateur..."
                : 'Détaillez ici les petits pas à accomplir...'
          }
          rows={currentType === 'Story' ? 4 : 3}
          disabled={submitting}
        />
      </div>

      {/* Priorite et Story Points */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('itemPriorityQuestion')}</Label>
          <Select
            value={formData.priorité}
            onValueChange={(v) => updateField('priorité', v)}
            disabled={submitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Critique">Critique</SelectItem>
              <SelectItem value="Haute">Haute</SelectItem>
              <SelectItem value="Moyenne">Moyenne</SelectItem>
              <SelectItem value="Basse">Basse</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>
            {currentType === 'Épic' ? t('epicDifficultyQuestion') : t('difficultyQuestion')}
          </Label>
          <Input
            type="number"
            min="0"
            value={formData.story_points}
            onChange={(e) => updateField('story_points', e.target.value)}
            placeholder={currentType === 'Épic' ? 'Ex: 40' : 'Ex: 5'}
            className={validationErrors.story_points ? 'border-red-500' : ''}
            disabled={submitting}
          />
          {validationErrors.story_points && (
            <p className="text-xs text-red-500">{validationErrors.story_points}</p>
          )}
        </div>
      </div>

      {/* Criteres d'acceptation (Story uniquement) */}
      {showAcceptanceCriteria && (
        <div className="space-y-2">
          <Label>{t('itemSuccessProof')}</Label>
          <Textarea
            value={formData.acceptance_criteria}
            onChange={(e) => updateField('acceptance_criteria', e.target.value)}
            placeholder="Un critère par ligne..."
            rows={3}
            disabled={submitting}
          />
        </div>
      )}

      {/* Selecteur de parent (optionnel) */}
      {showParentSelect && !parentItem && (epics.length > 0 || stories.length > 0) && (
        <div className="space-y-2">
          <Label>{t('parentQuestion')}</Label>
          <Select
            value={formData.parent_id || 'none'}
            onValueChange={(v) => updateField('parent_id', v === 'none' ? '' : v)}
            disabled={submitting || dataLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('noParent')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noParent')}</SelectItem>
              {currentType !== 'Épic' &&
                epics.map((e) => (
                  <SelectItem key={e._id} value={e._id}>
                    <div className="flex items-center gap-2">
                      <Layers className="w-3 h-3 text-purple-600" />
                      {e.titre}
                    </div>
                  </SelectItem>
                ))}
              {currentType === 'Tâche' &&
                stories.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3 h-3 text-blue-600" />
                      {s.titre}
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Champs pour Stories et Taches */}
      {showAssigneeField && (
        <div className="space-y-2">
          <Label>{t('itemAssigneeQuestion')}</Label>
          <Select
            value={formData.assigné_à || 'none'}
            onValueChange={(v) => updateField('assigné_à', v === 'none' ? '' : v)}
            disabled={submitting || dataLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('unassigned')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('unassigned')}</SelectItem>
              {users.map((u) => (
                <SelectItem key={u._id} value={u._id}>
                  {u.nom_complet || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {users.length === 0 && !dataLoading && !dataErrors.users && (
            <p className="text-xs text-muted-foreground">
              Ajoutez la personne à l&apos;équipe du projet avant de lui assigner une tâche.
            </p>
          )}
          {dataErrors.users && (
            <p className="text-xs text-amber-600">
              Oups, nous n&apos;avons pas pu charger la liste des membres pour le moment.
            </p>
          )}
        </div>
      )}

      {/* Sprint et Date d'echeance */}
      {showSprintField && (
        <div className="grid grid-cols-2 gap-4">
          {sprints.length > 0 && (
            <div className="space-y-2">
              <Label>{t('sprintQuestion')}</Label>
              <Select
                value={formData.sprint_id || 'backlog'}
                onValueChange={(v) => updateField('sprint_id', v === 'backlog' ? '' : v)}
                disabled={submitting || dataLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('noSprint')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">{t('noSprint')}</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.statut === 'Actif' ? '(Actif) ' : ''}
                      {s.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('estimatedDeadline')}</Label>
            <Input
              type="date"
              value={formData.date_échéance}
              onChange={(e) => updateField('date_échéance', e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
      )}

      {/* Estimation heures (Taches et Bugs) */}
      {showEstimationField && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('estimation')}</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={formData.estimation_heures}
              onChange={(e) => updateField('estimation_heures', e.target.value)}
              placeholder="Ex: 4"
              className={validationErrors.estimation_heures ? 'border-red-500' : ''}
              disabled={submitting}
            />
            {validationErrors.estimation_heures && (
              <p className="text-xs text-red-500">{validationErrors.estimation_heures}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>À quelle date prévoyez-vous de commencer ?</Label>
            <Input
              type="date"
              value={formData.date_début}
              onChange={(e) => updateField('date_début', e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
      )}

      {/* Livrable (Taches et Bugs) */}
      {showDeliverableField && deliverables.length > 0 && (
        <div className="space-y-2">
          <Label>{t('deliverableQuestion')}</Label>
          <Select
            value={formData.deliverable_id || 'none'}
            onValueChange={(v) => updateField('deliverable_id', v === 'none' ? '' : v)}
            disabled={submitting || dataLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('noDeliverable')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noDeliverable')}</SelectItem>
              {deliverables.map((d) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default ItemFormFields;
