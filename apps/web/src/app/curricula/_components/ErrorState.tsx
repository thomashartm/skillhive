/**
 * Centralized error state component
 */

import React from 'react';

export interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
      <p className="text-destructive text-sm">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm text-destructive hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
