import { useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

  // Handle status change - delegate to parent callback
  const handleStatusChange = useCallback(async (newStatut) => {
    if (!onStatusChange) return;

    setLoading(true);
    try {
      await onStatusChange(newStatut);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

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
