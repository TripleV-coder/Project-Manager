'use client';
import ComingSoon from '@/components/ComingSoon';
import { FolderOpen } from 'lucide-react';

export default function FilesPage() {
  return <ComingSoon 
    title="Fichiers" 
    description="Gestionnaire de fichiers avec intégration SharePoint"
    icon={FolderOpen}
  />;
}
