'use client';
import ComingSoon from '@/components/ComingSoon';
import { Euro } from 'lucide-react';

export default function BudgetPage() {
  return <ComingSoon 
    title="Budget" 
    description="Gestion du budget et des dépenses"
    icon={Euro}
  />;
}
