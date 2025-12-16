'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Briefcase, Calendar, Shield, Save, Building, Clock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({
    projets_actifs: 0,
    taches_completees: 0,
    taches_en_cours: 0,
    heures_travaillees: 0
  });
  const [formData, setFormData] = useState({
    nom_complet: '',
    telephone: '',
    poste_titre: '',
    département_équipe: '',
    disponibilité_hebdo: 35,
    fuseau_horaire: 'Africa/Porto-Novo'
  });

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Charger le profil utilisateur
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Erreur chargement profil');
      }

      const data = await response.json();

      setUser(data);
      setFormData({
        nom_complet: data.nom_complet || '',
        telephone: data.telephone || '',
        poste_titre: data.poste_titre || '',
        département_équipe: data.département_équipe || '',
        disponibilité_hebdo: data.disponibilité_hebdo || 35,
        fuseau_horaire: data.fuseau_horaire || 'Africa/Porto-Novo'
      });

      // Charger les statistiques
      await loadStats(token, data._id || data.id);

      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const loadStats = async (token, userId) => {
    try {
      // Charger les projets où l'utilisateur est membre
      const projectsRes = await fetch('/api/projects?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let projetsActifs = 0;
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        const projects = projectsData.data || projectsData.projects || [];
        projetsActifs = projects.filter(p => p.statut === 'En cours').length;
      }

      // Charger les tâches assignées à l'utilisateur
      const tasksRes = await fetch(`/api/tasks?assigné_à=${userId}&limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let tachesCompletees = 0;
      let tachesEnCours = 0;
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        const tasks = tasksData.data || tasksData.tasks || [];
        tachesCompletees = tasks.filter(t => t.statut === 'Terminé').length;
        tachesEnCours = tasks.filter(t => t.statut === 'En cours').length;
      }

      // Charger les heures travaillées (timesheets)
      const timesheetRes = await fetch(`/api/timesheets?utilisateur=${userId}&limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let heuresTravaillees = 0;
      if (timesheetRes.ok) {
        const timesheetData = await timesheetRes.json();
        const timesheets = timesheetData.data || timesheetData.timesheets || [];
        heuresTravaillees = timesheets.reduce((sum, t) => sum + (t.heures || 0), 0);
      }

      setStats({
        projets_actifs: projetsActifs,
        taches_completees: tachesCompletees,
        taches_en_cours: tachesEnCours,
        heures_travaillees: Math.round(heuresTravaillees * 10) / 10
      });
    } catch (error) {
      console.warn('Erreur chargement statistiques:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.nom_complet.trim()) {
      toast.error('Le nom complet est requis');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Profil mis à jour avec succès');
        setEditing(false);
        // Mettre à jour l'état local
        setUser(prev => ({ ...prev, ...formData }));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Restaurer les valeurs originales
    setFormData({
      nom_complet: user?.nom_complet || '',
      telephone: user?.telephone || '',
      poste_titre: user?.poste_titre || '',
      département_équipe: user?.département_équipe || '',
      disponibilité_hebdo: user?.disponibilité_hebdo || 35,
      fuseau_horaire: user?.fuseau_horaire || 'Africa/Porto-Novo'
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Profil</h1>
        <p className="text-gray-600">Gérez vos informations personnelles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte profil */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-indigo-600">
                {user?.nom_complet?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <CardTitle>{user?.nom_complet}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Rôle:</span>
              <Badge className="bg-indigo-100 text-indigo-800">
                {user?.role_id?.nom || user?.role?.nom || 'Non défini'}
              </Badge>
            </div>
            {user?.poste_titre && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{user.poste_titre}</span>
              </div>
            )}
            {user?.département_équipe && (
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{user.département_équipe}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Membre depuis {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric'
                }) : 'N/A'}
              </span>
            </div>
            {user?.dernière_connexion && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Dernière connexion: {new Date(user.dernière_connexion).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informations détaillées */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>Vos coordonnées et informations de contact</CardDescription>
              </div>
              {!editing && (
                <Button onClick={() => setEditing(true)} variant="outline">
                  Modifier
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom complet *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      value={formData.nom_complet}
                      onChange={(e) => setFormData({ ...formData, nom_complet: e.target.value })}
                      className="pl-10"
                      placeholder="Votre nom"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      value={user?.email}
                      disabled
                      className="pl-10 bg-gray-50"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    L'email ne peut pas être modifié. Contactez un administrateur.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        value={formData.telephone}
                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                        className="pl-10"
                        placeholder="+225 07 12 34 56 78"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Poste / Fonction</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        value={formData.poste_titre}
                        onChange={(e) => setFormData({ ...formData, poste_titre: e.target.value })}
                        className="pl-10"
                        placeholder="Chef de projet"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Département / Équipe</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        value={formData.département_équipe}
                        onChange={(e) => setFormData({ ...formData, département_équipe: e.target.value })}
                        className="pl-10"
                        placeholder="Développement"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Disponibilité hebdomadaire (heures)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        min="0"
                        max="60"
                        value={formData.disponibilité_hebdo}
                        onChange={(e) => setFormData({ ...formData, disponibilité_hebdo: parseInt(e.target.value) || 0 })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fuseau horaire</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400 z-10" />
                    <Select
                      value={formData.fuseau_horaire}
                      onValueChange={(val) => setFormData({ ...formData, fuseau_horaire: val })}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Porto-Novo">Cotonou / Porto-Novo (GMT+1)</SelectItem>
                        <SelectItem value="Africa/Abidjan">Abidjan (GMT+0)</SelectItem>
                        <SelectItem value="Africa/Lagos">Lagos (GMT+1)</SelectItem>
                        <SelectItem value="Africa/Douala">Douala (GMT+1)</SelectItem>
                        <SelectItem value="Africa/Dakar">Dakar (GMT+0)</SelectItem>
                        <SelectItem value="Europe/Paris">Paris (GMT+1/+2)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT+0/+1)</SelectItem>
                        <SelectItem value="America/New_York">New York (GMT-5/-4)</SelectItem>
                        <SelectItem value="America/Montreal">Montréal (GMT-5/-4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="flex-1" disabled={saving}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Nom complet</p>
                    <p className="font-medium">{user?.nom_complet}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Téléphone</p>
                      <p className="font-medium">{user?.telephone || 'Non renseigné'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Poste / Fonction</p>
                      <p className="font-medium">{user?.poste_titre || 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Département / Équipe</p>
                      <p className="font-medium">{user?.département_équipe || 'Non renseigné'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Disponibilité hebdo</p>
                      <p className="font-medium">{user?.disponibilité_hebdo || 35}h / semaine</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Fuseau horaire</p>
                    <p className="font-medium">{user?.fuseau_horaire || 'Africa/Porto-Novo'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistiques */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Activité</CardTitle>
          <CardDescription>Vos statistiques d'activité sur la plateforme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-3xl font-bold text-indigo-600">{stats.projets_actifs}</p>
              <p className="text-sm text-gray-600 mt-1">Projets actifs</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{stats.taches_en_cours}</p>
              <p className="text-sm text-gray-600 mt-1">Tâches en cours</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{stats.taches_completees}</p>
              <p className="text-sm text-gray-600 mt-1">Tâches terminées</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-3xl font-bold text-orange-600">{stats.heures_travaillees}h</p>
              <p className="text-sm text-gray-600 mt-1">Heures enregistrées</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
