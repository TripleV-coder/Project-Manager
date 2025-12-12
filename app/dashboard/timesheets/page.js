'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import StatusBadge from '@/components/StatusBadge';

export default function TimesheetsPage() {
  const router = useRouter();
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    projet_id: '',
    tâche_id: '',
    date: new Date().toISOString().split('T')[0],
    heures: '',
    description: ''
  });

  const handleStatusChange = (timesheetId, newStatut) => {
    setTimesheets(timesheets.map(t =>
      t._id === timesheetId ? { ...t, statut: newStatut } : t
    ));
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const [projectsRes, tasksRes, timesheetsRes] = await Promise.all([
        fetch('/api/projects?limit=50&page=1', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        }),
        fetch('/api/tasks?limit=100&page=1', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        }),
        fetch('/api/timesheets?limit=100&page=1', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        })
      ]);

      clearTimeout(timeoutId);

      if (!projectsRes.ok || !tasksRes.ok || !timesheetsRes.ok) {
        const status = !projectsRes.ok ? projectsRes.status : !tasksRes.ok ? tasksRes.status : timesheetsRes.status;
        if (status === 401) {
          router.push('/login');
        }
        throw new Error(`Erreur serveur ${status}`);
      }

      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();
      const timesheetsData = await timesheetsRes.json();

      setProjects(projectsData.projects || []);
      setTasks(tasksData.tasks || []);
      setTimesheets(timesheetsData.timesheets || []);
      setLoading(false);
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.error('La requête a dépassé le délai d\'attente - Veuillez vérifier votre connexion');
      } else if (error.message.includes('Erreur serveur 401')) {
        router.push('/login');
      } else {
        console.error('Erreur lors du chargement:', error);
        toast.error('Erreur lors du chargement - Veuillez recharger la page');
      }
      setLoading(false);
      setProjects([]);
      setTasks([]);
      setTimesheets([]);
    }
  };

  const handleCreateEntry = async () => {
    try {
      if (!newEntry.projet_id || !newEntry.date || !newEntry.heures) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      setSubmitting(true);
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEntry)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Temps enregistré avec succès');
        setCreateDialogOpen(false);
        setNewEntry({ projet_id: '', tâche_id: '', date: new Date().toISOString().split('T')[0], heures: '', description: '' });
        await loadData();
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  const totalHeures = timesheets.reduce((sum, t) => sum + (t.heures || 0), 0);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feuilles de Temps</h1>
          <p className="text-gray-600">Saisissez et suivez votre temps de travail</p>
        </div>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Saisir du temps
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total cette semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{totalHeures}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Entrées ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{timesheets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Moyenne par jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{timesheets.length > 0 ? (totalHeures / timesheets.length).toFixed(1) : 0}h</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {timesheets.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Aucune entrée pour le moment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Tâche</TableHead>
                  <TableHead>Heures</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(entry.date).toLocaleDateString('fr-FR')}
                      </div>
                    </TableCell>
                    <TableCell>{projects.find(p => p._id === entry.projet_id)?.nom || 'N/A'}</TableCell>
                    <TableCell>{entry.tâche_id ? tasks.find(t => t._id === entry.tâche_id)?.titre : 'Général'}</TableCell>
                    <TableCell>
                      <Badge className="bg-indigo-100 text-indigo-800">{entry.heures}h</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        type="timesheet"
                        statut={entry.statut || 'brouillon'}
                        entityId={entry._id}
                        onStatusChange={(newStatut) => handleStatusChange(entry._id, newStatut)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saisir du temps</DialogTitle>
            <DialogDescription>Enregistrez votre temps de travail</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Projet *</Label>
              <Select value={newEntry.projet_id} onValueChange={(val) => setNewEntry({ ...newEntry, projet_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tâche (optionnel)</Label>
              <Select value={newEntry.tâche_id} onValueChange={(val) => setNewEntry({ ...newEntry, tâche_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Aucune</SelectItem>
                  {tasks.filter(t => t.projet_id === newEntry.projet_id).map(t => (
                    <SelectItem key={t._id} value={t._id}>{t.titre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Heures *</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={newEntry.heures}
                  onChange={(e) => setNewEntry({ ...newEntry, heures: e.target.value })}
                  placeholder="8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="Description du travail effectué..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={submitting}>Annuler</Button>
            <Button onClick={handleCreateEntry} className="bg-indigo-600 hover:bg-indigo-700" disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
