'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Edit2, Trash2, Copy, GripVertical, Settings, ChevronDown, ChevronUp, Type, Hash, Calendar, List, User, FileText, DollarSign, Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';

const FIELD_TYPES = [
  { value: 'texte', label: 'Texte', icon: Type, description: 'Champ texte simple ou long' },
  { value: 'nombre', label: 'Nombre', icon: Hash, description: 'Valeur numérique' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Sélecteur de date' },
  { value: 'sélecteur', label: 'Liste déroulante', icon: List, description: 'Choix parmi des options' },
  { value: 'utilisateur', label: 'Utilisateur', icon: User, description: 'Sélection d\'utilisateur' },
  { value: 'fichier', label: 'Fichier', icon: FileText, description: 'Upload de fichier' },
  { value: 'budget', label: 'Budget', icon: DollarSign, description: 'Montant avec devise' },
  { value: 'url', label: 'URL', icon: Link2, description: 'Lien web' }
];

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
    multiple: false
  },
  group: '',
  order: 0
};

export default function TemplatesPage() {
  const router = useRouter();
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
    champs: []
  });
  const [editingField, setEditingField] = useState(null);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [newOption, setNewOption] = useState('');

  const permissions = useRBACPermissions(user);
  const canManageTemplates = permissions.hasPermission;

  const loadTemplates = useCallback(async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [userRes, templatesRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/project-templates', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const userData = await userRes.json();
      const templatesData = await templatesRes.json();

      // Client-side guard: redirect if not admin (support both role_id and role)
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
  }, [router]);

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

      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/project-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTemplate)
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
      isDangerous: true
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/project-templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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
      champs: template.champs || []
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

      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/project-templates/${editingTemplate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nom: editingTemplate.nom,
          description: editingTemplate.description,
          catégorie: editingTemplate.catégorie,
          champs: editingTemplate.champs
        })
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
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/project-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nom: `${template.nom} (Copie)`,
          description: template.description,
          catégorie: template.catégorie,
          champs: template.champs
        })
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

    const existingIndex = targetTemplate.champs.findIndex(f => f.id === editingField.id);

    if (existingIndex >= 0) {
      const updatedChamps = [...targetTemplate.champs];
      updatedChamps[existingIndex] = editingField;
      setTargetTemplate({ ...targetTemplate, champs: updatedChamps });
    } else {
      setTargetTemplate({
        ...targetTemplate,
        champs: [...targetTemplate.champs, { ...editingField, order: targetTemplate.champs.length }]
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
      champs: targetTemplate.champs.filter(f => f.id !== fieldId)
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
    [updatedChamps[index], updatedChamps[newIndex]] = [updatedChamps[newIndex], updatedChamps[index]];
    updatedChamps.forEach((f, i) => f.order = i);

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
        options: [...currentOptions, newOption.trim()]
      }
    });
    setNewOption('');
  };

  const removeOption = (optionToRemove) => {
    setEditingField({
      ...editingField,
      properties: {
        ...editingField.properties,
        options: (editingField.properties?.options || []).filter(o => o !== optionToRemove)
      }
    });
  };

  const getFieldIcon = (type) => {
    const fieldType = FIELD_TYPES.find(f => f.value === type);
    return fieldType ? fieldType.icon : Type;
  };

  const renderFieldsList = (champs, isEditing) => {
    if (!champs || champs.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun champ personnalisé</p>
          <p className="text-sm">Ajoutez des champs pour personnaliser le formulaire de création de projet</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {champs.map((field, index) => {
          const FieldIcon = getFieldIcon(field.type);
          return (
            <div
              key={field.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveField(index, 'down')}
                  disabled={index === champs.length - 1}
                  className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <FieldIcon className="w-4 h-4 text-indigo-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{field.label}</span>
                  {field.required && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">Requis</Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                  {field.properties?.variant && ` - ${field.properties.variant}`}
                </span>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleEditField(field)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteField(field.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTemplateDialog = (template, setTemplate, isEdit) => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="info">Informations</TabsTrigger>
        <TabsTrigger value="fields">
          Champs personnalisés
          {template.champs?.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px]">{template.champs.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>Nom du template *</Label>
          <Input
            value={template.nom}
            onChange={(e) => setTemplate({ ...template, nom: e.target.value })}
            placeholder="Projet Développement Logiciel"
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={template.description}
            onChange={(e) => setTemplate({ ...template, description: e.target.value })}
            placeholder="Template pour les projets de développement..."
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Input
            value={template.catégorie}
            onChange={(e) => setTemplate({ ...template, catégorie: e.target.value })}
            placeholder="IT, Marketing, Construction..."
          />
        </div>
      </TabsContent>

      <TabsContent value="fields" className="mt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Définissez les champs qui apparaîtront lors de la création d'un projet avec ce template
            </p>
            <Button
              size="sm"
              onClick={() => openAddFieldDialog(false)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {renderFieldsList(template.champs, isEdit)}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Templates de Projets</h1>
          <p className="text-gray-600">Créez des modèles réutilisables avec des champs personnalisés pour vos projets</p>
        </div>
        {canManageTemplates('adminConfig') && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un template
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun template</h3>
            <p className="text-gray-600 mb-4">Créez votre premier template de projet avec des champs personnalisés</p>
            {canManageTemplates('adminConfig') && (
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Créer un template
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template, idx) => (
            <motion.div
              key={template._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        <CardTitle className="text-lg">{template.nom}</CardTitle>
                      </div>
                      <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                    </div>
                    {template.catégorie && (
                      <Badge variant="secondary">{template.catégorie}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Champs personnalisés</span>
                      <Badge variant="outline" className="font-medium">
                        {template.champs?.length || 0}
                      </Badge>
                    </div>

                    {template.champs?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.champs.slice(0, 4).map((field, i) => {
                          const FieldIcon = getFieldIcon(field.type);
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                            >
                              <FieldIcon className="w-3 h-3" />
                              <span className="truncate max-w-[80px]">{field.label}</span>
                            </div>
                          );
                        })}
                        {template.champs.length > 4 && (
                          <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                            +{template.champs.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Éditer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyTemplate(template)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteTemplate(template._id, template.nom)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dialog création */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setNewTemplate({ nom: '', description: '', catégorie: '', champs: [] });
          setActiveTab('info');
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un template de projet</DialogTitle>
            <DialogDescription>
              Définissez un modèle réutilisable avec des champs personnalisés
            </DialogDescription>
          </DialogHeader>

          {renderTemplateDialog(newTemplate, setNewTemplate, false)}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateTemplate} className="bg-indigo-600 hover:bg-indigo-700">
              Créer le template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog édition */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditingTemplate(null);
          setActiveTab('info');
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le template</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations et les champs du template
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && renderTemplateDialog(editingTemplate, setEditingTemplate, true)}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveTemplate} className="bg-indigo-600 hover:bg-indigo-700">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ajout/édition champ */}
      <Dialog open={fieldDialogOpen} onOpenChange={(open) => {
        setFieldDialogOpen(open);
        if (!open) {
          setEditingField(null);
          setNewOption('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingField?.id && (editDialogOpen ? editingTemplate : newTemplate).champs?.find(f => f.id === editingField.id)
                ? 'Modifier le champ'
                : 'Ajouter un champ'}
            </DialogTitle>
          </DialogHeader>

          {editingField && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Type de champ *</Label>
                <Select
                  value={editingField.type}
                  onValueChange={(value) => setEditingField({ ...editingField, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Libellé *</Label>
                <Input
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  placeholder="Ex: Nom du client"
                />
              </div>

              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  placeholder="Texte d'aide affiché dans le champ"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Champ requis</Label>
                <Switch
                  checked={editingField.required}
                  onCheckedChange={(checked) => setEditingField({ ...editingField, required: checked })}
                />
              </div>

              {/* Propriétés spécifiques par type */}
              {editingField.type === 'texte' && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Variante</Label>
                    <Select
                      value={editingField.properties?.variant || 'court'}
                      onValueChange={(value) => setEditingField({
                        ...editingField,
                        properties: { ...editingField.properties, variant: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="court">Texte court</SelectItem>
                        <SelectItem value="long">Texte long (multiligne)</SelectItem>
                        <SelectItem value="riche">Texte riche (formaté)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Longueur maximale</Label>
                    <Input
                      type="number"
                      value={editingField.properties?.longueur_max || 255}
                      onChange={(e) => setEditingField({
                        ...editingField,
                        properties: { ...editingField.properties, longueur_max: parseInt(e.target.value) || 255 }
                      })}
                    />
                  </div>
                </div>
              )}

              {editingField.type === 'nombre' && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Minimum</Label>
                      <Input
                        type="number"
                        value={editingField.properties?.min ?? ''}
                        onChange={(e) => setEditingField({
                          ...editingField,
                          properties: { ...editingField.properties, min: e.target.value ? parseFloat(e.target.value) : null }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Maximum</Label>
                      <Input
                        type="number"
                        value={editingField.properties?.max ?? ''}
                        onChange={(e) => setEditingField({
                          ...editingField,
                          properties: { ...editingField.properties, max: e.target.value ? parseFloat(e.target.value) : null }
                        })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Unité</Label>
                    <Input
                      value={editingField.properties?.unité || ''}
                      onChange={(e) => setEditingField({
                        ...editingField,
                        properties: { ...editingField.properties, unité: e.target.value }
                      })}
                      placeholder="Ex: kg, m, ..."
                    />
                  </div>
                </div>
              )}

              {editingField.type === 'sélecteur' && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        placeholder="Nouvelle option"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                      />
                      <Button onClick={addOption} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {(editingField.properties?.options || []).map((option, i) => (
                        <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
                          {option}
                          <button
                            onClick={() => removeOption(option)}
                            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Sélection multiple</Label>
                    <Switch
                      checked={editingField.properties?.multiple || false}
                      onCheckedChange={(checked) => setEditingField({
                        ...editingField,
                        properties: { ...editingField.properties, multiple: checked }
                      })}
                    />
                  </div>
                </div>
              )}

              {editingField.type === 'date' && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Date du jour par défaut</Label>
                    <Switch
                      checked={editingField.properties?.aujourdhui_par_defaut || false}
                      onCheckedChange={(checked) => setEditingField({
                        ...editingField,
                        properties: { ...editingField.properties, aujourdhui_par_defaut: checked }
                      })}
                    />
                  </div>
                </div>
              )}

              {editingField.type === 'budget' && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Devise par défaut</Label>
                    <Select
                      value={editingField.properties?.devise || 'EUR'}
                      onValueChange={(value) => setEditingField({
                        ...editingField,
                        properties: { ...editingField.properties, devise: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="XOF">XOF</SelectItem>
                        <SelectItem value="XAF">XAF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Groupe (optionnel)</Label>
                <Input
                  value={editingField.group || ''}
                  onChange={(e) => setEditingField({ ...editingField, group: e.target.value })}
                  placeholder="Ex: Informations client, Budget..."
                />
                <p className="text-xs text-gray-500">Permet de regrouper les champs par catégorie</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveField} className="bg-indigo-600 hover:bg-indigo-700">
              {editingField?.id && (editDialogOpen ? editingTemplate : newTemplate).champs?.find(f => f.id === editingField.id)
                ? 'Modifier'
                : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
