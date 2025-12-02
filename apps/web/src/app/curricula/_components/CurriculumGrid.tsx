/**
 * Grid layout component with built-in loading/error states
 */

import React from 'react';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import type { Curriculum } from '@/lib/components/curricula/types';

export interface CurriculumGridProps {
  curricula: Curriculum[];
  loading: boolean;
  error: string | null;
  emptyMessage?: string;
  renderCard: (curriculum: Curriculum) => React.ReactNode;
  onRetry?: () => void;
}

export function CurriculumGrid({
  curricula,
  loading,
  error,
  emptyMessage = "No curricula found.",
  renderCard,
  onRetry,
}: CurriculumGridProps) {
  if (loading) {
    return <LoadingState />;
  }

  if (error && curricula.length === 0) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (curricula.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {curricula.map((curriculum) => renderCard(curriculum))}
    </div>
  );
}
