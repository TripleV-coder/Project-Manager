import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { getStatusConfig, getAvailableTransitions } from '@/lib/workflows';

export default function StatusBadge({
  type = 'timesheet',
  statut,
  entityId,
  onStatusChange,
  readOnly = false,
  canChange = true,
  userPermissions = {}
}) {
  const [loading, setLoading] = useState(false);

  // Get configuration from centralized workflow system
  const statusConfig = useMemo(() => {
    return getStatusConfig(type, statut);
  }, [type, statut]);

  const availableTransitions = useMemo(() => {
    return getAvailableTransitions(type, statut, userPermissions);
  }, [type, statut, userPermissions]);

  if (!statusConfig) {
    return <Badge className="bg-gray-100 text-gray-800">Inconnu</Badge>;
  }

  const handleStatusChange = async (newStatut) => {
    try {
      setLoading(true);
      const endpoint = type === 'timesheet'
        ? `/api/timesheets/${entityId}/status`
        : `/api/expenses/${entityId}/status`;

      const token = localStorage.getItem('pm_token');
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statut: newStatut })
      });

      if (!response.ok) {
        let errorMessage = 'Erreur lors du changement de statut';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = `Erreur ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      toast.success('Statut mis à jour avec succès');
      onStatusChange?.(newStatut);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const canTransition = availableTransitions.length > 0 && canChange && !readOnly;

  if (!canTransition) {
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`${statusConfig.color} gap-1 h-6 px-2 text-xs`}
          disabled={loading}
        >
          {statusConfig.label}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableTransitions.map(newStatut => {
          const targetConfig = getStatusConfig(type, newStatut);
          return (
            <DropdownMenuItem
              key={newStatut}
              onClick={() => handleStatusChange(newStatut)}
              disabled={loading}
              className="cursor-pointer"
            >
              {targetConfig?.label || newStatut}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
