'use client';

import { Edit2, FolderKanban, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export function SprintFormDialog({
  // Create mode props
  createDialogOpen,
  setCreateDialogOpen,
  newSprint,
  setNewSprint,
  creatingSprint,
  handleCreateSprint,
  projects,
  // Edit mode props
  editDialogOpen,
  setEditDialogOpen,
  editingSprint,
  setEditingSprint,
  savingSprint,
  handleSaveSprint,
  getProjectName,
  t,
}) {
  return (
    <>
      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planifier une nouvelle période de travail</DialogTitle>
            <DialogDescription>
              Définissez les dates et l'objectif principal de cette période de travail (sprint).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nom de la période *</Label>
                <Input
                  value={newSprint.nom}
                  onChange={(e) => setNewSprint({ ...newSprint, nom: e.target.value })}
                  placeholder="Ex : Semaine 1 - Lancement ou Sprint 1"
                />
                <p className="text-[11px] text-gray-500">Un titre clair qui résume cette étape.</p>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Projet concerné *</Label>
                <Select
                  value={newSprint.projet_id}
                  onValueChange={(val) => setNewSprint({ ...newSprint, projet_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Objectif principal</Label>
                <Textarea
                  value={newSprint.objectif}
                  onChange={(e) => setNewSprint({ ...newSprint, objectif: e.target.value })}
                  placeholder="Ex : Finaliser la maquette et valider les livrables avec le client..."
                  rows={2}
                />
                <p className="text-[11px] text-gray-500">
                  Qu'est-ce qui doit impérativement être prêt à la fin de cette période ?
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Date de début *</Label>
                <Input
                  type="date"
                  value={newSprint.date_début}
                  onChange={(e) => setNewSprint({ ...newSprint, date_début: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Date de fin (Échéance) *</Label>
                <Input
                  type="date"
                  value={newSprint.date_fin}
                  onChange={(e) => setNewSprint({ ...newSprint, date_fin: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label>Disponibilité totale de l'équipe (en heures)</Label>
                  <HelpCircle
                    className="w-3.5 h-3.5 text-gray-400"
                    title="Nombre d'heures cumulées que votre équipe peut consacrer pendant cette période"
                  />
                </div>
                <Input
                  type="number"
                  value={newSprint.capacité_équipe}
                  onChange={(e) => setNewSprint({ ...newSprint, capacité_équipe: e.target.value })}
                  placeholder="Ex : 80 heures (2 personnes à mi-temps)"
                />
                <p className="text-[11px] text-gray-500">
                  Facultatif : permet de vérifier si l'équipe n'est pas surchargée.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creatingSprint}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleCreateSprint}
              disabled={creatingSprint}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {creatingSprint ? 'Création...' : 'Valider et planifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sprint Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingSprint(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-600" />
              Modifier la période de travail
            </DialogTitle>
            <DialogDescription>
              Ajustez les dates, l'objectif ou le volume horaire disponible.
            </DialogDescription>
          </DialogHeader>
          {editingSprint && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Nom de la période *</Label>
                  <Input
                    value={editingSprint.nom}
                    onChange={(e) => setEditingSprint({ ...editingSprint, nom: e.target.value })}
                    placeholder="Sprint 1"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Projet associé</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <FolderKanban className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {getProjectName(editingSprint.projet_id)}
                    </span>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      Fixé
                    </Badge>
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Objectif principal</Label>
                  <Textarea
                    value={editingSprint.objectif}
                    onChange={(e) =>
                      setEditingSprint({ ...editingSprint, objectif: e.target.value })
                    }
                    placeholder="Objectif à atteindre..."
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date de début *</Label>
                  <Input
                    type="date"
                    value={editingSprint.date_début}
                    onChange={(e) =>
                      setEditingSprint({ ...editingSprint, date_début: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date de fin *</Label>
                  <Input
                    type="date"
                    value={editingSprint.date_fin}
                    onChange={(e) =>
                      setEditingSprint({ ...editingSprint, date_fin: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Disponibilité équipe (en heures)</Label>
                  <Input
                    type="number"
                    value={editingSprint.capacité_équipe}
                    onChange={(e) =>
                      setEditingSprint({ ...editingSprint, capacité_équipe: e.target.value })
                    }
                    placeholder="80"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={savingSprint}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveSprint}
              disabled={savingSprint || !editingSprint?.nom}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {savingSprint ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
