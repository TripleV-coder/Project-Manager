'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRouter } from 'next/navigation';
import { Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import { useAuthFetch } from '@/hooks/useAuthFetch';

import { TemplateCard } from '@/components/admin/templates/TemplateCard';
import { TemplateFormDialog } from '@/components/admin/templates/TemplateFormDialog';
import { FieldEditorDialog } from '@/components/admin/templates/FieldEditorDialog';

const DEFAULT_FIELD = {
  id: '',
  type: 'texte',
  label: '',
  required: false,
  placeholder: '',
  default_value: '',
  properties: {
    variant: 'court',
    longueur_max: 255,
    options: [],
    multiple: false,
  },
  group: '',
  order: 0,
};

export default function TemplatesPage() {
  const router = useRouter();
  const { authFetch } = useAuthFetch();
  const { confirm } = useConfirmation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [newTemplate, setNewTemplate] = useState({
    nom: '',
    description: '',
    catégorie: '',
    champs: [],
  });
  const [editingField, setEditingField] = useState(null);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [newOption, setNewOption] = useState('');

  const permissions = useRBACPermissions(user);
  const canManageTemplates = permissions.hasPermission;

  const loadTemplates = useCallback(async () => {
    try {
      const [userRes, templatesRes] = await Promise.all([
        authFetch('/api/auth/me'),
        authFetch('/api/project-templates'),
      ]);

      const userData = await userRes.json();
      const templatesData = await templatesRes.json();

      // Client-side guard: redirect if not admin
      const userPerms = userData.role_id?.permissions || userData.role?.permissions || {};
      if (!userPerms.adminConfig) {
        router.push('/dashboard');
        return;
      }

      setUser(userData);
      setTemplates(templatesData.templates || templatesData.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  }, [authFetch, router]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const generateFieldId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleCreateTemplate = async () => {
    try {
      if (!newTemplate.nom) {
        toast.error('Le nom est requis');
        return;
      }

      const response = await authFetch('/api/project-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Template créé avec succès');
        setCreateDialogOpen(false);
        setNewTemplate({ nom: '', description: '', catégorie: '', champs: [] });
        setActiveTab('info');
        await loadTemplates();
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    const confirmed = await confirm({
      title: 'Supprimer le template',
      description: `Êtes-vous sûr de vouloir supprimer le template "${templateName}" ?`,
      actionLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true,
    });
    if (!confirmed) return;

    try {
      const response = await authFetch(`/api/project-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Template supprimé avec succès');
        await loadTemplates();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate({
      ...template,
      champs: template.champs || [],
    });
    setActiveTab('info');
    setEditDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (!editingTemplate.nom) {
        toast.error('Le nom est requis');
        return;
      }

      const response = await authFetch(`/api/project-templates/${editingTemplate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: editingTemplate.nom,
          description: editingTemplate.description,
          catégorie: editingTemplate.catégorie,
          champs: editingTemplate.champs,
        }),
      });

      if (response.ok) {
        toast.success('Template modifié avec succès');
        setEditDialogOpen(false);
        setEditingTemplate(null);
        setActiveTab('info');
        await loadTemplates();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleCopyTemplate = async (template) => {
    try {
      const response = await authFetch('/api/project-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: `${template.nom} (Copie)`,
          description: template.description,
          catégorie: template.catégorie,
          champs: template.champs,
        }),
      });

      if (response.ok) {
        toast.success('Template copié avec succès');
        await loadTemplates();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la copie');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const openAddFieldDialog = (isEdit = false) => {
    if (!isEdit) {
      setEditingField({ ...DEFAULT_FIELD, id: generateFieldId() });
    }
    setFieldDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!editingField.label) {
      toast.error('Le libellé du champ est requis');
      return;
    }

    const targetTemplate = editDialogOpen ? editingTemplate : newTemplate;
    const setTargetTemplate = editDialogOpen ? setEditingTemplate : setNewTemplate;

    const existingIndex = targetTemplate.champs.findIndex((f) => f.id === editingField.id);

    if (existingIndex >= 0) {
      const updatedChamps = [...targetTemplate.champs];
      updatedChamps[existingIndex] = editingField;
      setTargetTemplate({ ...targetTemplate, champs: updatedChamps });
    } else {
      setTargetTemplate({
        ...targetTemplate,
        champs: [
          ...targetTemplate.champs,
          { ...editingField, order: targetTemplate.champs.length },
        ],
      });
    }

    setFieldDialogOpen(false);
    setEditingField(null);
  };

  const handleDeleteField = (fieldId) => {
    const targetTemplate = editDialogOpen ? editingTemplate : newTemplate;
    const setTargetTemplate = editDialogOpen ? setEditingTemplate : setNewTemplate;

    setTargetTemplate({
      ...targetTemplate,
      champs: targetTemplate.champs.filter((f) => f.id !== fieldId),
    });
  };

  const handleEditField = (field) => {
    setEditingField({ ...field });
    setFieldDialogOpen(true);
  };

  const moveField = (index, direction) => {
    const targetTemplate = editDialogOpen ? editingTemplate : newTemplate;
    const setTargetTemplate = editDialogOpen ? setEditingTemplate : setNewTemplate;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= targetTemplate.champs.length) return;

    const updatedChamps = [...targetTemplate.champs];
    [updatedChamps[index], updatedChamps[newIndex]] = [
      updatedChamps[newIndex],
      updatedChamps[index],
    ];
    updatedChamps.forEach((f, i) => (f.order = i));

    setTargetTemplate({ ...targetTemplate, champs: updatedChamps });
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    const currentOptions = editingField.properties?.options || [];
    if (currentOptions.includes(newOption.trim())) {
      toast.error('Cette option existe déjà');
      return;
    }
    setEditingField({
      ...editingField,
      properties: {
        ...editingField.properties,
        options: [...currentOptions, newOption.trim()],
      },
    });
    setNewOption('');
  };

  const removeOption = (optionToRemove) => {
    setEditingField({
      ...editingField,
      properties: {
        ...editingField.properties,
        options: (editingField.properties?.options || []).filter((o) => o !== optionToRemove),
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentTemplate = editDialogOpen ? editingTemplate : newTemplate;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Modèles de projets prêts à l'emploi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Gagnez du temps : préparez des structures réutilisables avec des champs adaptés à vos
            activités.
          </p>
        </div>
        {canManageTemplates('adminConfig') && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un modèle
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aucun modèle pour le moment
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm">
              Créez votre premier modèle de projet avec des champs sur mesure pour standardiser la
              création de vos dossiers.
            </p>
            {canManageTemplates('adminConfig') && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer un modèle
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template, idx) => (
            <TemplateCard
              key={template._id}
              template={template}
              idx={idx}
              onEdit={handleEditTemplate}
              onCopy={handleCopyTemplate}
              onDelete={handleDeleteTemplate}
            />
          ))}
        </div>
      )}

      {/* Dialog création */}
      <TemplateFormDialog
        isOpen={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setNewTemplate({ nom: '', description: '', catégorie: '', champs: [] });
            setActiveTab('info');
          }
        }}
        template={newTemplate}
        setTemplate={setNewTemplate}
        isEdit={false}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSubmit={handleCreateTemplate}
        openAddFieldDialog={openAddFieldDialog}
        handleEditField={handleEditField}
        handleDeleteField={handleDeleteField}
        moveField={moveField}
      />

      {/* Dialog édition */}
      <TemplateFormDialog
        isOpen={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingTemplate(null);
            setActiveTab('info');
          }
        }}
        template={editingTemplate}
        setTemplate={setEditingTemplate}
        isEdit={true}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSubmit={handleSaveTemplate}
        openAddFieldDialog={openAddFieldDialog}
        handleEditField={handleEditField}
        handleDeleteField={handleDeleteField}
        moveField={moveField}
      />

      {/* Dialog ajout/édition champ */}
      <FieldEditorDialog
        fieldDialogOpen={fieldDialogOpen}
        setFieldDialogOpen={setFieldDialogOpen}
        editingField={editingField}
        setEditingField={setEditingField}
        newOption={newOption}
        setNewOption={setNewOption}
        addOption={addOption}
        removeOption={removeOption}
        handleSaveField={handleSaveField}
        isEditTemplate={editDialogOpen}
        currentTemplateChamps={currentTemplate?.champs || []}
      />
    </div>
  );
}
