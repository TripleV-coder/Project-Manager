'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers, Plus, Edit2, Trash2, Settings, GripVertical,
  Check, X, ChevronRight, Palette, FileText, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';

export default function DeliverableTypesPage() {
  const { confirm } = useConfirmation();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    couleur: '#6366f1',
    workflow_étapes: ['Création', 'Revue', 'Validation', 'Approbation']
  });
  const [newEtape, setNewEtape] = useState('');

  const { hasPermission: canManageDeliverableTypes } = user ? useRBACPermissions(user) : { hasPermission: () => false };

  const loadTypes = useCallback(async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [userRes, typesRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/deliverable-types', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const userData = await userRes.json();
      const typesData = await typesRes.json();

      // Client-side guard: redirect if not admin
      if (!userData.role?.permissions?.adminConfig) {
        router.push('/dashboard');
        return;
      }

      setUser(userData);
      if (typesData) {
        setTypes(typesData.types || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const handleCreate = async () => {
    if (!formData.nom.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/deliverable-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Type de livrable créé');
        setCreateDialogOpen(false);
        resetForm();
        loadTypes();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleUpdate = async () => {
    if (!editingType) return;

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/deliverable-types/${editingType._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Type de livrable modifié');
        setEditingType(null);
        setCreateDialogOpen(false);
        resetForm();
        loadTypes();
      } else {
        toast.error('Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleDelete = async (typeId) => {
    const confirmed = await confirm({
      title: 'Supprimer le type de livrable',
      description: 'Êtes-vous sûr de vouloir supprimer ce type de livrable ?',
      actionLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/deliverable-types/${typeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Type de livrable supprimé');
        loadTypes();
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      description: '',
      couleur: '#6366f1',
      workflow_étapes: ['Création', 'Revue', 'Validation', 'Approbation']
    });
    setNewEtape('');
  };

  const openEditDialog = (type) => {
    setEditingType(type);
    setFormData({
      nom: type.nom,
      description: type.description || '',
      couleur: type.couleur || '#6366f1',
      workflow_étapes: type.workflow_étapes || ['Création', 'Validation']
    });
    setCreateDialogOpen(true);
  };

  const addEtape = () => {
    if (!newEtape.trim()) return;
    setFormData(prev => ({
      ...prev,
      workflow_étapes: [...prev.workflow_étapes, newEtape.trim()]
    }));
    setNewEtape('');
  };

  const removeEtape = (index) => {
    setFormData(prev => ({
      ...prev,
      workflow_étapes: prev.workflow_étapes.filter((_, i) => i !== index)
    }));
  };

  const moveEtape = (index, direction) => {
    const newEtapes = [...formData.workflow_étapes];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newEtapes.length) return;
    [newEtapes[index], newEtapes[newIndex]] = [newEtapes[newIndex], newEtapes[index]];
    setFormData(prev => ({ ...prev, workflow_étapes: newEtapes }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Types de Livrables</h1>
          <p className="text-gray-600">Définissez les types et leurs workflows de validation</p>
        </div>
        {canManageDeliverableTypes('adminConfig') && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => { resetForm(); setCreateDialogOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau type
          </Button>
        )}
      </div>

      {/* Types List */}
      {types.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun type de livrable</h3>
            <p className="text-gray-600 mb-4">Créez votre premier type de livrable avec son workflow</p>
            {canManageDeliverableTypes('adminConfig') && (
              <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Créer un type
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {types.map((type) => (
            <Card key={type._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: type.couleur + '20' }}
                    >
                      <FileText className="w-5 h-5" style={{ color: type.couleur }} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{type.nom}</CardTitle>
                      {type.description && (
                        <CardDescription className="line-clamp-1">{type.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(type)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(type._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-gray-700 mb-2">Workflow de validation :</p>
                <div className="flex flex-wrap items-center gap-2">
                  {(type.workflow_étapes || []).map((etape, idx) => (
                    <div key={idx} className="flex items-center">
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: type.couleur, color: type.couleur }}
                      >
                        {idx + 1}. {etape}
                      </Badge>
                      {idx < (type.workflow_étapes?.length || 0) - 1 && (
                        <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingType(null);
          resetForm();
        }
        setCreateDialogOpen(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              {editingType ? 'Modifier le type' : 'Nouveau type de livrable'}
            </DialogTitle>
            <DialogDescription>
              Définissez le type et son workflow de validation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <Label>Nom du type *</Label>
                <Input
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Spécification technique"
                />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.couleur}
                    onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du type de livrable..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Workflow de validation</Label>
              <div className="space-y-2">
                {formData.workflow_étapes.map((etape, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <Badge variant="outline" className="mr-2">{idx + 1}</Badge>
                    <span className="flex-1 text-sm">{etape}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => moveEtape(idx, -1)}
                      disabled={idx === 0}
                    >
                      <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => moveEtape(idx, 1)}
                      disabled={idx === formData.workflow_étapes.length - 1}
                    >
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => removeEtape(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newEtape}
                  onChange={(e) => setNewEtape(e.target.value)}
                  placeholder="Nouvelle étape..."
                  onKeyDown={(e) => e.key === 'Enter' && addEtape()}
                />
                <Button variant="outline" onClick={addEtape}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700" 
              onClick={editingType ? handleUpdate : handleCreate}
            >
              {editingType ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
