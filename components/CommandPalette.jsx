'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  CheckSquare,
  Zap,
  Layers,
  FileText,
  Clock,
  DollarSign,
  Settings,
  User,
  Plus,
  Moon,
  Sun,
  LogOut,
  Bell,
  Search,
  Home,
  TrendingUp,
  MessageSquare,
  Files,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useTranslation } from '@/contexts/AppSettingsContext';

export function CommandPalette({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { t } = useTranslation();

  // Handle Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      {/* Search trigger button in header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Rechercher une page ou action...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-white dark:bg-gray-800 px-1.5 font-mono text-[10px] font-medium text-gray-600 dark:text-gray-300">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Que souhaitez-vous faire ? (ex: projet, tâche, temps...)" />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

          {/* Navigation */}
          <CommandGroup heading="Espaces & Pages">
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard'))}
              className="cursor-pointer"
            >
              <Home className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Accueil & Vue d'ensemble</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/projects'))}
              className="cursor-pointer"
            >
              <FolderKanban className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Vos Projets</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/tasks'))}
              className="cursor-pointer"
            >
              <CheckSquare className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Suivi des Tâches</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/kanban'))}
              className="cursor-pointer"
            >
              <Layers className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Tableau par étapes (Kanban)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/sprints'))}
              className="cursor-pointer"
            >
              <Zap className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Objectifs & Périodes de travail (Sprints)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/backlog'))}
              className="cursor-pointer"
            >
              <Layers className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Réserve & Tâches à planifier (Backlog)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/roadmap'))}
              className="cursor-pointer"
            >
              <TrendingUp className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Planning & Calendrier global (Roadmap)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/reports'))}
              className="cursor-pointer"
            >
              <FileText className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Rapports & Bilans</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/timesheets'))}
              className="cursor-pointer"
            >
              <Clock className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Heures & Temps passés</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/budget'))}
              className="cursor-pointer"
            >
              <DollarSign className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Budget & Dépenses</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/files'))}
              className="cursor-pointer"
            >
              <Files className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Documents & Fichiers</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/comments'))}
              className="cursor-pointer"
            >
              <MessageSquare className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Discussions & Échanges</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/notifications'))}
              className="cursor-pointer"
            >
              <Bell className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Notifications</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Quick Actions */}
          <CommandGroup heading="Actions rapides">
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/projects'))}
              className="cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4 text-green-600" />
              <span>Créer un nouveau projet</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/tasks'))}
              className="cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4 text-blue-600" />
              <span>Créer une nouvelle tâche</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/sprints'))}
              className="cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4 text-purple-600" />
              <span>Planifier une période de travail</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Administration (if permitted) */}
          {user?.role?.permissions?.adminConfig && (
            <CommandGroup heading="Paramètres & Administration">
              <CommandItem
                onSelect={() => runCommand(() => router.push('/dashboard/admin/templates'))}
                className="cursor-pointer"
              >
                <Layers className="mr-2 h-4 w-4 text-orange-600" />
                <span>Modèles de Projets prêts à l'emploi</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/dashboard/admin/roles'))}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4 text-orange-600" />
                <span>Rôles & Droits d'accès</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/dashboard/users'))}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4 text-orange-600" />
                <span>Membres & Collaborateurs</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4 text-orange-600" />
                <span>Paramètres de l'application</span>
              </CommandItem>
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Preferences & Account */}
          <CommandGroup heading="Mon Compte & Affichage">
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/profile'))}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-300" />
              <span>Mon Profil & Sécurité</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
              className="cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="mr-2 h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="mr-2 h-4 w-4 text-indigo-500" />
              )}
              <span>Basculer le thème ({theme === 'dark' ? 'Clair' : 'Sombre'})</span>
            </CommandItem>
            {onLogout && (
              <CommandItem
                onSelect={() => runCommand(onLogout)}
                className="cursor-pointer text-red-600 dark:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
                <span>{t('logout')}</span>
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
