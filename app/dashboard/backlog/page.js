'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Layers, Plus, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function BacklogPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedEpics, setExpandedEpics] = useState(new Set());

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

      let tasksUrl = '/api/tasks?';
      if (selectedProject) tasksUrl += `projet_id=${selectedProject}&`;

      const [tasksRes, projectsRes] = await Promise.all([
        fetch(tasksUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();

      setTasks(tasksData.tasks || []);
      setProjects(projectsData.projects || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const toggleEpic = (epicId) => {
    const newExpanded = new Set(expandedEpics);
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId);
    } else {
      newExpanded.add(epicId);
    }
    setExpandedEpics(newExpanded);
  };

  const epics = tasks.filter(t => t.type === 'Epic');
  const stories = tasks.filter(t => t.type === 'User Story');
  const simpleTasks = tasks.filter(t => !t.type || t.type === 'Tâche');

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Backlog Produit</h1>
          <p className="text-gray-600">Hiérarchie des Épics, User Stories et Tâches</p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sélectionner un projet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous les projets</SelectItem>
            {projects.map(p => (
              <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {/* Épics */}
        {epics.map((epic, idx) => {
          const epicStories = stories.filter(s => s.epic_id === epic._id);
          const isExpanded = expandedEpics.has(epic._id);
          
          return (
            <motion.div
              key={epic._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleEpic(epic._id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <Layers className="w-5 h-5 text-purple-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{epic.titre}</CardTitle>
                        <Badge className="bg-purple-100 text-purple-800">Epic</Badge>
                        <Badge className={`${
                          epic.priorité === 'Critique' ? 'bg-red-100 text-red-800' :
                          epic.priorité === 'Haute' ? 'bg-orange-100 text-orange-800' :
                          epic.priorité === 'Moyenne' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>{epic.priorité}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{epic.description}</p>
                    </div>
                    <span className="text-sm text-gray-500">{epicStories.length} stories</span>
                  </div>
                </CardHeader>
                {isExpanded && epicStories.length > 0 && (
                  <CardContent className="pl-12">
                    <div className="space-y-2">
                      {epicStories.map(story => {
                        const storyTasks = simpleTasks.filter(t => t.parent_id === story._id);
                        return (
                          <div key={story._id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-l-blue-500">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-blue-100 text-blue-800">Story</Badge>
                              <span className="font-medium">{story.titre}</span>
                              {story.story_points && (
                                <Badge variant="outline">{story.story_points} pts</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{story.description}</p>
                            {storyTasks.length > 0 && (
                              <div className="ml-4 space-y-1">
                                {storyTasks.map(task => (
                                  <div key={task._id} className="flex items-center gap-2 text-sm">
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                    <span>{task.titre}</span>
                                    <Badge variant="outline" className="text-xs">{task.statut}</Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          );
        })}

        {/* Standalone Stories */}
        {stories.filter(s => !s.epic_id).map((story, idx) => (
          <motion.div
            key={story._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (epics.length + idx) * 0.05 }}
          >
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-100 text-blue-800">Story</Badge>
                  <CardTitle className="text-lg">{story.titre}</CardTitle>
                  {story.story_points && (
                    <Badge variant="outline">{story.story_points} pts</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{story.description}</p>
              </CardHeader>
            </Card>
          </motion.div>
        ))}

        {/* Standalone Tasks */}
        {simpleTasks.filter(t => !t.parent_id && !t.epic_id).map((task, idx) => (
          <motion.div
            key={task._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (epics.length + stories.length + idx) * 0.05 }}
          >
            <Card className="border-l-4 border-l-gray-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{task.titre}</CardTitle>
                  <Badge variant="outline">{task.statut}</Badge>
                </div>
              </CardHeader>
            </Card>
          </motion.div>
        ))}

        {tasks.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune tâche dans le backlog</h3>
              <p className="text-gray-600 mb-4">Créez des épics, stories et tâches pour organiser votre travail</p>
              <Button onClick={() => router.push('/dashboard/tasks')} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Créer une tâche
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
