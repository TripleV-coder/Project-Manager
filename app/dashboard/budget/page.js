'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  PieChart,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import StatusBadge from '@/components/StatusBadge';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useFormatters, useAppSettings, useTranslation } from '@/contexts/AppSettingsContext';
import { useAuthFetch } from '@/hooks/useAuthFetch';

export default function BudgetPage() {
  const router = useRouter();
  const { authFetch } = useAuthFetch();
  const { confirm } = useConfirmation();
  const { formatCurrency, formatDate } = useFormatters();
  const { settings: appSettings } = useAppSettings();
  const { t } = useTranslation();
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
    réel: 0,
  });

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    catégorie: 'humanResources',
    montant: 0,
    date_dépense: new Date().toISOString().split('T')[0],
    type: 'externe',
    justificatifs: [],
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [_uploadingFiles, setUploadingFiles] = useState(false);

  // Clés de catégories pour la traduction
  const categoryKeys = [
    'humanResources',
    'equipment',
    'softwareLicenses',
    'subcontracting',
    'training',
    'travel',
    'infrastructure',
    'marketing',
    'other',
  ];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadExpenseFiles = async () => {
    if (selectedFiles.length === 0) return [];

    setUploadingFiles(true);
    const uploadedJustificatifs = [];

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projet_id', selectedProject);

        const res = await authFetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const { data } = await res.json();
          uploadedJustificatifs.push({
            nom: data.nom,
            url: data.chemin || data.url,
            taille: data.taille,
            type: data.type_mime || data.type,
          });
        }
      }
      return uploadedJustificatifs;
    } catch (error) {
      console.error('Erreur upload:', error);
      return [];
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleStatusChange = async (expenseId, newStatut) => {
    // Optimistic update
    const previousExpenses = [...expenses];
    setExpenses((prev) => prev.map((e) => (e._id === expenseId ? { ...e, statut: newStatut } : e)));

    try {
      const response = await authFetch(`/api/expenses/${expenseId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statut: newStatut }),
        signal: AbortSignal.timeout(8000),
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert on error
        setExpenses(previousExpenses);
        throw new Error(data.error || t('errorOccurred'));
      }

      toast.success(t('savedSuccessfully'));
    } catch (error) {
      // Revert on error
      setExpenses(previousExpenses);
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        toast.error(t('connectionError'));
      } else {
        console.error('Error updating status:', error);
        toast.error(error.message || t('connectionError'));
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authFetch('/api/projects', {
        signal: controller.signal,
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
        const userResponse = await authFetch('/api/auth/me', {});
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserPermissions(userData.role_id?.permissions || userData.role?.permissions || {});
        }
      } catch (error) {
        console.error('Erreur lors du chargement des permissions:', error);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
      toast.error(t('errorOccurred'));
      setLoading(false);
      setProjects([]);
    }
  };

  const loadExpenses = async (projectId) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authFetch(`/api/expenses?projet_id=${projectId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Erreur chargement dépenses:', response.status, response.statusText);
        setExpenses([]);
        return;
      }

      const data = await response.json();
      setExpenses(data.expenses || data.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des dépenses:', error);
      setExpenses([]);
    }
  };

  const loadProjectData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authFetch(`/api/projects/${selectedProject}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Erreur chargement projet:', response.status);
        setProjectData(null);
        return;
      }

      const data = await response.json();
      setProjectData(data.project || data.data || null);

      const budget = data.project?.budget || data.data?.budget;
      if (budget) {
        setBudgetForm({
          prévisionnel: budget.prévisionnel || 0,
          réel: budget.réel || 0,
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
      const response = await authFetch(`/api/budget/projects/${selectedProject}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          budget: {
            prévisionnel: parseFloat(budgetForm.prévisionnel) || 0,
            réel: parseFloat(budgetForm.réel) || 0,
          },
        }),
      });

      if (response.ok) {
        toast.success(t('savedSuccessfully'));
        setEditBudgetDialogOpen(false);
        loadProjectData();
      } else {
        const data = await response.json();
        toast.error(data.error || t('errorOccurred'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(t('connectionError'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.montant) {
      toast.error(t('required'));
      return;
    }

    setSubmitting(true);
    try {
      const justificatifs = await uploadExpenseFiles();

      const response = await authFetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projet_id: selectedProject,
          description: expenseForm.description,
          catégorie: expenseForm.catégorie,
          montant: parseFloat(expenseForm.montant),
          date_dépense: expenseForm.date_dépense,
          type: expenseForm.type,
          justificatifs,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('expenseAdded'));
        setAddExpenseDialogOpen(false);
        setExpenseForm({
          description: '',
          catégorie: 'humanResources',
          montant: 0,
          date_dépense: new Date().toISOString().split('T')[0],
          type: 'externe',
          justificatifs: [],
        });
        setSelectedFiles([]);
        await loadExpenses(selectedProject);
      } else {
        toast.error(data.error || t('errorOccurred'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(t('connectionError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const confirmed = await confirm({
      title: t('delete'),
      description: t('deleteWarning'),
      actionLabel: t('delete'),
      cancelLabel: t('cancel'),
      isDangerous: true,
    });
    if (!confirmed) return;

    try {
      const response = await authFetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('expenseDeleted'));
        loadExpenses(selectedProject);
      } else {
        const data = await response.json();
        toast.error(data.error || t('errorOccurred'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(t('connectionError'));
    }
  };

  const budget = projectData?.budget || {};
  const budgetTotal = budget.prévisionnel || 0;
  const dépenses = expenses.reduce((sum, exp) => sum + (exp.montant || 0), 0);
  const restant = budgetTotal - dépenses;
  const pourcentage = budgetTotal > 0 ? (dépenses / budgetTotal) * 100 : 0;

  // RBAC: Vérifier les permissions budget
  const canModifyBudget = userPermissions.modifierBudget || userPermissions.adminConfig;
  const canViewBudget = userPermissions.voirBudget || userPermissions.adminConfig;

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

  if (!canViewBudget) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-red-900 mb-2">{t('accessDenied')}</h2>
                <p className="text-red-700">
                  {t('noPermissionBudget')}
                  <br />
                  {t('contactAdminError')}
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                {t('backToDashboard')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('budgetManagement')}</h1>
          <p className="text-gray-600">{t('budgetSubtitle')}</p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={t('selectProject')} />
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

      {!selectedProject ? (
        <Card className="p-12">
          <div className="text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Choisissez un projet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md mx-auto">
              Sélectionnez un projet dans le menu ci-dessus pour consulter son budget alloué, ses
              dépenses engagées et ses justificatifs.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card
              className={canModifyBudget ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
              onClick={() => canModifyBudget && setEditBudgetDialogOpen(true)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                  {t('budgetInitial')}
                  {canModifyBudget && <Edit2 className="w-4 h-4 text-gray-400" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(budgetTotal)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('budgetSpent')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{formatCurrency(dépenses)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('budgetRemaining')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${restant >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(restant)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('budgetUsage')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${pourcentage > 100 ? 'text-red-600' : pourcentage > 80 ? 'text-orange-600' : 'text-indigo-600'}`}
                >
                  {pourcentage.toFixed(0)}%
                </div>
                <p className="text-sm text-gray-500">{t('budgetConsumption')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Progression et Réserve */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('progress')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={Math.min(pourcentage, 100)} className="h-4" />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      {formatCurrency(dépenses)} {t('spent')}
                    </span>
                    <span>
                      {formatCurrency(budgetTotal)} {t('budgetTotal').toLowerCase()}
                    </span>
                  </div>
                  {pourcentage > 80 && pourcentage <= 100 && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <span className="text-sm text-orange-800">{t('budgetWarning')}</span>
                    </div>
                  )}
                  {pourcentage > 100 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-800">
                        {t('budgetExceeded')} ({(pourcentage - 100).toFixed(0)}%)
                      </span>
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
                  {t('category')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(expensesByCategory).map(([cat, montant]) => (
                    <div key={cat} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 truncate">{t(cat) || cat}</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(montant)}</p>
                      <p className="text-xs text-gray-500">
                        {dépenses > 0 ? ((montant / dépenses) * 100).toFixed(1) : 0}%{' '}
                        {t('expenses').toLowerCase()}
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
                <CardTitle>{t('expenses')}</CardTitle>
                {canModifyBudget && (
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => setAddExpenseDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('justifyExpense')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">{t('noExpenses')}</p>
                  {canModifyBudget && (
                    <Button onClick={() => setAddExpenseDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      {t('add')}
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('description')}</TableHead>
                      <TableHead>{t('category')}</TableHead>
                      <TableHead className="text-right">{t('amount')}</TableHead>
                      <TableHead>{t('budgetProof')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense._id}>
                        <TableCell className="text-gray-600">
                          {formatDate(expense.date_dépense)}
                        </TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {t(expense.catégorie) || expense.catégorie}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(expense.montant)}
                        </TableCell>
                        <TableCell>
                          {expense.justificatifs && expense.justificatifs.length > 0 ? (
                            <div className="flex gap-1">
                              {expense.justificatifs.map((j, idx) => (
                                <a
                                  key={idx}
                                  href={j.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                                  title={j.nom}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                    <polyline points="14 2 14 8 20 8" />
                                  </svg>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">{t('none')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            type="expense"
                            statut={expense.statut || 'en_attente'}
                            entityId={expense._id}
                            onStatusChange={(newStatut) =>
                              handleStatusChange(expense._id, newStatut)
                            }
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
            <DialogTitle>
              {t('edit')} {t('budget')}
            </DialogTitle>
            <DialogDescription>{t('budgetTotal')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {t('budget')} ({appSettings.devise || 'FCFA'})
              </Label>
              <Input
                type="number"
                value={budgetForm.prévisionnel}
                onChange={(e) => setBudgetForm({ ...budgetForm, prévisionnel: e.target.value })}
                placeholder="Ex: 50000000"
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t('budgetSpent')} ({appSettings.devise || 'FCFA'})
              </Label>
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
              {t('cancel')}
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSaveBudget}
              disabled={saving}
            >
              {saving ? t('loading') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ajouter Dépense */}
      <Dialog open={addExpenseDialogOpen} onOpenChange={setAddExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addExpense')}</DialogTitle>
            <DialogDescription>{t('expenses')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('description')} *</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder={t('expensePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('category')}</Label>
              <Select
                value={expenseForm.catégorie}
                onValueChange={(val) => setExpenseForm({ ...expenseForm, catégorie: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryKeys.map((catKey) => (
                    <SelectItem key={catKey} value={catKey}>
                      {t(catKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {t('amount')} ({appSettings.devise || 'FCFA'}) *
              </Label>
              <Input
                type="number"
                value={expenseForm.montant}
                onChange={(e) => setExpenseForm({ ...expenseForm, montant: e.target.value })}
                placeholder="Ex: 500000"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('date')} *</Label>
              <Input
                type="date"
                value={expenseForm.date_dépense}
                onChange={(e) => setExpenseForm({ ...expenseForm, date_dépense: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('type')}</Label>
              <Select
                value={expenseForm.type}
                onValueChange={(val) => setExpenseForm({ ...expenseForm, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interne">{t('expenseTypeInternal')}</SelectItem>
                  <SelectItem value="externe">{t('expenseTypeExternal')}</SelectItem>
                  <SelectItem value="matériel">{t('expenseTypeEquipment')}</SelectItem>
                  <SelectItem value="service">{t('expenseTypeService')}</SelectItem>
                  <SelectItem value="autre">{t('expenseTypeOther')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('budgetProofLabel')}</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="expense-files"
                />
                <Label
                  htmlFor="expense-files"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Plus className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">{t('budgetProofClick')}</span>
                  <span className="text-xs text-gray-400 mt-1">{t('budgetProofHelp')}</span>
                </Label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white p-2 rounded border text-sm"
                    >
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500"
                        onClick={() => removeFile(idx)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddExpenseDialogOpen(false)}
              disabled={submitting}
            >
              {t('cancel')}
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleAddExpense}
              disabled={submitting || !expenseForm.description || !expenseForm.montant}
            >
              {submitting ? t('loading') : t('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
