'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Files, Upload, Download, Trash2, Search, FolderPlus,
  File, FileText, FileImage, FileVideo, FileAudio,
  MoreVertical, Eye, Grid, List, X,
  Folder, ChevronRight, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';

export default function FilesPage() {
  const { confirm } = useConfirmation();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('/');
  const [folders, setFolders] = useState([]);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  // RBAC: Vérifier les permissions fichiers
  const canManageFiles = userPermissions.gererFichiers || userPermissions.adminConfig;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  // Auto-select first project on initial load
  useEffect(() => {
    if (projects.length > 0 && selectedProject === 'all') {
      setSelectedProject(projects[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Load user permissions first to ensure RBAC is applied before rendering
      const userRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(10000)
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserPermissions(userData?.role?.permissions || {});
        // Vérification sécurisée de l'ID utilisateur (peut être id ou _id selon le format API)
        setCurrentUserId(userData?.id || userData?._id || null);
      } else if (userRes.status === 401) {
        router.push('/login');
        return;
      }

      const [projectsRes, filesRes] = await Promise.all([
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }),
        fetch(`/api/files${selectedProject !== 'all' ? `?projet_id=${selectedProject}` : ''}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(10000)
        })
      ]);

      const projectsData = await projectsRes.json();
      const filesData = await filesRes.json();

      // API returns { success: true, data: [...] } or legacy format
      setProjects(projectsData.data || projectsData.projects || []);
      setFiles(filesData.files || filesData.data || []);
      setFolders(filesData.folders || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setSelectedFiles(selected);
    if (selected.length > 0) {
      setUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Veuillez sélectionner des fichiers');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('pm_token');
      const totalFiles = selectedFiles.length;
      let uploaded = 0;

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projet_id', selectedProject !== 'all' ? selectedProject : '');
        formData.append('folder', currentFolder);

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erreur upload');
        }

        uploaded++;
        setUploadProgress((uploaded / totalFiles) * 100);
      }

      toast.success(`${totalFiles} fichier(s) téléversé(s) avec succès`);
      setUploadDialogOpen(false);
      setSelectedFiles([]);
      await loadData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors du téléversement');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (file) => {
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/files/${file._id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erreur téléchargement');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.nom;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Fichier téléchargé');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDelete = async (fileId) => {
    const confirmed = await confirm({
      title: 'Supprimer le fichier',
      description: 'Êtes-vous sûr de vouloir supprimer ce fichier ?',
      actionLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Fichier supprimé');
        await loadData();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Nom du dossier requis');
      return;
    }

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/files/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nom: newFolderName,
          parent: currentFolder,
          projet_id: selectedProject !== 'all' ? selectedProject : null
        })
      });

      if (response.ok) {
        toast.success('Dossier créé');
        setNewFolderDialogOpen(false);
        setNewFolderName('');
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return FileImage;
    if (type?.startsWith('video/')) return FileVideo;
    if (type?.startsWith('audio/')) return FileAudio;
    if (type?.includes('pdf') || type?.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(f => 
    f.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalSize = files.reduce((sum, f) => sum + (f.taille || 0), 0);
  const filesByType = files.reduce((acc, f) => {
    const type = f.type?.split('/')[0] || 'autre';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Gestion des Fichiers</h1>
          <p className="text-gray-600 text-sm lg:text-base">Gérez tous les documents de vos projets</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageFiles && (
            <>
              <Button variant="outline" onClick={() => setNewFolderDialogOpen(true)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Nouveau dossier</span>
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Téléverser
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total fichiers</p>
                <p className="text-2xl font-bold text-gray-900">{files.length}</p>
              </div>
              <Files className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Espace utilisé</p>
                <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
              </div>
              <Folder className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Images</p>
                <p className="text-2xl font-bold text-gray-900">{filesByType.image || 0}</p>
              </div>
              <FileImage className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-2xl font-bold text-gray-900">{filesByType.application || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un fichier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full lg:w-64">
                <SelectValue placeholder="Tous les projets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
        <button 
          onClick={() => setCurrentFolder('/')}
          className="flex items-center gap-1 hover:text-indigo-600"
        >
          <Home className="w-4 h-4" />
          Racine
        </button>
        {currentFolder !== '/' && currentFolder.split('/').filter(Boolean).map((part, idx, arr) => (
          <div key={idx} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            <button 
              onClick={() => setCurrentFolder('/' + arr.slice(0, idx + 1).join('/'))}
              className="hover:text-indigo-600"
            >
              {part}
            </button>
          </div>
        ))}
      </div>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Files className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun fichier</h3>
            <p className="text-gray-600 mb-4">Commencez par téléverser vos premiers fichiers</p>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Téléverser des fichiers
            </Button>
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Folders */}
          {folders.map((folder) => (
            <button
              key={folder._id}
              type="button"
              className="cursor-pointer hover:shadow-lg transition-shadow group rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => setCurrentFolder(folder.chemin)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setCurrentFolder(folder.chemin);
                }
              }}
            >
              <div className="p-4">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-yellow-200 transition-colors">
                    <Folder className="w-8 h-8 text-yellow-600" />
                  </div>
                  <p className="font-medium text-sm text-center truncate w-full">{folder.nom}</p>
                  <p className="text-xs text-gray-500">{folder.fichiers_count || 0} fichiers</p>
                </div>
              </div>
            </button>
          ))}
          {/* Files */}
          {filteredFiles.map((file) => {
            const IconComponent = getFileIcon(file.type);
            return (
              <Card key={file._id} className="hover:shadow-lg transition-shadow group">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center">
                    <div className="relative w-full">
                      {file.type?.startsWith('image/') && file.url ? (
                        <img 
                          src={file.url} 
                          alt={file.nom}
                          className="w-full h-24 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mb-3 mx-auto group-hover:bg-indigo-50 transition-colors">
                          <IconComponent className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                      {/* Actions overlay */}
                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Aperçu
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </DropdownMenuItem>
                            {(canManageFiles || file.uploadé_par === currentUserId) && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(file._id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <p className="font-medium text-sm text-center truncate w-full" title={file.nom}>
                      {file.nom}
                    </p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.taille)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Taille</TableHead>
                <TableHead className="hidden lg:table-cell">Projet</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file) => {
                const IconComponent = getFileIcon(file.type);
                const project = projects.find(p => p._id === file.projet_id);
                return (
                  <TableRow key={file._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-5 h-5 text-gray-600" />
                        </div>
                        <span className="font-medium truncate max-w-[200px]">{file.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{file.type?.split('/')[1] || 'inconnu'}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatFileSize(file.taille)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{project?.nom || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {file.created_at ? new Date(file.created_at).toLocaleDateString('fr-FR') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        {(canManageFiles || file.uploadé_par === currentUserId) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(file._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Téléverser des fichiers</DialogTitle>
            <DialogDescription>
              {selectedFiles.length} fichier(s) sélectionné(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-gray-600">
                  Téléversement en cours... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setUploadDialogOpen(false);
              setSelectedFiles([]);
            }} disabled={uploading}>
              Annuler
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700" 
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? 'Téléversement...' : 'Téléverser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du dossier</Label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Documents techniques"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700" 
              onClick={handleCreateFolder}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewFile.nom}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {previewFile.type?.startsWith('image/') ? (
                <img 
                  src={previewFile.url} 
                  alt={previewFile.nom}
                  className="max-w-full max-h-[60vh] mx-auto rounded-lg"
                />
              ) : (
                <div className="text-center py-12">
                  <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aperçu non disponible pour ce type de fichier</p>
                  <Button className="mt-4" onClick={() => handleDownload(previewFile)}>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger pour visualiser
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
