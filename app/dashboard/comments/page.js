'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, Send, Search, Filter, User, Calendar,
  MoreVertical, Edit2, Trash2, Reply, AtSign, Paperclip,
  ChevronDown, Clock, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';

export default function CommentsPage() {
  const router = useRouter();
  const { confirm } = useConfirmation();
  const textareaRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTask, setSelectedTask] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [activeTab, setActiveTab] = useState('comments');

  useEffect(() => {
    loadData();
  }, [selectedProject, selectedTask]);

  // Auto-select first project on initial load
  useEffect(() => {
    if (projects.length > 0 && selectedProject === 'all') {
      setSelectedProject(projects[0]._id);
    }
  }, [projects]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      let commentsUrl = '/api/comments';
      const params = [];
      if (selectedTask !== 'all') {
        params.push(`entity_type=tâche`);
        params.push(`entity_id=${selectedTask}`);
      } else if (selectedProject !== 'all') {
        params.push(`entity_type=projet`);
        params.push(`entity_id=${selectedProject}`);
      }
      if (params.length > 0) commentsUrl += '?' + params.join('&');

      const [projectsRes, tasksRes, commentsRes, usersRes, activityRes] = await Promise.all([
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(commentsUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/activity?limit=50', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();
      const commentsData = await commentsRes.json();
      const usersData = await usersRes.json();
      const activityData = await activityRes.json();

      setProjects(projectsData.projects || []);
      setTasks(tasksData.tasks || []);
      setComments(commentsData.comments || []);
      setUsers(usersData.users || []);
      setActivities(activityData.activities || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      toast.error('Le commentaire ne peut pas être vide');
      return;
    }

    try {
      const token = localStorage.getItem('pm_token');
      
      // Extraire les mentions du texte
      const mentionRegex = /@(\w+)/g;
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(newComment)) !== null) {
        const mentionedUser = users.find(u =>
          (u.nom_complet || '').toLowerCase().includes(match[1].toLowerCase())
        );
        if (mentionedUser) mentions.push(mentionedUser._id);
      }

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entity_type: selectedTask !== 'all' ? 'task' : 'project',
          entity_id: selectedTask !== 'all' ? selectedTask : selectedProject,
          contenu: newComment,
          parent_id: replyingTo?._id || null,
          mentions: mentions
        })
      });

      if (response.ok) {
        toast.success('Commentaire publié');
        setNewComment('');
        setReplyingTo(null);
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la publication');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = await confirm({
      title: 'Supprimer le commentaire',
      description: 'Êtes-vous sûr de vouloir supprimer ce commentaire ?',
      actionLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Commentaire supprimé');
        await loadData();
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const insertMention = (user) => {
    const mention = `@${(user.nom_complet || '').split(' ')[0]} `;
    setNewComment(prev => prev.replace(/@\w*$/, '') + mention);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setNewComment(value);

    // Détecter si on tape une mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true);
      setMentionSearch('');
    } else if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionSearch(textAfterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const filteredComments = comments.filter(c =>
    c.contenu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.auteur?.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.nom_complet.toLowerCase().includes(mentionSearch)
  ).slice(0, 5);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
    if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)} j`;
    return d.toLocaleDateString('fr-FR');
  };

  const getActivityIcon = (action) => {
    switch (action) {
      case 'création': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'modification': return <Edit2 className="w-4 h-4 text-blue-600" />;
      case 'suppression': return <Trash2 className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
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
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Commentaires & Activité</h1>
        <p className="text-gray-600 text-sm lg:text-base">Communication et historique des actions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comments" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Commentaires ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Activité ({activities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comments" className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher dans les commentaires..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); setSelectedTask('all'); }}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder="Tous les projets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les projets</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder="Toutes les tâches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les tâches</SelectItem>
                    {tasks
                      .filter(t => selectedProject === 'all' || t.projet_id === selectedProject)
                      .map(t => (
                        <SelectItem key={t._id} value={t._id}>{t.titre}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Zone nouveau commentaire */}
          <Card>
            <CardContent className="p-4">
              {replyingTo && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Reply className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Réponse à <strong>{replyingTo.auteur?.nom_complet}</strong>
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Écrivez votre commentaire... Utilisez @ pour mentionner quelqu'un"
                  value={newComment}
                  onChange={handleTextareaChange}
                  className="min-h-[100px] pr-12 resize-none"
                />
                {showMentions && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-lg shadow-lg border overflow-hidden z-10">
                    {filteredUsers.map(user => (
                      <button
                        key={user._id}
                        onClick={() => insertMention(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600">
                            {user.nom_complet?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.nom_complet}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowMentions(!showMentions)}>
                    <AtSign className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || (selectedProject === 'all' && selectedTask === 'all')}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publier
                </Button>
              </div>
              {selectedProject === 'all' && selectedTask === 'all' && (
                <p className="text-xs text-orange-600 mt-2">
                  Sélectionnez un projet ou une tâche pour pouvoir commenter
                </p>
              )}
            </CardContent>
          </Card>

          {/* Liste commentaires */}
          <div className="space-y-4">
            {filteredComments.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun commentaire</h3>
                  <p className="text-gray-600">Soyez le premier à commenter</p>
                </div>
              </Card>
            ) : (
              filteredComments.map((comment) => (
                <Card key={comment._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                          {comment.auteur?.nom_complet?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">
                              {comment.auteur?.nom_complet || 'Utilisateur'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(comment.created_at)}
                            </span>
                            {comment.entity_type && (
                              <Badge variant="outline" className="text-xs">
                                {comment.entity_type === 'task' ? 'Tâche' : 'Projet'}
                              </Badge>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setReplyingTo(comment)}>
                                <Reply className="w-4 h-4 mr-2" />
                                Répondre
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteComment(comment._id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {comment.contenu?.split(/(@\w+)/g).map((part, idx) => 
                            part.startsWith('@') ? (
                              <span key={idx} className="text-indigo-600 font-medium">{part}</span>
                            ) : part
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {/* Liste activités */}
          {activities.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune activité</h3>
                <p className="text-gray-600">L'historique des actions apparaîtra ici</p>
              </div>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />
              
              <div className="space-y-4">
                {activities.map((activity, idx) => (
                  <div key={activity._id || idx} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      {getActivityIcon(activity.action)}
                    </div>
                    {/* Content */}
                    <Card className="flex-1">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {activity.utilisateur_nom || activity.utilisateur?.nom_complet || 'Système'}
                            </p>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{activity.entity_type}</Badge>
                          <Badge variant="secondary">{activity.action}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
