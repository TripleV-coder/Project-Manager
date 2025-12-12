'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ConfirmationDialog({ isOpen, onClose, state }) {
  if (!state) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          {state.description && (
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={state.onCancel}>
            {state.cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={state.onConfirm}
            className={state.isDangerous ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}
          >
            {state.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
