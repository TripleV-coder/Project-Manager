'use client';

import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function ProjectEditForm({
  editData,
  setEditData,
  canViewBudget,
  savingChanges,
  handleSaveChanges,
  setEditMode,
}) {
  if (!editData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-indigo-200 bg-indigo-50/50">
        <CardHeader>
          <CardTitle>Modifier le projet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={editData.nom || ''}
                onChange={(e) => setEditData({ ...editData, nom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={editData.statut}
                onValueChange={(val) => setEditData({ ...editData, statut: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planification">Planification</SelectItem>
                  <SelectItem value="En cours">En cours</SelectItem>
                  <SelectItem value="En pause">En pause</SelectItem>
                  <SelectItem value="Terminé">Terminé</SelectItem>
                  <SelectItem value="Annulé">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select
                value={editData.priorité}
                onValueChange={(val) => setEditData({ ...editData, priorité: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basse">Basse</SelectItem>
                  <SelectItem value="Moyenne">Moyenne</SelectItem>
                  <SelectItem value="Haute">Haute</SelectItem>
                  <SelectItem value="Critique">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input
                type="date"
                value={editData.date_début || ''}
                onChange={(e) => setEditData({ ...editData, date_début: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin prévue</Label>
              <Input
                type="date"
                value={editData.date_fin_prévue || ''}
                onChange={(e) => setEditData({ ...editData, date_fin_prévue: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Gouvernance & Contexte</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label>Contexte</Label>
                <Textarea
                  value={editData.contexte || ''}
                  onChange={(e) => setEditData({ ...editData, contexte: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Objectifs</Label>
                <Textarea
                  value={editData.objectifs || ''}
                  onChange={(e) => setEditData({ ...editData, objectifs: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Termes de Référence (TDR)</Label>
                <Textarea
                  value={editData.termes_de_reference || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, termes_de_reference: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Comité Technique (Séparez par des virgules)</Label>
                <Input
                  value={(editData.comite_technique || []).join(', ')}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      comite_technique: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Comité de Pilotage (Séparez par des virgules)</Label>
                <Input
                  value={(editData.comite_pilotage || []).join(', ')}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      comite_pilotage: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Structures Partenaires</Label>
                <Input
                  value={(editData.structures_partenaires || []).join(', ')}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      structures_partenaires: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Budget Section */}
          {canViewBudget && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Budget du projet
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Budget prévisionnel</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={editData.budget_prévisionnel ?? 0}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        budget_prévisionnel: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <Select
                    value={editData.budget_devise || 'FCFA'}
                    onValueChange={(val) => setEditData({ ...editData, budget_devise: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FCFA">FCFA</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="CHF">CHF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Le budget consommé est calculé automatiquement à partir des dépenses enregistrées.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSaveChanges}
              disabled={savingChanges}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {savingChanges ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
            <Button variant="outline" onClick={() => setEditMode(false)} disabled={savingChanges}>
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
