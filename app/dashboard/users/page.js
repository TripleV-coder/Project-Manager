'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Mail, Shield, UserCheck, UserX, Key, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';

export default function UsersPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    nom_complet: '',
    email: '',
    role_id: '',
    status: 'Actif'
  });

  useEffect(() => {
    loadData();
  }, []);

  const { hasPermission: canManageUsers } = user ? useRBACPermissions(user) : { hasPermission: () => false };

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [userRes, usersRes, rolesRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/roles', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const userData = await userRes.json();
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      // Client-side guard: redirect if not admin
      if (!userData.role?.permissions?.adminConfig) {
        router.push('/dashboard');
        return;
      }

      setUser(userData);
      setUsers(usersData.users || []);
      setRoles(rolesData.roles || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (response.ok) {
        setCreateDialogOpen(false);
        setNewUser({ nom_complet: '', email: '', role_id: '', status: 'Actif' });
        await loadData();
        alert(`Utilisateur créé ! Mot de passe temporaire: 00000000`);
      } else {
        alert(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      alert('Erreur de connexion');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserForReset) return;

    setResettingPassword(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/users/${selectedUserForReset._id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setResetPasswordDialogOpen(false);
        setSelectedUserForReset(null);
        await loadData();
        alert(`Mot de passe réinitialisé ! Mot de passe temporaire: 00000000`);
      } else {
        alert(data.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      alert('Erreur de connexion');
    } finally {
      setResettingPassword(false);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.nom_complet || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Utilisateurs</h1>
          <p className="text-gray-600">Gérez les utilisateurs et leurs accès</p>
        </div>
        {canManageUsers('adminConfig') && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouvel utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un utilisateur</DialogTitle>
                <DialogDescription>
                  Le mot de passe temporaire sera 00000000. L'utilisateur devra le changer à la première connexion.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <Input
                    value={newUser.nom_complet}
                    onChange={(e) => setNewUser({ ...newUser, nom_complet: e.target.value })}
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="jean.dupont@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={newUser.role_id} onValueChange={(val) => setNewUser({ ...newUser, role_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.nom} - {r.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={newUser.status} onValueChange={(val) => setNewUser({ ...newUser, status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="Désactivé">Désactivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleCreateUser} className="bg-indigo-600 hover:bg-indigo-700">
                  Créer l'utilisateur
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>{filteredUsers.length} utilisateur(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, idx) => (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-indigo-100 text-indigo-600">
                            {(user.nom_complet || '?').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.nom_complet}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Shield className="w-3 h-3" />
                        {user.role?.nom || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Actif' ? 'default' : 'secondary'}>
                        {user.status === 'Actif' ? (
                          <><UserCheck className="w-3 h-3 mr-1" /> Actif</>
                        ) : (
                          <><UserX className="w-3 h-3 mr-1" /> Désactivé</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {user.dernière_connexion
                        ? new Date(user.dernière_connexion).toLocaleString('fr-FR')
                        : 'Jamais connecté'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">⋮</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Dialog open={resetPasswordDialogOpen && selectedUserForReset?._id === user._id}
                                  onOpenChange={(open) => {
                                    setResetPasswordDialogOpen(open);
                                    if (!open) setSelectedUserForReset(null);
                                  }}>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setSelectedUserForReset(user);
                                  setResetPasswordDialogOpen(true);
                                }}
                              >
                                <Key className="w-4 h-4 mr-2" />
                                Réinitialiser le mot de passe
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                                <DialogDescription>
                                  Êtes-vous sûr de vouloir réinitialiser le mot de passe de {selectedUserForReset?.nom_complet} ?
                                  Le mot de passe temporaire sera 00000000 et l'utilisateur devra le changer à sa prochaine connexion.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-amber-900">Mot de passe temporaire</p>
                                  <p className="text-sm text-amber-700">Mot de passe: <code className="bg-white px-2 py-1 rounded font-mono">00000000</code></p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>Annuler</Button>
                                <Button
                                  onClick={handleResetPassword}
                                  disabled={resettingPassword}
                                  className="bg-amber-600 hover:bg-amber-700"
                                >
                                  {resettingPassword ? 'Réinitialisation...' : 'Réinitialiser'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
