'use client';
import ComingSoon from '@/components/ComingSoon';
import { TrendingUp } from 'lucide-react';

export default function RoadmapPage() {
  return <ComingSoon 
    title="Roadmap / Gantt" 
    description="Visualisation roadmap et diagramme de Gantt"
    icon={TrendingUp}
  />;
}
