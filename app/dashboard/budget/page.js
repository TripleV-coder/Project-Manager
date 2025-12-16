'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, AlertTriangle, Plus, Edit2, Trash2, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import StatusBadge from '@/components/StatusBadge';
import { useConfirmation } from '@/hooks/useConfirmation';

export default function BudgetPage() {
  const router = useRouter();
  const { confirm } = useConfirmation();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [editBudgetDialogOpen, setEditBudgetDialogOpen] = useState(false);
  const [addExpenseDialogOpen, setAddExpenseDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});

  const [budgetForm, setBudgetForm] = useState({
    prévisionnel: 0,
    réel: 0
  });

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    catégorie: 'Ressources humaines',
    montant: 0,
    date_dépense: new Date().toISOString().split('T')[0],
    type: 'externe'
  });

  const catégories = [
    'Ressources humaines',
    'Matériel',
    'Logiciels & Licences',
    'Sous-traitance',
    'Formation',
    'Déplacements',
    'Infrastructure',
    'Marketing',
    'Autre'
  ];

  const handleStatusChange = async (expenseId, newStatut) => {
    // Optimistic update
    const previousExpenses = [...expenses];
    setExpenses(prev => prev.map(e =>
      e._id === expenseId ? { ...e, statut: newStatut } : e
    ));

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/expenses/${expenseId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statut: newStatut }),
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert on error
        setExpenses(previousExpenses);
        throw new Error(data.error || 'Erreur lors de la mise à jour du statut');
      }

      toast.success('Statut mis à jour');
    } catch (error) {
      // Revert on error
      setExpenses(previousExpenses);
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        toast.error('La requête a expiré, veuillez réessayer');
      } else {
        console.error('Error updating status:', error);
        toast.error(error.message || 'Erreur de connexion');
      }
      throw error; // Rethrow so StatusBadge knows it failed
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProject && selectedProject !== 'all') {
      loadProjectData();
      loadExpenses(selectedProject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // API returns { success: true, data: [...] } or legacy format
      const projectsList = data.data || data.projects || [];
      setProjects(projectsList);

      if (projectsList.length > 0 && !selectedProject) {
        setSelectedProject(projectsList[0]._id);
      }

      try {
        const userResponse = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserPermissions(userData.role?.permissions || {});
        }
      } catch (error) {
        console.error('Erreur lors du chargement des permissions:', error);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
      toast.error('Erreur lors du chargement des projets');
      setLoading(false);
      setProjects([]);
    }
  };

  const loadExpenses = async (projectId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/api/expenses?projet_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Erreur chargement dépenses:', response.status, response.statusText);
        setExpenses([]);
        return;
      }

      const data = await response.json();
      setExpenses(data.expenses || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des dépenses:', error);
      setExpenses([]);
      setLoading(false);
    }
  };

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/api/projects/${selectedProject}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Erreur chargement projet:', response.status);
        setProjectData(null);
        return;
      }

      const data = await response.json();
      setProjectData(data.project || null);

      if (data.project?.budget) {
        setBudgetForm({
          prévisionnel: data.project.budget.prévisionnel || 0,
          réel: data.project.budget.réel || 0
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du projet:', error);
      setProjectData(null);
    }
  };

  const handleSaveBudget = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/budget/projects/${selectedProject}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          budget: {
            prévisionnel: parseFloat(budgetForm.prévisionnel) || 0,
            réel: parseFloat(budgetForm.réel) || 0
          }
        })
      });

      if (response.ok) {
        toast.success('Budget mis à jour avec succès');
        setEditBudgetDialogOpen(false);
        loadProjectData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.montant) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projet_id: selectedProject,
          description: expenseForm.description,
          catégorie: expenseForm.catégorie,
          montant: parseFloat(expenseForm.montant),
          date_dépense: expenseForm.date_dépense,
          type: expenseForm.type
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Dépense ajoutée avec succès');
        setAddExpenseDialogOpen(false);
        setExpenseForm({
          description: '',
          catégorie: 'Ressources humaines',
          montant: 0,
          date_dépense: new Date().toISOString().split('T')[0],
          type: 'externe'
        });
        loadExpenses(selectedProject);
      } else {
        toast.error(data.error || 'Erreur lors de l\'ajout');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const confirmed = await confirm({
      title: 'Supprimer la dépense',
      description: 'Êtes-vous sûr de vouloir supprimer cette dépense ?',
      actionLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Dépense supprimée');
        loadExpenses(selectedProject);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const budget = projectData?.budget || {};
  const budgetTotal = budget.prévisionnel || 0;
  const dépenses = expenses.reduce((sum, exp) => sum + (exp.montant || 0), 0);
  const restant = budgetTotal - dépenses;
  const pourcentage = budgetTotal > 0 ? (dépenses / budgetTotal) * 100 : 0;

  // RBAC: Vérifier les permissions budget
  const canModifyBudget = userPermissions.modifierBudget || userPermissions.adminConfig;

  // Calcul par catégorie
  const expensesByCategory = expenses.reduce((acc, exp) => {
    acc[exp.catégorie] = (acc[exp.catégorie] || 0) + exp.montant;
    return acc;
  }, {});

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion du Budget</h1>
          <p className="text-gray-600">Suivez vos budgets et dépenses par projet (en FCFA)</p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sélectionner un projet" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProject ? (
        <Card className="p-12">
          <div className="text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Sélectionnez un projet</h3>
            <p className="text-gray-600">Choisissez un projet pour voir et gérer son budget</p>
          </div>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card
              className={canModifyBudget ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}
              onClick={() => canModifyBudget && setEditBudgetDialogOpen(true)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                  Budget Total
                  {canModifyBudget && <Edit2 className="w-4 h-4 text-gray-400" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{budgetTotal.toLocaleString('fr-FR')}</div>
                <p className="text-sm text-gray-500">FCFA</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Dépensé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{dépenses.toLocaleString('fr-FR')}</div>
                <p className="text-sm text-gray-500">FCFA</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Restant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${restant >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {restant.toLocaleString('fr-FR')}
                </div>
                <p className="text-sm text-gray-500">FCFA</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Consommation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${pourcentage > 100 ? 'text-red-600' : pourcentage > 80 ? 'text-orange-600' : 'text-indigo-600'}`}>
                  {pourcentage.toFixed(0)}%
                </div>
                <p className="text-sm text-gray-500">du budget</p>
              </CardContent>
            </Card>
          </div>

          {/* Progression et Réserve */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Progression du budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={Math.min(pourcentage, 100)} className="h-4" />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{dépenses.toLocaleString('fr-FR')} FCFA dépensés</span>
                    <span>{budgetTotal.toLocaleString('fr-FR')} FCFA budget total</span>
                  </div>
                  {pourcentage > 80 && pourcentage <= 100 && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <span className="text-sm text-orange-800">Attention : Budget consommé à plus de 80%</span>
                    </div>
                  )}
                  {pourcentage > 100 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-800">Alerte : Budget dépassé de {(pourcentage - 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Répartition par catégorie */}
          {Object.keys(expensesByCategory).length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Répartition par catégorie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(expensesByCategory).map(([cat, montant]) => (
                    <div key={cat} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 truncate">{cat}</p>
                      <p className="text-lg font-bold text-gray-900">{montant.toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-xs text-gray-500">
                        {dépenses > 0 ? ((montant / dépenses) * 100).toFixed(1) : 0}% des dépenses
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des dépenses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Détail des dépenses</CardTitle>
                {canModifyBudget && (
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => setAddExpenseDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter une dépense
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Aucune dépense enregistrée</p>
                  {canModifyBudget && (
                    <Button onClick={() => setAddExpenseDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter la première dépense
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense._id}>
                        <TableCell className="text-gray-600">
                          {new Date(expense.date_dépense).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.catégorie}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {expense.montant.toLocaleString('fr-FR')} FCFA
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                          type="expense"
                          statut={expense.statut || 'en_attente'}
                          entityId={expense._id}
                          onStatusChange={(newStatut) => handleStatusChange(expense._id, newStatut)}
                          userPermissions={userPermissions}
                        />
                        </TableCell>
                        <TableCell>
                          {canModifyBudget && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteExpense(expense._id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog: Modifier Budget */}
      <Dialog open={editBudgetDialogOpen} onOpenChange={setEditBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le budget</DialogTitle>
            <DialogDescription>
              Définissez le budget total et la réserve de contingence
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Budget prévisionnel (FCFA)</Label>
              <Input
                type="number"
                value={budgetForm.prévisionnel}
                onChange={(e) => setBudgetForm({ ...budgetForm, prévisionnel: e.target.value })}
                placeholder="Ex: 50000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Budget réel (FCFA)</Label>
              <Input
                type="number"
                value={budgetForm.réel}
                onChange={(e) => setBudgetForm({ ...budgetForm, réel: e.target.value })}
                placeholder="Ex: 45000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBudgetDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700" 
              onClick={handleSaveBudget}
              disabled={saving}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ajouter Dépense */}
      <Dialog open={addExpenseDialogOpen} onOpenChange={setAddExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une dépense</DialogTitle>
            <DialogDescription>
              Enregistrez une nouvelle dépense pour ce projet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Ex: Achat de licences logicielles"
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select 
                value={expenseForm.catégorie} 
                onValueChange={(val) => setExpenseForm({ ...expenseForm, catégorie: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catégories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant (FCFA) *</Label>
              <Input
                type="number"
                value={expenseForm.montant}
                onChange={(e) => setExpenseForm({ ...expenseForm, montant: e.target.value })}
                placeholder="Ex: 500000"
              />
            </div>
            <div className="space-y-2">
              <Label>Date de dépense *</Label>
              <Input
                type="date"
                value={expenseForm.date_dépense}
                onChange={(e) => setExpenseForm({ ...expenseForm, date_dépense: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={expenseForm.type}
                onValueChange={(val) => setExpenseForm({ ...expenseForm, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interne">Interne</SelectItem>
                  <SelectItem value="externe">Externe</SelectItem>
                  <SelectItem value="matériel">Matériel</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddExpenseDialogOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleAddExpense}
              disabled={submitting || !expenseForm.description || !expenseForm.montant}
            >
              {submitting ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
