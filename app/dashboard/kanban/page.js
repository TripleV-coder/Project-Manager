'use client';
import ComingSoon from '@/components/ComingSoon';
import { Columns3 } from 'lucide-react';

export default function KanbanPage() {
  return <ComingSoon 
    title="Kanban Board" 
    description="Tableau Kanban interactif avec drag & drop"
    icon={Columns3}
  />;
}
