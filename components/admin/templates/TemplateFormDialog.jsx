'use client';

import { Plus, Edit2, Trash2, Settings, ChevronUp, ChevronDown, Type } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FIELD_TYPES } from './FieldEditorDialog';

function getFieldIcon(type) {
  const fieldType = FIELD_TYPES.find((f) => f.value === type);
  return fieldType ? fieldType.icon : Type;
}

export function TemplateFormDialog({
  isOpen,
  onOpenChange,
  template,
  setTemplate,
  isEdit,
  activeTab,
  setActiveTab,
  onSubmit,
  openAddFieldDialog,
  handleEditField,
  handleDeleteField,
  moveField,
}) {
  if (!template) return null;

  const renderFieldsList = (champs) => {
    if (!champs || champs.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun champ personnalisé</p>
          <p className="text-sm">
            Ajoutez des champs pour personnaliser le formulaire de création de projet
          </p>
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
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveField(index, 'down')}
                  disabled={index === champs.length - 1}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                <FieldIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {field.label}
                  </span>
                  {field.required && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      Requis
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier le template' : 'Créer un template de projet'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Mettez à jour les informations et les champs du template'
              : 'Définissez un modèle réutilisable avec des champs personnalisés'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="fields">
              Champs personnalisés
              {template.champs?.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {template.champs.length}
                </Badge>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Définissez les champs qui apparaîtront lors de la création d'un projet avec ce
                  template
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
                {renderFieldsList(template.champs)}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} className="bg-indigo-600 hover:bg-indigo-700">
            {isEdit ? 'Enregistrer' : 'Créer le template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
