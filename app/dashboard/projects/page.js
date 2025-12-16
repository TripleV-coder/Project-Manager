'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, Plus, Search, Grid, List, Calendar, Users, Type, Hash, FileText, DollarSign, Link2, User } from 'lucide-react';
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
import TablePagination from '@/components/ui/table-pagination';

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [totalProjects, setTotalProjects] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [allUsers, setAllUsers] = useState([]);
  const [newProject, setNewProject] = useState({
    nom: '',
    description: '',
    template_id: '',
    date_début: '',
    date_fin_prévue: '',
    champs_personnalisés: {}
  });

  const rbacPermissions = useRBACPermissions(user);

  // Get the selected template's custom fields
  const selectedTemplate = useMemo(() => {
    return templates.find(t => t._id === newProject.template_id);
  }, [templates, newProject.template_id]);

  // Group fields by their group property
  const groupedFields = useMemo(() => {
    if (!selectedTemplate?.champs || selectedTemplate.champs.length === 0) return {};

    const groups = {};
    const sortedFields = [...selectedTemplate.champs].sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedFields.forEach(field => {
      const groupName = field.group || 'Champs personnalisés';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(field);
    });

    return groups;
  }, [selectedTemplate]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  /**
   * Extrait les données d'une réponse API de manière sécurisée
   */
  const extractApiData = (response, keys = ['data']) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    for (const key of keys) {
      if (response[key] && Array.isArray(response[key])) {
        return response[key];
      }
    }
    return [];
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [userData, projectsData, templatesData, usersData] = await Promise.all([
        safeFetch('/api/auth/me', token),
        safeFetch(`/api/projects?limit=${itemsPerPage}&page=${currentPage}`, token),
        safeFetch('/api/project-templates', token),
        safeFetch('/api/users?limit=200', token)
      ]);

      setUser(userData);

      // Vérification sécurisée du format de réponse API pour les projets
      const projectsList = extractApiData(projectsData, ['data', 'projects']);
      if (!Array.isArray(projectsList)) {
        console.error('Format de réponse invalide pour les projets:', projectsData);
        toast.error('Erreur de format de données');
        setProjects([]);
        setTotalProjects(0);
      } else {
        setProjects(projectsList);
        setTotalProjects(projectsData.pagination?.total || projectsData.total || projectsList.length || 0);
      }

      // Vérification sécurisée du format de réponse API pour les templates
      const templatesList = extractApiData(templatesData, ['templates', 'data']);
      if (!Array.isArray(templatesList) || templatesList.length === 0) {
        try {
          const initData = await safeFetch('/api/init-default-template', token, {
            method: 'POST'
          });
          if (initData.template) {
            setTemplates([initData.template]);
          } else {
            setTemplates([]);
          }
        } catch (initError) {
          if (initError.message !== 'UNAUTHORIZED') {
            console.warn('Impossible de créer le template par défaut:', initError);
          }
          setTemplates([]);
        }
      } else {
        setTemplates(templatesList);
      }

      // Load users for user type fields
      const usersList = extractApiData(usersData, ['data', 'users']);
      setAllUsers(usersList);

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

  const handleTemplateChange = (templateId) => {
    // Reset custom fields when template changes
    const template = templates.find(t => t._id === templateId);
    const initialCustomFields = {};

    if (template?.champs) {
      template.champs.forEach(field => {
        // Set default values
        if (field.default_value) {
          initialCustomFields[field.id] = field.default_value;
        } else if (field.type === 'date' && field.properties?.aujourdhui_par_defaut) {
          initialCustomFields[field.id] = new Date().toISOString().split('T')[0];
        } else if (field.properties?.multiple) {
          initialCustomFields[field.id] = [];
        } else {
          initialCustomFields[field.id] = '';
        }
      });
    }

    setNewProject({
      ...newProject,
      template_id: templateId,
      champs_personnalisés: initialCustomFields
    });
  };

  const handleCustomFieldChange = (fieldId, value) => {
    setNewProject({
      ...newProject,
      champs_personnalisés: {
        ...newProject.champs_personnalisés,
        [fieldId]: value
      }
    });
  };

  const validateCustomFields = () => {
    if (!selectedTemplate?.champs) return true;

    for (const field of selectedTemplate.champs) {
      if (field.required) {
        const value = newProject.champs_personnalisés[field.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          toast.error(`Le champ "${field.label}" est requis`);
          return false;
        }
      }

      // Validate specific field types
      if (field.type === 'nombre' && newProject.champs_personnalisés[field.id]) {
        const num = parseFloat(newProject.champs_personnalisés[field.id]);
        if (field.properties?.min !== undefined && num < field.properties.min) {
          toast.error(`${field.label} doit être supérieur ou égal à ${field.properties.min}`);
          return false;
        }
        if (field.properties?.max !== undefined && num > field.properties.max) {
          toast.error(`${field.label} doit être inférieur ou égal à ${field.properties.max}`);
          return false;
        }
      }

      if (field.type === 'url' && newProject.champs_personnalisés[field.id]) {
        try {
          new URL(newProject.champs_personnalisés[field.id]);
        } catch {
          toast.error(`${field.label} doit être une URL valide`);
          return false;
        }
      }
    }

    return true;
  };

  const handleCreateProject = async () => {
    if (!newProject.nom.trim()) {
      toast.error('Le nom du projet est requis');
      return;
    }

    if (!newProject.template_id) {
      toast.error('Veuillez sélectionner un template');
      return;
    }

    if (!validateCustomFields()) {
      return;
    }

    const token = localStorage.getItem('pm_token');
    if (!token) {
      router.push('/login');
      return;
    }

    setCreatingProject(true);
    try {
      await safeFetch('/api/projects', token, {
        method: 'POST',
        body: JSON.stringify(newProject)
      });

      setCreateDialogOpen(false);
      setNewProject({ nom: '', description: '', template_id: '', date_début: '', date_fin_prévue: '', champs_personnalisés: {} });
      toast.success('Projet créé avec succès');
      await loadData();
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') {
        router.push('/login');
      } else if (error.message === 'TIMEOUT') {
        toast.error('La requête a dépassé le délai d\'attente');
      } else if (error.data?.message) {
        // Afficher le message d'erreur de validation du serveur
        toast.error(error.data.message);
      } else if (error.message?.includes('400')) {
        console.error('Erreur création projet:', error, 'Données envoyées:', newProject);
        toast.error('Données invalides. Vérifiez que le nom et le template sont bien renseignés.');
      } else {
        console.error('Erreur création projet:', error);
        toast.error('Erreur lors de la création du projet');
      }
    } finally {
      setCreatingProject(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const renderCustomField = (field) => {
    const value = newProject.champs_personnalisés[field.id] || '';
    const commonProps = {
      id: `field-${field.id}`,
      placeholder: field.placeholder || ''
    };

    switch (field.type) {
      case 'texte':
        if (field.properties?.variant === 'long' || field.properties?.variant === 'riche') {
          return (
            <Textarea
              {...commonProps}
              value={value}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              rows={3}
              maxLength={field.properties?.longueur_max}
            />
          );
        }
        return (
          <Input
            {...commonProps}
            type="text"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            maxLength={field.properties?.longueur_max}
          />
        );

      case 'nombre':
        return (
          <div className="flex items-center gap-2">
            <Input
              {...commonProps}
              type="number"
              value={value}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              min={field.properties?.min}
              max={field.properties?.max}
              step={field.properties?.step || 1}
              className="flex-1"
            />
            {field.properties?.unité && (
              <span className="text-sm text-gray-500">{field.properties.unité}</span>
            )}
          </div>
        );

      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
          />
        );

      case 'sélecteur':
        if (field.properties?.multiple) {
          return (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {(field.properties?.options || []).map((option) => {
                  const selected = Array.isArray(value) && value.includes(option);
                  return (
                    <Badge
                      key={option}
                      variant={selected ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const currentValues = Array.isArray(value) ? value : [];
                        const newValues = selected
                          ? currentValues.filter(v => v !== option)
                          : [...currentValues, option];
                        handleCustomFieldChange(field.id, newValues);
                      }}
                    >
                      {option}
                    </Badge>
                  );
                })}
              </div>
            </div>
          );
        }
        return (
          <Select value={value} onValueChange={(val) => handleCustomFieldChange(field.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Sélectionnez...'} />
            </SelectTrigger>
            <SelectContent>
              {(field.properties?.options || []).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'utilisateur':
        if (field.properties?.multiple_users) {
          return (
            <div className="space-y-2">
              <Select onValueChange={(val) => {
                const currentValues = Array.isArray(value) ? value : [];
                if (!currentValues.includes(val)) {
                  handleCustomFieldChange(field.id, [...currentValues, val]);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Ajouter un utilisateur..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers
                    .filter(u => !Array.isArray(value) || !value.includes(u._id))
                    .map((user) => (
                      <SelectItem key={user._id} value={user._id}>{user.nom_complet}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {Array.isArray(value) && value.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {value.map(userId => {
                    const user = allUsers.find(u => u._id === userId);
                    return (
                      <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                        {user?.nom_complet || userId}
                        <button
                          type="button"
                          onClick={() => handleCustomFieldChange(field.id, value.filter(v => v !== userId))}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
        return (
          <Select value={value} onValueChange={(val) => handleCustomFieldChange(field.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Sélectionnez un utilisateur...'} />
            </SelectTrigger>
            <SelectContent>
              {allUsers.map((user) => (
                <SelectItem key={user._id} value={user._id}>{user.nom_complet}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'budget':
        return (
          <div className="flex items-center gap-2">
            <Input
              {...commonProps}
              type="number"
              value={value}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              min={0}
              step={0.01}
              className="flex-1"
            />
            <span className="text-sm text-gray-500 font-medium">{field.properties?.devise || 'EUR'}</span>
          </div>
        );

      case 'url':
        return (
          <Input
            {...commonProps}
            type="url"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
          />
        );

      case 'fichier':
        return (
          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded border border-dashed">
            L'upload de fichier sera disponible après la création du projet
          </div>
        );

      default:
        return (
          <Input
            {...commonProps}
            type="text"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
          />
        );
    }
  };

  const getFieldIcon = (type) => {
    const icons = {
      texte: Type,
      nombre: Hash,
      date: Calendar,
      sélecteur: List,
      utilisateur: User,
      fichier: FileText,
      budget: DollarSign,
      url: Link2
    };
    return icons[type] || Type;
  };

  const filteredProjects = projects.filter(p =>
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil((searchTerm ? filteredProjects.length : totalProjects) / itemsPerPage);
  const displayedProjects = searchTerm ? filteredProjects : projects;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Projets</h1>
          <p className="text-xs text-gray-500">{totalProjects} projet(s) au total</p>
        </div>
        {user && rbacPermissions.canCreateProject && (
          <Dialog open={createDialogOpen} onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setNewProject({ nom: '', description: '', template_id: '', date_début: '', date_fin_prévue: '', champs_personnalisés: {} });
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-1" />
                Nouveau projet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un nouveau projet</DialogTitle>
                <DialogDescription>Remplissez les informations pour créer votre projet</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Standard fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template *</Label>
                    <Select value={newProject.template_id} onValueChange={handleTemplateChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(t => (
                          <SelectItem key={t._id} value={t._id}>
                            <div className="flex items-center gap-2">
                              <span>{t.nom}</span>
                              {t.champs?.length > 0 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {t.champs.length} champ(s)
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplate?.description && (
                      <p className="text-xs text-gray-500">{selectedTemplate.description}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Nom du projet *</Label>
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

                {/* Custom fields from template */}
                {selectedTemplate?.champs && selectedTemplate.champs.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    {Object.entries(groupedFields).map(([groupName, fields]) => (
                      <div key={groupName} className="space-y-4 mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                          {groupName}
                        </h3>
                        <div className="space-y-4 pl-3">
                          {fields.map((field) => {
                            const FieldIcon = getFieldIcon(field.type);
                            return (
                              <div key={field.id} className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <FieldIcon className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{field.label}</span>
                                  {field.required && <span className="text-red-500">*</span>}
                                </Label>
                                {renderCustomField(field)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creatingProject}>Annuler</Button>
                <Button
                  onClick={handleCreateProject}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={creatingProject || !newProject.nom.trim() || !newProject.template_id || templates.length === 0}
                >
                  {creatingProject ? 'Création...' : 'Créer le projet'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Rechercher..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex gap-0.5 border rounded-lg p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-7 w-7 p-0"
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-7 w-7 p-0"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Projects Grid/List */}
      {displayedProjects.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">Aucun projet</h3>
            <p className="text-sm text-gray-600 mb-3">Commencez par créer votre premier projet</p>
            {user && rbacPermissions.canCreateProject && (
              <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-1" />
                Créer un projet
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {displayedProjects.map((project) => (
              <Card
                key={project._id}
                className="hover:shadow-md transition-shadow cursor-pointer border"
                onClick={() => router.push(`/dashboard/projects/${project._id}`)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{project.nom}</CardTitle>
                      <CardDescription className="text-xs line-clamp-1 mt-0.5">{project.description}</CardDescription>
                    </div>
                    <Badge variant={project.statut === 'En cours' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                      {project.statut}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{project.date_début ? new Date(project.date_début).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{project.membres?.length || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${project.stats?.progression || 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{project.stats?.progression || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <Card className="border shadow-sm overflow-hidden">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={searchTerm ? filteredProjects.length : totalProjects}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              itemsPerPageOptions={[6, 12, 24, 48]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
