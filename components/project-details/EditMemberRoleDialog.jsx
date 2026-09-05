'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function EditMemberRoleDialog({
  editingMember,
  setEditingMember,
  editingMemberRole,
  setEditingMemberRole,
  projectRoles,
  savingMemberRole,
  handleSaveMemberRole,
}) {
  return (
    <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le rôle du membre</DialogTitle>
          <DialogDescription>
            Changer le rôle de {editingMember?.user_id?.nom_complet} dans ce projet
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Avatar>
              <AvatarFallback className="bg-indigo-600 text-white">
                {editingMember?.user_id?.nom_complet?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{editingMember?.user_id?.nom_complet}</p>
              <p className="text-xs text-gray-500">{editingMember?.user_id?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nouveau rôle</Label>
            <Select value={editingMemberRole} onValueChange={setEditingMemberRole}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un rôle" />
              </SelectTrigger>
              <SelectContent>
                {projectRoles.map((role) => (
                  <SelectItem key={role._id} value={role._id}>
                    <div className="text-left">
                      <div className="font-medium">{role.nom}</div>
                      <div className="text-xs text-gray-500">{role.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editingMemberRole && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                Permissions du rôle sélectionné :
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs text-indigo-800 dark:text-indigo-200">
                {(() => {
                  const selectedRole = projectRoles.find((r) => r._id === editingMemberRole);
                  if (!selectedRole) return null;
                  return (
                    <>
                      {selectedRole.permissions?.voirTousProjets && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Voir tous projets
                        </div>
                      )}
                      {selectedRole.permissions?.gererTaches && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Gérer tâches
                        </div>
                      )}
                      {selectedRole.permissions?.gererSprints && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Gérer sprints
                        </div>
                      )}
                      {selectedRole.permissions?.voirBudget && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Voir budget
                        </div>
                      )}
                      {selectedRole.permissions?.modifierBudget && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Modifier budget
                        </div>
                      )}
                      {selectedRole.permissions?.gererMembresProjet && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Gérer membres
                        </div>
                      )}
                      {selectedRole.permissions?.genererRapports && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Générer rapports
                        </div>
                      )}
                      {selectedRole.permissions?.voirAudit && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Voir audit
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setEditingMember(null)}
            disabled={savingMemberRole}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSaveMemberRole}
            disabled={savingMemberRole || !editingMemberRole}
            className="bg-indigo-600"
          >
            {savingMemberRole ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
