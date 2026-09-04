'use client';

import { Wallet, Clock, BarChart3, CheckCircle2, Settings2, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function ProjectOverviewTab({
  project,
  totalExpenses,
  canViewBudget,
  canViewTimesheet,
  canViewReports,
  canViewAudit,
  canManageMembers,
  formatCurrency,
  formatDate,
  getStatusColor,
  getPriorityColor,
  t,
  router,
  projectId,
  addingMember,
  setAddingMember,
  availableUsers,
  projectRoles,
  newMember,
  setNewMember,
  selectedUserRole,
  handleUserSelect,
  selectedProjectRole,
  setSelectedProjectRole,
  savingMember,
  handleAddMember,
  removingMemberId,
  handleRemoveMember,
  handleEditMemberRole,
}) {
  if (!project) return null;

  const membersList = project.membres || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Priority */}
          <Card>
            <CardHeader>
              <CardTitle>{t('projectInfoTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('currentStatus')}</p>
                  <div
                    className={`px-3 py-2 rounded-lg w-fit text-sm font-medium ${getStatusColor(project.statut)}`}
                  >
                    {project.statut}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('priorityLevel')}</p>
                  <div className={`font-semibold ${getPriorityColor(project.priorité)}`}>
                    {project.priorité}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date de début</p>
                  <p className="font-medium">
                    {project.date_début ? formatDate(project.date_début) : 'Non défini'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date de fin prévue</p>
                  <p className="font-medium">
                    {project.date_fin_prévue ? formatDate(project.date_fin_prévue) : 'Non défini'}
                  </p>
                </div>
              </div>

              {/* Budget Display */}
              {canViewBudget &&
                project.budget &&
                (project.budget.prévisionnel > 0 || totalExpenses > 0) && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet className="w-4 h-4 text-indigo-600" />
                      <p className="text-sm font-semibold text-gray-700">
                        {t('projectBudgetTitle')}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('plannedBudget')}</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {formatCurrency(project.budget.prévisionnel || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('actualExpenses')}</p>
                        <p
                          className={`text-lg font-bold ${totalExpenses > project.budget.prévisionnel ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {formatCurrency(totalExpenses)}
                        </p>
                      </div>
                    </div>
                    {project.budget.prévisionnel > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600">{t('budgetConsumption')}</span>
                          <span className="text-xs font-medium">
                            {Math.round((totalExpenses / project.budget.prévisionnel) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              totalExpenses / project.budget.prévisionnel > 1
                                ? 'bg-red-500'
                                : totalExpenses / project.budget.prévisionnel > 0.8
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min((totalExpenses / project.budget.prévisionnel) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Reste: {formatCurrency(project.budget.prévisionnel - totalExpenses)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>{t('projectProgress')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{t('projectProgress')}</span>
                  <span className="text-sm font-bold text-indigo-600">
                    {project.stats?.progression || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${project.stats?.progression || 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-600">{t('completedTasks')}</p>
                  <p className="text-lg font-bold text-green-600">
                    {project.stats?.tâches_terminées || 0}/{project.stats?.total_tâches || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">{t('actualHours')}</p>
                  <p className="text-lg font-bold text-blue-600">
                    {project.stats?.heures_réelles || 0}h / {project.stats?.heures_estimées || 0}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('projectTeamTitle')}</CardTitle>
                {canManageMembers && (
                  <Dialog open={addingMember} onOpenChange={setAddingMember}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-indigo-600">
                        <Plus className="w-4 h-4 mr-1" />
                        {t('addMemberButton')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Ajouter un membre au projet</DialogTitle>
                        <DialogDescription>
                          Sélectionnez l'utilisateur et le rôle système à assigner dans ce projet
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Utilisateur et son rôle système</Label>
                          <Select value={newMember.user_id} onValueChange={handleUserSelect}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un utilisateur" />
                            </SelectTrigger>
                            <SelectContent className="w-full max-w-md">
                              {availableUsers.map((u) => (
                                <SelectItem key={u._id} value={u._id}>
                                  <div className="text-left">
                                    <div className="font-medium">{u.nom_complet}</div>
                                    <div className="text-xs text-gray-500">
                                      {u.email} • Rôle:{' '}
                                      <span className="font-semibold">{u.role?.nom}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Afficher les permissions du rôle système sélectionné */}
                        {selectedUserRole && (
                          <div className="space-y-3">
                            <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-bold text-indigo-900">
                                    {selectedUserRole.nom}
                                  </p>
                                  <p className="text-sm text-indigo-800">
                                    {selectedUserRole.description}
                                  </p>
                                </div>
                                <Badge className="bg-indigo-600">
                                  {selectedUserRole.is_predefined ? '8 rôles' : 'Custom'}
                                </Badge>
                              </div>

                              <div className="mt-3 pt-3 border-t border-indigo-200">
                                <p className="text-xs font-semibold text-indigo-900 mb-2">
                                  PERMISSIONS:
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-indigo-800">
                                  {selectedUserRole.permissions?.voirTousProjets && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Voir tous projets
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.creerProjet && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Créer projets
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.modifierCharteProjet && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Modifier projets
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.supprimerProjet && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Supprimer projets
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.gererMembresProjet && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Gérer membres
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.gererTaches && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Gérer tâches
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.voirBudget && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Voir budget
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.modifierBudget && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Modifier budget
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.voirTempsPasses && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Voir timesheets
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.gererSprints && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Gérer sprints
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.genererRapports && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Générer rapports
                                    </div>
                                  )}
                                  {selectedUserRole.permissions?.voirAudit && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Voir audit
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Rôle système à assigner</Label>
                          <Select
                            value={newMember.project_role_id}
                            onValueChange={(roleId) => {
                              setNewMember({ ...newMember, project_role_id: roleId });
                              const role = projectRoles.find((r) => r._id === roleId);
                              setSelectedProjectRole(role);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un rôle pour le projet" />
                            </SelectTrigger>
                            <SelectContent className="w-full max-w-md">
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

                        {/* Afficher les permissions du rôle de projet sélectionné */}
                        {selectedProjectRole && (
                          <div className="space-y-3">
                            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-bold text-blue-900">
                                    {selectedProjectRole.nom}
                                  </p>
                                  <p className="text-sm text-blue-800">
                                    {selectedProjectRole.description}
                                  </p>
                                </div>
                                <Badge className="bg-blue-600">Rôle système</Badge>
                              </div>

                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <p className="text-xs font-semibold text-blue-900 mb-2">
                                  PERMISSIONS DU RÔLE:
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                                  {selectedProjectRole.permissions?.voirTousProjets && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Voir tous projets
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.creerProjet && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Créer projets
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.modifierCharteProjet && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Modifier projets
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.supprimerProjet && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Supprimer projets
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.gererMembresProjet && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Gérer membres
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.gererTaches && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Gérer tâches
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.voirBudget && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Voir budget
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.modifierBudget && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Modifier budget
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.voirTempsPasses && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Voir timesheets
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.gererSprints && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Gérer sprints
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.genererRapports && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Générer rapports
                                    </div>
                                  )}
                                  {selectedProjectRole.permissions?.voirAudit && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Voir audit
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setAddingMember(false)}
                          disabled={savingMember}
                        >
                          Annuler
                        </Button>
                        <Button
                          onClick={handleAddMember}
                          disabled={savingMember}
                          className="bg-indigo-600"
                        >
                          {savingMember ? 'Ajout en cours...' : 'Ajouter le membre'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Chef de projet */}
                {project.chef_projet && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-indigo-600 text-white">
                          {project.chef_projet.nom_complet?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">
                          {project.chef_projet.nom_complet}
                        </p>
                        <p className="text-xs text-gray-600">Chef de projet</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Owner */}
                {project.product_owner && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-purple-600 text-white">
                          {project.product_owner.nom_complet?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">
                          {project.product_owner.nom_complet}
                        </p>
                        <p className="text-xs text-gray-600">Product Owner</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Other Members */}
                {membersList.length > 0 ? (
                  membersList.map((member) => {
                    const memberRole =
                      member.project_role_id?.nom || member.user_id?.role?.nom || 'Membre';
                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-gray-600 text-white">
                              {member.user_id?.nom_complet?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {member.user_id?.nom_complet}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {memberRole}
                            </Badge>
                          </div>
                        </div>
                        {canManageMembers && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMemberRole(member)}
                              className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                              title="Modifier le rôle"
                            >
                              <Settings2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member._id)}
                              disabled={removingMemberId === member._id}
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Retirer du projet"
                            >
                              {removingMemberId === member._id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 py-4">{t('noMembers')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Budget - Visible si permission voirBudget */}
          {canViewBudget && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Prévisionnel</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(project.budget?.prévisionnel || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Réel</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(project.budget?.réel || 0)}
                  </p>
                </div>
                <div className="p-2 bg-gray-100 rounded text-xs text-gray-600">
                  <p>
                    Restant:{' '}
                    {formatCurrency(
                      (project.budget?.prévisionnel || 0) - (project.budget?.réel || 0)
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timesheets - Visible si permission voirTempsPasses */}
          {canViewTimesheet && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Temps passé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Heures estimées</p>
                  <p className="text-lg font-bold text-gray-900">
                    {project.stats?.heures_estimées || 0}h
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Heures réelles</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {project.stats?.heures_réelles || 0}h
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reports - Visible si permission genererRapports */}
          {canViewReports && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Rapports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/dashboard/reports?projectId=${projectId}`)}
                >
                  Générer un rapport
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Audit Trail - Visible si permission voirAudit */}
          {canViewAudit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Audit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Historique des modifications disponible</p>
              </CardContent>
            </Card>
          )}

          {/* Key Info - Always visible */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Template</p>
                <p className="font-medium">{project.template_id?.nom || 'Non défini'}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Créé par</p>
                <p className="font-medium">{project.créé_par?.nom_complet || 'Inconnu'}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Créé le</p>
                <p className="font-medium">
                  {new Date(project.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {project.date_fin_réelle && (
                <div>
                  <p className="text-gray-600 mb-1">Terminé le</p>
                  <p className="font-medium">
                    {new Date(project.date_fin_réelle).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
