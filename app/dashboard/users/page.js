'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Search, Mail, Shield, UserCheck, UserX, Key, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import TablePagination from '@/components/ui/table-pagination';
import { useFormatters, useTranslation } from '@/contexts/AppSettingsContext';

export default function UsersPage() {
  const router = useRouter();
  const { formatDate } = useFormatters();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [newUser, setNewUser] = useState({
    nom_complet: '',
    email: '',
    role_id: '',
    status: 'Actif'
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  const permissions = useRBACPermissions(user);
  const canManageUsers = permissions.hasPermission;

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

      const [userRes, usersRes, rolesRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }),
        fetch(`/api/users?limit=${itemsPerPage}&page=${currentPage}`, { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }),
        fetch('/api/roles', { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) })
      ]);

      // Vérification des réponses
      if (!userRes.ok) {
        if (userRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Erreur chargement utilisateur');
      }

      const userData = await userRes.json();
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      const userPerms = userData.role_id?.permissions || userData.role?.permissions || {};
      if (!userPerms.adminConfig && !userPerms.gererUtilisateurs) {
        router.push('/dashboard');
        return;
      }

      setUser(userData);

      // Vérification sécurisée du format de réponse API pour les utilisateurs
      if (usersRes.ok) {
        const usersList = extractApiData(usersData, ['data', 'users']);
        if (!Array.isArray(usersList)) {
          console.error('Format de réponse invalide pour les utilisateurs:', usersData);
          toast.error('Erreur de format de données');
          setUsers([]);
          setTotalUsers(0);
        } else {
          setUsers(usersList);
          setTotalUsers(usersData.pagination?.total || usersData.total || usersList.length || 0);
        }
      } else {
        toast.error('Erreur lors du chargement des utilisateurs');
        setUsers([]);
      }

      // Vérification sécurisée du format de réponse API pour les rôles
      if (rolesRes.ok) {
        const rolesList = extractApiData(rolesData, ['roles', 'data']);
        if (!Array.isArray(rolesList)) {
          console.error('Format de réponse invalide pour les rôles:', rolesData);
          setRoles([]);
        } else {
          setRoles(rolesList);
        }
      } else {
        toast.error('Erreur lors du chargement des rôles');
        setRoles([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.nom_complet || !newUser.email || !newUser.role_id) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setCreatingUser(true);
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
        toast.success('Utilisateur créé avec succès ! Mot de passe temporaire: 00000000');
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setCreatingUser(false);
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
        toast.success('Mot de passe réinitialisé ! Mot de passe temporaire: 00000000');
      } else {
        toast.error(data.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      toast.error('Erreur de connexion');
    } finally {
      setResettingPassword(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const filteredUsers = users.filter(u =>
    (u.nom_complet || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil((searchTerm ? filteredUsers.length : totalUsers) / itemsPerPage);
  const displayedUsers = searchTerm ? filteredUsers : users;

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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('userManagement')}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{totalUsers} {t('users').toLowerCase()}</p>
        </div>
        {canManageUsers('adminConfig') && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-1" />
                {t('createUser')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('createUser')}</DialogTitle>
                <DialogDescription>
                  {t('welcomeFirstLogin')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('userName')}</Label>
                  <Input
                    value={newUser.nom_complet}
                    onChange={(e) => setNewUser({ ...newUser, nom_complet: e.target.value })}
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('email')}</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="jean.dupont@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('role')}</Label>
                  <Select value={newUser.role_id} onValueChange={(val) => setNewUser({ ...newUser, role_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select')} />
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
                  <Label>{t('status')}</Label>
                  <Select value={newUser.status} onValueChange={(val) => setNewUser({ ...newUser, status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actif">{t('active')}</SelectItem>
                      <SelectItem value="Désactivé">{t('disabled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creatingUser}>{t('cancel')}</Button>
                <Button onClick={handleCreateUser} disabled={creatingUser} className="bg-indigo-600 hover:bg-indigo-700">
                  {creatingUser ? t('loading') : t('create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder={t('searchPlaceholder')}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Users Table */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead className="text-xs font-medium">{t('user')}</TableHead>
                <TableHead className="text-xs font-medium">{t('email')}</TableHead>
                <TableHead className="text-xs font-medium">{t('role')}</TableHead>
                <TableHead className="text-xs font-medium">{t('status')}</TableHead>
                <TableHead className="text-xs font-medium hidden md:table-cell">{t('updatedAt')}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t('noUsers')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                displayedUsers.map((u) => (
                  <TableRow key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                            {(u.nom_complet || '?').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{u.nom_complet}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <Mail className="w-3.5 h-3.5" />
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Shield className="w-3 h-3" />
                        {u.role_id?.nom || u.role?.nom || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant={u.status === 'Actif' ? 'default' : 'secondary'} className="text-[10px]">
                        {u.status === 'Actif' ? (
                          <><UserCheck className="w-3 h-3 mr-1" /> {t('active')}</>
                        ) : (
                          <><UserX className="w-3 h-3 mr-1" /> {t('disabled')}</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-gray-500 hidden md:table-cell">
                      {u.dernière_connexion
                        ? formatDate(u.dernière_connexion, { includeTime: true })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="py-2">
                      {canManageUsers('adminConfig') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">⋮</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setSelectedUserForReset(u);
                                setResetPasswordDialogOpen(true);
                              }}
                            >
                              <Key className="w-4 h-4 mr-2" />
                              {t('resetPassword')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={searchTerm ? filteredUsers.length : totalUsers}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </Card>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordDialogOpen}
        onOpenChange={(open) => {
          setResetPasswordDialogOpen(open);
          if (!open) setSelectedUserForReset(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('resetPassword')}</DialogTitle>
            <DialogDescription>
              {t('confirmAction')} - {selectedUserForReset?.nom_complet}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">{t('newPassword')}</p>
              <p className="text-sm text-amber-700">{t('password')}: <code className="bg-white px-2 py-0.5 rounded font-mono">00000000</code></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)} disabled={resettingPassword}>{t('cancel')}</Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword} className="bg-amber-600 hover:bg-amber-700">
              {resettingPassword ? t('loading') : t('reset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
