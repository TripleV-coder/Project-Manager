'use client';
import ComingSoon from '@/components/ComingSoon';
import { ListChecks } from 'lucide-react';

export default function BacklogPage() {
  return <ComingSoon 
    title="Backlog" 
    description="Gestion du backlog produit avec hiérarchie épics"
    icon={ListChecks}
  />;
}
