'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FolderKanban, Plus, Search, Filter, Grid, List, Calendar, Users } from 'lucide-react';
import { safeFetch } from '@/lib/fetch-with-timeout';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    nom: '',
    description: '',
    template_id: '',
    date_début: '',
    date_fin_prévue: ''
  });

  const rbacPermissions = useRBACPermissions(user);

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

      const [userData, projectsData, templatesData] = await Promise.all([
        safeFetch('/api/auth/me', token),
        safeFetch('/api/projects?limit=50&page=1', token),
        safeFetch('/api/project-templates', token)
      ]);

      setUser(userData);
      setProjects(projectsData.projects || []);

      // Si pas de templates, essayer créer template par défaut (admin only)
      if (!templatesData.templates || templatesData.templates.length === 0) {
        try {
          const initData = await safeFetch('/api/init-default-template', token, {
            method: 'POST'
          });
          setTemplates([initData.template]);
        } catch (initError) {
          // Si l'utilisateur n'a pas les permissions d'admin (403), on continue sans template par défaut
          if (initError.message !== 'UNAUTHORIZED') {
            console.warn('Impossible de créer le template par défaut:', initError);
          }
          setTemplates([]);
        }
      } else {
        setTemplates(templatesData.templates || []);
      }

      setLoading(false);
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') {
        router.push('/login');
      } else if (error.message === 'TIMEOUT') {
        toast.error('Chargement dépassé - Veuillez recharger');
      } else {
        console.error('Erreur chargement:', error);
        toast.error('Erreur lors du chargement des projets');
      }
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      if (!newProject.nom.trim()) {
        toast.error('Le nom du projet est requis');
        return;
      }

      if (!newProject.template_id) {
        toast.error('Veuillez sélectionner un template');
        return;
      }

      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      await safeFetch('/api/projects', token, {
        method: 'POST',
        body: JSON.stringify(newProject)
      });

      setCreateDialogOpen(false);
      setNewProject({ nom: '', description: '', template_id: '', date_début: '', date_fin_prévue: '' });
      toast.success('Projet créé avec succès');
      await loadData();
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') {
        router.push('/login');
      } else if (error.message === 'TIMEOUT') {
        toast.error('La requête a dépassé le délai d\'attente');
      } else {
        console.error('Erreur création projet:', error);
        toast.error('Erreur lors de la création du projet');
      }
    }
  };

  const filteredProjects = projects.filter(p => 
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Projets</h1>
          <p className="text-gray-600">Gérez tous vos projets en un seul endroit</p>
        </div>
        {user && rbacPermissions.canCreateProject && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau projet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un nouveau projet</DialogTitle>
                <DialogDescription>Remplissez les informations pour créer votre projet</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom du projet</Label>
                  <Input
                    value={newProject.nom}
                    onChange={(e) => setNewProject({ ...newProject, nom: e.target.value })}
                    placeholder="Ex: Refonte site web"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Description du projet..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={newProject.template_id} onValueChange={(val) => setNewProject({ ...newProject, template_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t._id} value={t._id}>{t.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={newProject.date_début}
                      onChange={(e) => setNewProject({ ...newProject, date_début: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de fin prévue</Label>
                    <Input
                      type="date"
                      value={newProject.date_fin_prévue}
                      onChange={(e) => setNewProject({ ...newProject, date_fin_prévue: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
                <Button
                  onClick={handleCreateProject}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={!newProject.nom.trim() || !newProject.template_id || templates.length === 0}
                >
                  Créer le projet
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un projet..."
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Projects Grid/List */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun projet</h3>
            <p className="text-gray-600 mb-4">Commencez par créer votre premier projet</p>
            {user && rbacPermissions.canCreateProject && (
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Créer un projet
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredProjects.map((project, idx) => (
            <motion.div
              key={project._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/projects/${project._id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{project.nom}</CardTitle>
                      <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                    </div>
                    <Badge variant={project.statut === 'En cours' ? 'default' : 'secondary'}>
                      {project.statut}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{project.date_début ? new Date(project.date_début).toLocaleDateString('fr-FR') : 'Non défini'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{project.membres?.length || 0} membres</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${project.stats?.progression || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600">{project.stats?.progression || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
