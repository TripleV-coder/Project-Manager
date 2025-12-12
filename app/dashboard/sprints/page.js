'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Plus, Play, CheckCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';

export default function SprintsPage() {
  const router = useRouter();
  const { confirm } = useConfirmation();
  const [user, setUser] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [startingSprintId, setStartingSprintId] = useState(null);
  const [completingSprintId, setCompletingSprintId] = useState(null);
  const [newSprint, setNewSprint] = useState({
    projet_id: '',
    nom: '',
    objectif: '',
    date_début: '',
    date_fin: '',
    capacité_équipe: ''
  });

  const { hasPermission: canManageSprints } = user ? useRBACPermissions(user) : { hasPermission: () => false };

  // Memoize grouped sprints by project
  const sprintsByProject = useMemo(() => {
    const grouped = {};
    sprints.forEach(sprint => {
      if (!grouped[sprint.projet_id]) {
        grouped[sprint.projet_id] = [];
      }
      grouped[sprint.projet_id].push(sprint);
    });
    return grouped;
  }, [sprints]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Load user
      const userRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });

      if (!userRes.ok) {
        throw new Error('Failed to load user');
      }

      const userData = await userRes.json();
      setUser(userData);

      // Load projects first (faster)
      const projectsRes = await fetch('/api/projects?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });

      if (!projectsRes.ok) {
        throw new Error('Failed to load projects');
      }

      const projectsData = await projectsRes.json();
      setProjects(projectsData.projects || []);

      // Load sprints with a limit for faster initial load
      const sprintsRes = await fetch('/api/sprints?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });

      if (!sprintsRes.ok) {
        throw new Error('Failed to load sprints');
      }

      const sprintsData = await sprintsRes.json();
      setSprints(sprintsData.sprints || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      if (error.name !== 'AbortError') {
        toast.error('Erreur lors du chargement');
      }
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const initLoad = async () => {
      await loadData();
    };
    initLoad();
  }, [loadData]);

  const handleCreateSprint = useCallback(async () => {
    try {
      if (!newSprint.nom || !newSprint.projet_id || !newSprint.date_début || !newSprint.date_fin) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSprint),
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Sprint créé avec succès');
        setCreateDialogOpen(false);
        setNewSprint({ projet_id: '', nom: '', objectif: '', date_début: '', date_fin: '', capacité_équipe: '' });
        await loadData();
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erreur:', error);
        toast.error('Erreur de connexion');
      }
    }
  }, [newSprint, loadData]);

  const handleStartSprint = useCallback(async (sprintId) => {
    setStartingSprintId(sprintId);
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        toast.error('Authentification requise');
        setStartingSprintId(null);
        return;
      }

      const response = await fetch(`/api/sprints/${sprintId}/start`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      console.log('Sprint start response:', { status: response.status, data });

      if (response.ok) {
        toast.success('Sprint démarré avec succès');
        setSprints(prev => prev.map(s => s._id === sprintId ? { ...s, statut: 'Actif' } : s));
      } else {
        const errorMessage = data.error || data.message || 'Erreur lors du démarrage du sprint';
        console.error('Sprint start error:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Sprint start exception:', error);
        toast.error(`Erreur: ${error.message || 'Erreur de connexion'}`);
      }
    } finally {
      setStartingSprintId(null);
    }
  }, []);

  const handleCompleteSprint = useCallback(async (sprintId) => {
    const confirmed = await confirm({
      title: 'Terminer le sprint',
      description: 'Êtes-vous sûr de vouloir terminer ce sprint ?',
      actionLabel: 'Terminer',
      cancelLabel: 'Annuler'
    });
    if (!confirmed) return;

    setCompletingSprintId(sprintId);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/sprints/${sprintId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Sprint terminé avec succès');
        setSprints(prev => prev.map(s => s._id === sprintId ? { ...s, statut: 'Terminé' } : s));
      } else {
        const errorMessage = data.error || data.message || 'Erreur lors de la terminaison';
        toast.error(errorMessage);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erreur:', error);
        toast.error('Erreur de connexion');
      }
    } finally {
      setCompletingSprintId(null);
    }
  }, [confirm]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-80 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-indigo-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Sprints</h1>
          <p className="text-gray-600">Planifiez et suivez vos sprints Agile</p>
        </div>
        {canManageSprints('gererSprints') && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau sprint
          </Button>
        )}
      </div>

      {sprints.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun sprint</h3>
            <p className="text-gray-600 mb-4">Créez votre premier sprint pour commencer</p>
            {canManageSprints('gererSprints') && (
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Créer un sprint
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sprints.map((sprint, idx) => (
            <motion.div
              key={sprint._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{sprint.nom}</CardTitle>
                    <Badge variant={sprint.statut === 'Actif' ? 'default' : 'secondary'}>
                      {sprint.statut}
                    </Badge>
                  </div>
                  <CardDescription>{sprint.objectif}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(sprint.date_début).toLocaleDateString('fr-FR')} - {new Date(sprint.date_fin).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex gap-2">
                      {sprint.statut === 'Planifié' && (
                        <Button
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => handleStartSprint(sprint._id)}
                          disabled={startingSprintId === sprint._id}
                        >
                          {startingSprintId === sprint._id ? (
                            <>
                              <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Démarrage...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Démarrer
                            </>
                          )}
                        </Button>
                      )}
                      {sprint.statut === 'Actif' && (
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleCompleteSprint(sprint._id)}
                          disabled={completingSprintId === sprint._id}
                        >
                          {completingSprintId === sprint._id ? (
                            <>
                              <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Finalisation...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Terminer
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un nouveau sprint</DialogTitle>
            <DialogDescription>Définissez les paramètres de votre sprint</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nom du sprint *</Label>
                <Input
                  value={newSprint.nom}
                  onChange={(e) => setNewSprint({ ...newSprint, nom: e.target.value })}
                  placeholder="Sprint 1"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Projet *</Label>
                <Select value={newSprint.projet_id} onValueChange={(val) => setNewSprint({ ...newSprint, projet_id: val })}>
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
              <div className="col-span-2 space-y-2">
                <Label>Objectif</Label>
                <Textarea
                  value={newSprint.objectif}
                  onChange={(e) => setNewSprint({ ...newSprint, objectif: e.target.value })}
                  placeholder="Objectif du sprint..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de début *</Label>
                <Input
                  type="date"
                  value={newSprint.date_début}
                  onChange={(e) => setNewSprint({ ...newSprint, date_début: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin *</Label>
                <Input
                  type="date"
                  value={newSprint.date_fin}
                  onChange={(e) => setNewSprint({ ...newSprint, date_fin: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Capacité équipe (heures)</Label>
                <Input
                  type="number"
                  value={newSprint.capacité_équipe}
                  onChange={(e) => setNewSprint({ ...newSprint, capacité_équipe: e.target.value })}
                  placeholder="80"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateSprint} className="bg-indigo-600 hover:bg-indigo-700">
              Créer le sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
