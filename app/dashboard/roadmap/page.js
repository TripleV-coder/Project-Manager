'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Map, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function RoadmapPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);

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

      const [projectsRes, tasksRes] = await Promise.all([
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(tasksUrl, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();

      setProjects(projectsData.projects || []);
      setTasks(tasksData.tasks || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const getMonthsInRange = () => {
    const months = [];
    const now = new Date();
    for (let i = -2; i < 4; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        date: date
      });
    }
    return months;
  };

  const months = getMonthsInRange();
  const tasksWithDates = tasks.filter(t => t.date_échéance);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Roadmap / Gantt</h1>
          <p className="text-gray-600">Vue chronologique de vos projets et tâches</p>
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

      {tasksWithDates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune tâche avec date</h3>
            <p className="text-gray-600">Ajoutez des dates d'échéance à vos tâches pour les voir sur la roadmap</p>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header mois */}
                <div className="flex border-b mb-4">
                  <div className="w-48 flex-shrink-0 p-2 font-medium">Tâche</div>
                  {months.map(month => (
                    <div key={month.key} className="flex-1 p-2 text-center text-sm font-medium border-l">
                      {month.label}
                    </div>
                  ))}
                </div>

                {/* Tâches */}
                <div className="space-y-2">
                  {tasksWithDates.map(task => {
                    const taskDate = new Date(task.date_échéance);
                    const monthIndex = months.findIndex(m => {
                      const mDate = m.date;
                      return taskDate.getMonth() === mDate.getMonth() && 
                             taskDate.getFullYear() === mDate.getFullYear();
                    });

                    return (
                      <div key={task._id} className="flex items-center hover:bg-gray-50 rounded-lg">
                        <div className="w-48 flex-shrink-0 p-2">
                          <div className="text-sm font-medium truncate">{task.titre}</div>
                          <Badge className="mt-1" variant="outline">{task.priorité}</Badge>
                        </div>
                        <div className="flex-1 flex">
                          {months.map((month, idx) => (
                            <div key={month.key} className="flex-1 p-2 border-l relative">
                              {idx === monthIndex && (
                                <div className="absolute inset-2 bg-indigo-200 rounded flex items-center justify-center">
                                  <Calendar className="w-4 h-4 text-indigo-700" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
