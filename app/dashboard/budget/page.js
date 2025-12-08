'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function BudgetPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectBudget, setProjectBudget] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProject && selectedProject !== 'all') {
      loadProjectBudget();
    }
  }, [selectedProject]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProjects(data.projects || []);
      
      if (data.projects && data.projects.length > 0 && !selectedProject) {
        setSelectedProject(data.projects[0]._id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const loadProjectBudget = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/projects/${selectedProject}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProjectBudget(data.project?.budget || null);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const budget = projectBudget || {};
  const budgetTotal = budget.budget_total || 0;
  const dépenses = budget.dépenses_actuelles || 0;
  const restant = budgetTotal - dépenses;
  const pourcentage = budgetTotal > 0 ? (dépenses / budgetTotal) * 100 : 0;

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
          <p className="text-gray-600">Suivez vos budgets et dépenses par projet</p>
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
            <p className="text-gray-600">Choisissez un projet pour voir son budget</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Budget Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{budgetTotal.toLocaleString('fr-FR')} €</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Dépensé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{dépenses.toLocaleString('fr-FR')} €</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Restant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{restant.toLocaleString('fr-FR')} €</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Consommation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600">{pourcentage.toFixed(0)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Progression du budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={pourcentage} className="h-4" />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{dépenses.toLocaleString('fr-FR')} € dépensés</span>
                  <span>{budgetTotal.toLocaleString('fr-FR')} € budget total</span>
                </div>
                {pourcentage > 80 && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg mt-4">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-orange-800">Attention : Budget consommé à plus de 80%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Dépenses</CardTitle>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une dépense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(!budget.détails_dépenses || budget.détails_dépenses.length === 0) ? (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Aucune dépense enregistrée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(budget.détails_dépenses || []).map((expense, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{new Date(expense.date).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.catégorie}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{expense.montant.toLocaleString('fr-FR')} €</TableCell>
                        <TableCell>
                          <Badge variant={expense.validé ? 'default' : 'secondary'}>
                            {expense.validé ? 'Validé' : 'En attente'}
                          </Badge>
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
    </div>
  );
}
