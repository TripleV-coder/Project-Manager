'use client';
import ComingSoon from '@/components/ComingSoon';
import { MessageSquare } from 'lucide-react';

export default function CommentsPage() {
  return <ComingSoon 
    title="Commentaires" 
    description="Flux de commentaires et discussions"
    icon={MessageSquare}
  />;
}
