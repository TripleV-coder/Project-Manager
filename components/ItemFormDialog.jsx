'use client';

import { useState, useEffect, useCallback } from 'react';
import { Layers, BookOpen, CheckSquare, Bug, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { safeFetch } from '@/lib/fetch-with-timeout';
import { toast } from 'sonner';

// Configuration des types d'items
const ITEM_TYPES = {
  'Épic': {
    icon: Layers,
    iconColor: 'text-purple-600',
    label: 'Épic',
    articleUn: 'un',
    articleUne: 'un'
  },
  'Story': {
    icon: BookOpen,
    iconColor: 'text-blue-600',
    label: 'Story',
    articleUn: 'une',
    articleUne: 'une'
  },
  'Tâche': {
    icon: CheckSquare,
    iconColor: 'text-green-600',
    label: 'Tâche',
    articleUn: 'une',
    articleUne: 'une'
  },
  'Bug': {
    icon: Bug,
    iconColor: 'text-red-600',
    label: 'Bug',
    articleUn: 'un',
    articleUne: 'un'
  }
};

// Valeurs initiales du formulaire
const INITIAL_FORM_DATA = {
  titre: '',
  description: '',
  type: 'Tâche',
  priorité: 'Moyenne',
  story_points: '',
  assigné_à: '',
  sprint_id: '',
  date_début: '',
  date_échéance: '',
  estimation_heures: '',
  acceptance_criteria: '',
  deliverable_id: '',
  parent_id: ''
};

/**
 * Composant de formulaire unifié pour créer/éditer des Épics, Stories, Tâches et Bugs
 *
 * @param {Object} props
 * @param {boolean} props.open - État d'ouverture du dialog
 * @param {Function} props.onOpenChange - Callback pour changer l'état d'ouverture
 * @param {string} props.type - Type d'item à créer ('Épic', 'Story', 'Tâche', 'Bug')
 * @param {Object} props.editingItem - Item à éditer (null pour création)
 * @param {Object} props.parentItem - Item parent (pour création de sous-éléments)
 * @param {string} props.projectId - ID du projet sélectionné
 * @param {Array} props.projects - Liste des projets disponibles
 * @param {Array} props.users - Liste des utilisateurs disponibles
 * @param {Array} props.sprints - Liste des sprints disponibles
 * @param {Array} props.deliverables - Liste des livrables disponibles
 * @param {Array} props.epics - Liste des épics disponibles (pour parent)
 * @param {Array} props.stories - Liste des stories disponibles (pour parent)
 * @param {boolean} props.dataLoading - Indique si les données sont en cours de chargement
 * @param {boolean} props.dataReady - Indique si les données sont prêtes
 * @param {Object} props.dataErrors - Erreurs de chargement des données
 * @param {Function} props.onSuccess - Callback après création/modification réussie
 * @param {Function} props.onUnauthorized - Callback en cas d'erreur 401
 * @param {boolean} props.showProjectSelect - Afficher le sélecteur de projet
 * @param {boolean} props.showTypeSelect - Afficher le sélecteur de type
 * @param {boolean} props.showParentSelect - Afficher le sélecteur de parent
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
  showParentSelect = false
}) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const isEditing = !!editingItem;
  const currentType = editingItem?.type || type;
  const typeConfig = ITEM_TYPES[currentType] || ITEM_TYPES['Tâche'];
  const TypeIcon = typeConfig.icon;

  // Déterminer si on doit afficher certains champs selon le type
  const showSprintField = currentType !== 'Épic';
  const showAssigneeField = currentType !== 'Épic';
  const showEstimationField = currentType === 'Tâche' || currentType === 'Bug';
  const showAcceptanceCriteria = currentType === 'Story';
  const showDeliverableField = currentType === 'Tâche' || currentType === 'Bug';

  // Initialiser/réinitialiser le formulaire
  useEffect(() => {
    if (open) {
      if (editingItem) {
        // Mode édition
        setFormData({
          titre: editingItem.titre || '',
          description: editingItem.description || '',
          type: editingItem.type || 'Tâche',
          priorité: editingItem.priorité || 'Moyenne',
          story_points: editingItem.story_points?.toString() || '',
          assigné_à: editingItem.assigné_à?._id || editingItem.assigné_à || '',
          sprint_id: editingItem.sprint_id?._id || editingItem.sprint_id || '',
          date_début: editingItem.date_début ? editingItem.date_début.split('T')[0] : '',
          date_échéance: editingItem.date_échéance ? editingItem.date_échéance.split('T')[0] : '',
          estimation_heures: editingItem.estimation_heures?.toString() || '',
          acceptance_criteria: Array.isArray(editingItem.acceptance_criteria)
            ? editingItem.acceptance_criteria.join('\n')
            : editingItem.acceptance_criteria || '',
          deliverable_id: editingItem.deliverable_id?._id || editingItem.deliverable_id || '',
          parent_id: editingItem.parent_id?._id || editingItem.parent_id || ''
        });
      } else {
        // Mode création
        setFormData({
          ...INITIAL_FORM_DATA,
          type: type,
          parent_id: parentItem?._id || ''
        });
      }
      setValidationErrors({});
    }
  }, [open, editingItem, parentItem, type]);

  // Validation du formulaire
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.titre.trim()) {
      errors.titre = 'Le titre est requis';
    }

    if (!isEditing && !projectId && projectId !== 'all') {
      errors.projet = 'Veuillez sélectionner un projet';
    }

    if (formData.story_points && isNaN(parseInt(formData.story_points))) {
      errors.story_points = 'Valeur numérique attendue';
    }

    if (formData.estimation_heures && isNaN(parseFloat(formData.estimation_heures))) {
      errors.estimation_heures = 'Valeur numérique attendue';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, projectId, isEditing]);

  // Construire le payload pour l'API
  const buildPayload = useCallback(() => {
    const payload = {
      titre: formData.titre.trim(),
      description: formData.description.trim(),
      priorité: formData.priorité,
      story_points: formData.story_points ? parseInt(formData.story_points) : null
    };

    if (!isEditing) {
      payload.type = currentType;
      payload.projet_id = projectId;
      payload.parent_id = formData.parent_id || parentItem?._id || null;
    }

    // Champs pour Stories et Tâches
    if (showAssigneeField) {
      payload.assigné_à = formData.assigné_à || null;
    }

    if (showSprintField) {
      payload.sprint_id = formData.sprint_id || null;
    }

    if (formData.date_début) {
      payload.date_début = formData.date_début;
    }

    if (formData.date_échéance) {
      payload.date_échéance = formData.date_échéance;
    }

    // Champs pour Tâches et Bugs
    if (showEstimationField) {
      payload.estimation_heures = formData.estimation_heures
        ? parseFloat(formData.estimation_heures)
        : null;
    }

    if (showDeliverableField) {
      payload.deliverable_id = formData.deliverable_id || null;
    }

    // Critères d'acceptation pour Stories
    if (showAcceptanceCriteria && formData.acceptance_criteria) {
      payload.acceptance_criteria = formData.acceptance_criteria
        .split('\n')
        .map(c => c.trim())
        .filter(c => c);
    }

    return payload;
  }, [
    formData,
    currentType,
    projectId,
    parentItem,
    isEditing,
    showAssigneeField,
    showSprintField,
    showEstimationField,
    showDeliverableField,
    showAcceptanceCriteria
  ]);

  // Soumettre le formulaire
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    if (!dataReady && !isEditing) {
      toast.error('Les données ne sont pas encore chargées');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        onUnauthorized();
        return;
      }

      const payload = buildPayload();

      if (isEditing) {
        // Mode édition
        const response = await fetch(`/api/tasks/${editingItem._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de la modification');
        }

        toast.success(`${typeConfig.label} mis(e) à jour avec succès`);
      } else {
        // Mode création
        await safeFetch('/api/tasks', token, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        toast.success(`${typeConfig.label} créé(e) avec succès`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur soumission:', error);

      if (error.message === 'UNAUTHORIZED') {
        onUnauthorized();
      } else if (error.message === 'TIMEOUT') {
        toast.error('La requête a dépassé le délai');
      } else {
        toast.error(error.data?.error || error.message || 'Erreur lors de l\'opération');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Fermer le dialog
  const handleClose = () => {
    if (!submitting) {
      setFormData(INITIAL_FORM_DATA);
      setValidationErrors({});
      onOpenChange(false);
    }
  };

  // Mettre à jour un champ du formulaire
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur de validation si le champ est corrigé
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Vérifier si des données sont manquantes
  const hasDataErrors = Object.values(dataErrors).some(e => e !== null);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className={`w-5 h-5 ${typeConfig.iconColor}`} />
            {isEditing ? 'Modifier' : 'Créer'} {typeConfig.articleUn} {typeConfig.label}
          </DialogTitle>
          {parentItem && (
            <DialogDescription>
              Dans: {parentItem.titre}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Alerte si données en chargement */}
        {dataLoading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Chargement des données en cours...
            </AlertDescription>
          </Alert>
        )}

        {/* Alerte si erreurs de chargement */}
        {hasDataErrors && !dataLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Certaines données n&apos;ont pas pu être chargées.
              Veuillez rafraîchir la page ou réessayer.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          {/* Sélecteur de type (optionnel) */}
          {showTypeSelect && !isEditing && (
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => updateField('type', v)}
              >
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

          {/* Sélecteur de projet (optionnel) */}
          {showProjectSelect && !isEditing && (
            <div className="space-y-2">
              <Label>Projet *</Label>
              <Select
                value={projectId}
                onValueChange={(v) => updateField('projet_id', v)}
                disabled={dataLoading || projects.length === 0}
              >
                <SelectTrigger className={validationErrors.projet ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
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
            <Label>Titre *</Label>
            <Input
              value={formData.titre}
              onChange={(e) => updateField('titre', e.target.value)}
              placeholder={
                currentType === 'Épic'
                  ? "Ex: Refonte du module utilisateur"
                  : currentType === 'Story'
                  ? "Ex: En tant qu'utilisateur, je veux..."
                  : "Ex: Implémenter la validation du formulaire"
              }
              className={validationErrors.titre ? 'border-red-500' : ''}
              disabled={submitting}
            />
            {validationErrors.titre && (
              <p className="text-xs text-red-500">{validationErrors.titre}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>
              {currentType === 'Épic'
                ? 'Objectif'
                : currentType === 'Story'
                ? 'User Story / Description'
                : 'Description'}
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={
                currentType === 'Épic'
                  ? "Décrivez l'objectif global de cet épic..."
                  : currentType === 'Story'
                  ? "En tant que [rôle], je veux [action] afin de [bénéfice]..."
                  : "Détails de la tâche à réaliser..."
              }
              rows={currentType === 'Story' ? 4 : 3}
              disabled={submitting}
            />
          </div>

          {/* Priorité et Story Points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priorité</Label>
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
              <Label>{currentType === 'Épic' ? 'Points totaux estimés' : 'Story Points'}</Label>
              <Input
                type="number"
                min="0"
                value={formData.story_points}
                onChange={(e) => updateField('story_points', e.target.value)}
                placeholder={currentType === 'Épic' ? "Ex: 40" : "Ex: 5"}
                className={validationErrors.story_points ? 'border-red-500' : ''}
                disabled={submitting}
              />
              {validationErrors.story_points && (
                <p className="text-xs text-red-500">{validationErrors.story_points}</p>
              )}
            </div>
          </div>

          {/* Critères d'acceptation (Story uniquement) */}
          {showAcceptanceCriteria && (
            <div className="space-y-2">
              <Label>Critères d&apos;acceptation</Label>
              <Textarea
                value={formData.acceptance_criteria}
                onChange={(e) => updateField('acceptance_criteria', e.target.value)}
                placeholder="Un critère par ligne..."
                rows={3}
                disabled={submitting}
              />
            </div>
          )}

          {/* Sélecteur de parent (optionnel) */}
          {showParentSelect && !parentItem && (epics.length > 0 || stories.length > 0) && (
            <div className="space-y-2">
              <Label>Parent (optionnel)</Label>
              <Select
                value={formData.parent_id || 'none'}
                onValueChange={(v) => updateField('parent_id', v === 'none' ? '' : v)}
                disabled={submitting || dataLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun parent</SelectItem>
                  {currentType !== 'Épic' && epics.map(e => (
                    <SelectItem key={e._id} value={e._id}>
                      <div className="flex items-center gap-2">
                        <Layers className="w-3 h-3 text-purple-600" />
                        {e.titre}
                      </div>
                    </SelectItem>
                  ))}
                  {currentType === 'Tâche' && stories.map(s => (
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

          {/* Champs pour Stories et Tâches */}
          {showAssigneeField && (
            <div className="space-y-2">
              <Label>Assigné à</Label>
              <Select
                value={formData.assigné_à || 'none'}
                onValueChange={(v) => updateField('assigné_à', v === 'none' ? '' : v)}
                disabled={submitting || dataLoading || users.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.nom_complet || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dataErrors.users && (
                <p className="text-xs text-amber-600">Liste des utilisateurs non disponible</p>
              )}
            </div>
          )}

          {/* Sprint et Date d'échéance */}
          {showSprintField && (
            <div className="grid grid-cols-2 gap-4">
              {sprints.length > 0 && (
                <div className="space-y-2">
                  <Label>Sprint</Label>
                  <Select
                    value={formData.sprint_id || 'backlog'}
                    onValueChange={(v) => updateField('sprint_id', v === 'backlog' ? '' : v)}
                    disabled={submitting || dataLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Backlog" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      {sprints.map(s => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.statut === 'Actif' ? '(Actif) ' : ''}{s.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Échéance</Label>
                <Input
                  type="date"
                  value={formData.date_échéance}
                  onChange={(e) => updateField('date_échéance', e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          {/* Estimation heures (Tâches et Bugs) */}
          {showEstimationField && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimation (heures)</Label>
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
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={formData.date_début}
                  onChange={(e) => updateField('date_début', e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          {/* Livrable (Tâches et Bugs) */}
          {showDeliverableField && deliverables.length > 0 && (
            <div className="space-y-2">
              <Label>Livrable</Label>
              <Select
                value={formData.deliverable_id || 'none'}
                onValueChange={(v) => updateField('deliverable_id', v === 'none' ? '' : v)}
                disabled={submitting || dataLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun livrable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun livrable</SelectItem>
                  {deliverables.map(d => (
                    <SelectItem key={d._id} value={d._id}>{d.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={submitting || (dataLoading && !isEditing) || (!formData.titre.trim())}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? 'Mise à jour...' : 'Création...'}
              </>
            ) : (
              isEditing ? 'Mettre à jour' : 'Créer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ItemFormDialog;
