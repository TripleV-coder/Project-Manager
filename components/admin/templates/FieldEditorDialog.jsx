'use client';

import {
  Type,
  Hash,
  Calendar,
  List,
  User,
  FileText,
  DollarSign,
  Link2,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

export const FIELD_TYPES = [
  { value: 'texte', label: 'Texte', icon: Type, description: 'Champ texte simple ou long' },
  { value: 'nombre', label: 'Nombre', icon: Hash, description: 'Valeur numérique' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Sélecteur de date' },
  {
    value: 'sélecteur',
    label: 'Liste déroulante',
    icon: List,
    description: 'Choix parmi des options',
  },
  {
    value: 'utilisateur',
    label: 'Utilisateur',
    icon: User,
    description: "Sélection d'utilisateur",
  },
  { value: 'fichier', label: 'Fichier', icon: FileText, description: 'Upload de fichier' },
  { value: 'budget', label: 'Budget', icon: DollarSign, description: 'Montant avec devise' },
  { value: 'url', label: 'URL', icon: Link2, description: 'Lien web' },
];

export function FieldEditorDialog({
  fieldDialogOpen,
  setFieldDialogOpen,
  editingField,
  setEditingField,
  newOption,
  setNewOption,
  addOption,
  removeOption,
  handleSaveField,
  _isEditTemplate,
  currentTemplateChamps,
}) {
  const isEditingExistingField =
    editingField?.id && currentTemplateChamps?.some((f) => f.id === editingField.id);

  return (
    <Dialog
      open={fieldDialogOpen}
      onOpenChange={(open) => {
        setFieldDialogOpen(open);
        if (!open) {
          setEditingField(null);
          setNewOption('');
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditingExistingField ? 'Modifier le champ' : 'Ajouter un champ'}
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
                onCheckedChange={(checked) =>
                  setEditingField({ ...editingField, required: checked })
                }
              />
            </div>

            {/* Propriétés spécifiques par type */}
            {editingField.type === 'texte' && (
              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label>Variante</Label>
                  <Select
                    value={editingField.properties?.variant || 'court'}
                    onValueChange={(value) =>
                      setEditingField({
                        ...editingField,
                        properties: { ...editingField.properties, variant: value },
                      })
                    }
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
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        properties: {
                          ...editingField.properties,
                          longueur_max: parseInt(e.target.value) || 255,
                        },
                      })
                    }
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
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          properties: {
                            ...editingField.properties,
                            min: e.target.value ? parseFloat(e.target.value) : null,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum</Label>
                    <Input
                      type="number"
                      value={editingField.properties?.max ?? ''}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          properties: {
                            ...editingField.properties,
                            max: e.target.value ? parseFloat(e.target.value) : null,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Unité</Label>
                  <Input
                    value={editingField.properties?.unité || ''}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        properties: { ...editingField.properties, unité: e.target.value },
                      })
                    }
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
                    onCheckedChange={(checked) =>
                      setEditingField({
                        ...editingField,
                        properties: { ...editingField.properties, multiple: checked },
                      })
                    }
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
                    onCheckedChange={(checked) =>
                      setEditingField({
                        ...editingField,
                        properties: {
                          ...editingField.properties,
                          aujourdhui_par_defaut: checked,
                        },
                      })
                    }
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
                    onValueChange={(value) =>
                      setEditingField({
                        ...editingField,
                        properties: { ...editingField.properties, devise: value },
                      })
                    }
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
            {isEditingExistingField ? 'Modifier' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
