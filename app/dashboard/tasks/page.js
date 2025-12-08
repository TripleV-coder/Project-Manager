'use client';
import ComingSoon from '@/components/ComingSoon';
import { CheckSquare } from 'lucide-react';

export default function TasksPage() {
  return <ComingSoon 
    title="Tâches" 
    description="Gestion complète des tâches et sous-tâches"
    icon={CheckSquare}
  />;
}
