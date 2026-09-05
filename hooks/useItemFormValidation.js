'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';

// Valeurs initiales du formulaire
const INITIAL_FORM_DATA = {
  titre: '',
  description: '',
  type: 'Tâche',
  priorité: 'Moyenne',
  story_points: '',
  assigné_à: '',
  sprint_id: '',
  projet_id: '',
  date_début: '',
  date_échéance: '',
  estimation_heures: '',
  acceptance_criteria: '',
  deliverable_id: '',
  parent_id: '',
};

/**
 * Hook encapsulant la logique de formulaire pour ItemFormDialog :
 * - Etat du formulaire (formData, validationErrors, submitting)
 * - Initialisation / reinitialisation quand le dialog s'ouvre
 * - Validation
 * - Construction du payload API
 * - Soumission (create / update)
 *
 * @param {Object} options
 * @param {boolean} options.open - Dialog ouvert ?
 * @param {Object|null} options.editingItem - Item en cours d'edition
 * @param {Object|null} options.parentItem - Item parent
 * @param {string} options.type - Type d'item par defaut
 * @param {string} options.projectId - ID du projet
 * @param {boolean} options.dataReady - Les donnees de reference sont chargees ?
 * @param {boolean} options.dataLoading - Les donnees sont en cours de chargement ?
 * @param {Function} options.onSuccess - Callback apres succes
 * @param {Function} options.onUnauthorized - Callback si 401
 * @param {Function} options.onOpenChange - Callback pour fermer le dialog
 * @param {Function} options.t - Fonction de traduction
 */
export function useItemFormValidation({
  open,
  editingItem = null,
  parentItem = null,
  type = 'Tâche',
  projectId = '',
  dataReady = true,
  dataLoading: _dataLoading = false,
  onSuccess = () => {},
  onUnauthorized = () => {},
  onOpenChange = () => {},
  t = (k) => k,
}) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const isEditing = !!editingItem;
  const currentType = editingItem?.type || type;

  // Determiner quels champs afficher selon le type
  const fieldVisibility = useMemo(
    () => ({
      showSprintField: currentType !== 'Épic',
      showAssigneeField: currentType !== 'Épic',
      showEstimationField: currentType === 'Tâche' || currentType === 'Bug',
      showAcceptanceCriteria: currentType === 'Story',
      showDeliverableField: currentType === 'Tâche' || currentType === 'Bug',
    }),
    [currentType]
  );

  // Initialiser/reinitialiser le formulaire quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      if (editingItem) {
        // Mode edition
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
          parent_id: editingItem.parent_id?._id || editingItem.parent_id || '',
        });
      } else {
        // Mode creation
        setFormData({
          ...INITIAL_FORM_DATA,
          type: type,
          parent_id: parentItem?._id || '',
          projet_id: projectId && projectId !== 'all' ? projectId : '',
        });
      }
      setValidationErrors({});
    }
  }, [open, editingItem, parentItem, type, projectId]);

  const resolvedProjectId =
    formData.projet_id || (projectId && projectId !== 'all' ? projectId : '');

  // Validation du formulaire
  const validateForm = useCallback(() => {
    const errors = {};

    if (!isEditing && !resolvedProjectId) {
      errors.projet = t('selectProject');
    }

    if (!formData.titre || !formData.titre.trim()) {
      errors.titre = t('requiredField');
    }

    if (formData.story_points && isNaN(parseInt(formData.story_points))) {
      errors.story_points = t('numericError');
    }

    if (formData.estimation_heures && isNaN(parseFloat(formData.estimation_heures))) {
      errors.estimation_heures = t('numericError');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, resolvedProjectId, isEditing]);

  // Construire le payload pour l'API
  const buildPayload = useCallback(() => {
    const {
      showAssigneeField,
      showSprintField,
      showEstimationField,
      showDeliverableField,
      showAcceptanceCriteria,
    } = fieldVisibility;

    const payload = {
      titre: formData.titre.trim(),
      description: formData.description.trim(),
      priorité: formData.priorité,
      story_points: formData.story_points ? parseInt(formData.story_points) : null,
    };

    if (!isEditing) {
      payload.type = currentType;
      payload.projet_id = resolvedProjectId;
      payload.parent_id = formData.parent_id || parentItem?._id || null;
    }

    // Champs pour Stories et Taches
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

    // Champs pour Taches et Bugs
    if (showEstimationField) {
      payload.estimation_heures = formData.estimation_heures
        ? parseFloat(formData.estimation_heures)
        : null;
    }

    if (showDeliverableField) {
      payload.deliverable_id = formData.deliverable_id || null;
    }

    // Criteres d'acceptation pour Stories
    if (showAcceptanceCriteria && formData.acceptance_criteria) {
      payload.acceptance_criteria = formData.acceptance_criteria
        .split('\n')
        .map((c) => c.trim())
        .filter((c) => c);
    }

    return payload;
  }, [formData, currentType, resolvedProjectId, parentItem, isEditing, fieldVisibility]);

  // Soumettre le formulaire
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error(t('fixErrors'));
      return;
    }

    if (!dataReady && !isEditing) {
      toast.error(t('loadingData'));
      return;
    }

    setSubmitting(true);

    try {
      const payload = buildPayload();

      if (isEditing) {
        // Mode edition
        const response = await authFetch(`/api/tasks/${editingItem._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de la modification');
        }

        toast.success(t('successUpdated'));
      } else {
        // Mode creation
        const res = await authFetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erreur lors de la création');
        }

        toast.success(t('successCreated'));
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
        toast.error(error.data?.error || error.message || "Erreur lors de l'opération");
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

  // Mettre a jour un champ du formulaire
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur de validation si le champ est corrige
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  return {
    formData,
    submitting,
    validationErrors,
    isEditing,
    currentType,
    fieldVisibility,
    validateForm,
    handleSubmit,
    handleClose,
    updateField,
  };
}

export default useItemFormValidation;
