'use client';
import ComingSoon from '@/components/ComingSoon';
import { Calendar } from 'lucide-react';

export default function SprintsPage() {
  return <ComingSoon 
    title="Sprints" 
    description="Planification et suivi des sprints agiles"
    icon={Calendar}
  />;
}
