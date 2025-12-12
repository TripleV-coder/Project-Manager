'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Edit2, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function TemplatesPage() {
  const router = useRouter();
  const { confirm } = useConfirmation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    nom: '',
    description: '',
    catégorie: ''
  });

  const { hasPermission: canManageTemplates } = user ? useRBACPermissions(user) : { hasPermission: () => false };

  const loadTemplates = useCallback(async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [userRes, templatesRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/project-templates', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const userData = await userRes.json();
      const templatesData = await templatesRes.json();

      // Client-side guard: redirect if not admin
      if (!userData.role?.permissions?.adminConfig) {
        router.push('/dashboard');
        return;
      }

      setUser(userData);
      setTemplates(templatesData.templates || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateTemplate = async () => {
    try {
      if (!newTemplate.nom) {
        toast.error('Le nom est requis');
        return;
      }

      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/project-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTemplate)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Template créé avec succès');
        setCreateDialogOpen(false);
        setNewTemplate({ nom: '', description: '', catégorie: '' });
        await loadTemplates();
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    const confirmed = await confirm({
      title: 'Supprimer le template',
      description: `Êtes-vous sûr de vouloir supprimer le template "${templateName}" ?`,
      actionLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/project-templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Template supprimé avec succès');
        await loadTemplates();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate({
      ...template
    });
    setEditDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (!editingTemplate.nom) {
        toast.error('Le nom est requis');
        return;
      }

      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/project-templates/${editingTemplate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nom: editingTemplate.nom,
          description: editingTemplate.description,
          catégorie: editingTemplate.catégorie
        })
      });

      if (response.ok) {
        toast.success('Template modifié avec succès');
        setEditDialogOpen(false);
        setEditingTemplate(null);
        await loadTemplates();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleCopyTemplate = async (template) => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/project-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nom: `${template.nom} (Copie)`,
          description: template.description,
          catégorie: template.catégorie,
          champs: template.champs
        })
      });

      if (response.ok) {
        toast.success('Template copié avec succès');
        await loadTemplates();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la copie');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Templates de Projets</h1>
          <p className="text-gray-600">Créez des modèles réutilisables pour vos projets</p>
        </div>
        {canManageTemplates('adminConfig') && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un template
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun template</h3>
            <p className="text-gray-600 mb-4">Créez votre premier template de projet</p>
            {canManageTemplates('adminConfig') && (
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Créer un template
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template, idx) => (
            <motion.div
              key={template._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        <CardTitle className="text-lg">{template.nom}</CardTitle>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    {template.catégorie && (
                      <Badge variant="secondary">{template.catégorie}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-gray-600">Champs personnalisés</span>
                    <span className="font-medium">{template.champs?.length || 0}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Éditer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyTemplate(template)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteTemplate(template._id, template.nom)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un template de projet</DialogTitle>
            <DialogDescription>
              Définissez un modèle réutilisable avec des champs personnalisés
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du template *</Label>
              <Input
                value={newTemplate.nom}
                onChange={(e) => setNewTemplate({ ...newTemplate, nom: e.target.value })}
                placeholder="Projet Développement Logiciel"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Template pour les projets de développement..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Input
                value={newTemplate.catégorie}
                onChange={(e) => setNewTemplate({ ...newTemplate, catégorie: e.target.value })}
                placeholder="IT, Marketing, Construction..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateTemplate} className="bg-indigo-600 hover:bg-indigo-700">
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le template</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du template
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom du template *</Label>
                <Input
                  value={editingTemplate.nom}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, nom: e.target.value })}
                  placeholder="Projet Développement Logiciel"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="Template pour les projets de développement..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Input
                  value={editingTemplate.catégorie}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, catégorie: e.target.value })}
                  placeholder="IT, Marketing, Construction..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditingTemplate(null); }}>
              Annuler
            </Button>
            <Button onClick={handleSaveTemplate} className="bg-indigo-600 hover:bg-indigo-700">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
