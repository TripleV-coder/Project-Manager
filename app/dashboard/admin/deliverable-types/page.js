'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, Edit2, Trash2, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function DeliverableTypesPage() {
  const router = useRouter();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newType, setNewType] = useState({
    nom: '',
    description: '',
    couleur: '#6366f1'
  });

  const loadTypes = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Pour l'instant, utilisons des données statiques
      setTypes([
        {
          _id: '1',
          nom: 'Spécification Technique',
          description: 'Document décrivant les spécifications techniques du projet',
          couleur: '#3b82f6',
          workflow_étapes: ['Rédaction', 'Revue', 'Validation', 'Approbation']
        },
        {
          _id: '2',
          nom: 'Maquette Design',
          description: 'Maquettes visuelles et prototypes',
          couleur: '#8b5cf6',
          workflow_étapes: ['Création', 'Revue Client', 'Ajustements', 'Validation']
        }
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const handleCreateType = () => {
    if (!newType.nom) {
      toast.error('Le nom est requis');
      return;
    }

    toast.success('Type de livrable créé avec succès');
    setCreateDialogOpen(false);
    setNewType({ nom: '', description: '', couleur: '#6366f1' });
    loadTypes();
  };

  const handleDeleteType = (typeId, typeName) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le type "${typeName}" ?`)) {
      return;
    }
    toast.success('Type supprimé avec succès');
    loadTypes();
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Types de Livrables</h1>
          <p className="text-gray-600">Configurez les types de livrables et leurs workflows</p>
        </div>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Créer un type
        </Button>
      </div>

      {types.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun type de livrable</h3>
            <p className="text-gray-600 mb-4">Créez des types de livrables pour organiser vos productions</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Créer un type
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {types.map((type, idx) => (
            <motion.div
              key={type._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow" style={{ borderLeft: `4px solid ${type.couleur}` }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-5 h-5" style={{ color: type.couleur }} />
                        <CardTitle className="text-lg">{type.nom}</CardTitle>
                      </div>
                      <CardDescription>{type.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Workflow</p>
                      <div className="flex flex-wrap gap-1">
                        {type.workflow_étapes?.map((etape, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{etape}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Workflow className="w-3 h-3 mr-1" />
                        Configurer
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteType(type._id, type.nom)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
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
            <DialogTitle>Créer un type de livrable</DialogTitle>
            <DialogDescription>
              Définissez un nouveau type avec son workflow de validation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du type *</Label>
              <Input
                value={newType.nom}
                onChange={(e) => setNewType({ ...newType, nom: e.target.value })}
                placeholder="Cahier des charges"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newType.description}
                onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                placeholder="Description du type de livrable..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <Input
                type="color"
                value={newType.couleur}
                onChange={(e) => setNewType({ ...newType, couleur: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateType} className="bg-indigo-600 hover:bg-indigo-700">
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
