'use client';
import ComingSoon from '@/components/ComingSoon';
import { Clock } from 'lucide-react';

export default function TimesheetsPage() {
  return <ComingSoon 
    title="Timesheets" 
    description="Suivi du temps passé par tâche et projet"
    icon={Clock}
  />;
}
