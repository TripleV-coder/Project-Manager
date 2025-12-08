'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function CommentsPage() {
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProjects(data.projects || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const handlePostComment = () => {
    if (!newComment.trim()) {
      toast.error('Veuillez écrire un commentaire');
      return;
    }
    toast.success('Commentaire publié');
    setNewComment('');
  };

  const getActivityIcon = (type) => {
    return <MessageSquare className="w-5 h-5 text-indigo-600" />;
  };

  const getActivityColor = (type) => {
    const colors = {
      'commentaire': 'bg-blue-100 text-blue-800',
      'modification': 'bg-yellow-100 text-yellow-800',
      'création': 'bg-green-100 text-green-800',
      'suppression': 'bg-red-100 text-red-800'
    };
    return colors[type] || colors['commentaire'];
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Flux d'Activité</h1>
          <p className="text-gray-600">Commentaires et historique des actions</p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Tous les projets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous les projets</SelectItem>
            {projects.map(p => (
              <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nouveau commentaire */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nouveau commentaire</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Écrivez votre commentaire... (utilisez @ pour mentionner quelqu'un)"
              rows={3}
            />
            <Button onClick={handlePostComment} className="bg-indigo-600 hover:bg-indigo-700">
              Publier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Flux d'activité */}
      <Card>
        <CardHeader>
          <CardTitle>Activités récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune activité</h3>
              <p className="text-gray-600">Les activités et commentaires apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, idx) => (
                <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{activity.user}</span>
                      <Badge className={getActivityColor(activity.type)}>
                        {activity.type}
                      </Badge>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.date}
                      </span>
                    </div>
                    <p className="text-gray-700">{activity.message}</p>
                    {activity.projet && (
                      <span className="text-sm text-gray-500">Projet: {activity.projet}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
