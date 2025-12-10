import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function TaskCard({ task, isDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const priorityColors = {
    'Critique': 'bg-red-100 text-red-700 border-red-200',
    'Haute': 'bg-orange-100 text-orange-700 border-orange-200',
    'Moyenne': 'bg-blue-100 text-blue-700 border-blue-200',
    'Basse': 'bg-gray-100 text-gray-700 border-gray-200'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="cursor-move hover:shadow-md transition-shadow bg-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{task.titre}</h4>
              {task.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${priorityColors[task.priorité] || ''}`}
                  >
                    {task.priorité}
                  </Badge>
                  {task.story_points && (
                    <Badge variant="outline" className="text-xs">
                      {task.story_points} pts
                    </Badge>
                  )}
                </div>
                
                {task.assigné_à && (
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                      {task.assigné_à.nom_complet?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>

              {task.date_échéance && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {new Date(task.date_échéance).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
