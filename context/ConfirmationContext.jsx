'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

const ConfirmationContext = createContext();

export function ConfirmationProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogState, setDialogState] = useState(null);

  const confirm = useCallback(
    ({
      title = 'Confirmation',
      description = 'Êtes-vous sûr ?',
      actionLabel = 'Confirmer',
      cancelLabel = 'Annuler',
      isDangerous = false,
    } = {}) => {
      return new Promise((resolve) => {
        const state = {
          title,
          description,
          actionLabel,
          cancelLabel,
          isDangerous,
          onConfirm: () => {
            setIsOpen(false);
            resolve(true);
          },
          onCancel: () => {
            setIsOpen(false);
            resolve(false);
          },
        };
        setDialogState(state);
        setIsOpen(true);
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationDialog isOpen={isOpen} onClose={handleClose} state={dialogState} />
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within ConfirmationProvider');
  }
  return context;
}
