import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import TaskCard from './TaskCard';

export default function KanbanColumn({ column, tasks }) {
  const { setNodeRef } = useDroppable({
    id: column.id
  });

  return (
    <div className="flex-shrink-0 w-80 bg-gray-100 rounded-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: column.couleur }}
            />
            <h3 className="font-semibold text-gray-900">{column.nom}</h3>
            <Badge variant="secondary">{tasks.length}</Badge>
          </div>
        </div>

        <div 
          ref={setNodeRef}
          className="space-y-3 min-h-[500px]"
        >
          <SortableContext 
            items={tasks.map(t => t._id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}
