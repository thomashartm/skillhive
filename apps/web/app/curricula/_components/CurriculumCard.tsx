/**
 * Reusable curriculum card component
 */

import React from 'react';
import type { Curriculum } from '@/app/components/curricula/types';

export interface CurriculumCardProps {
  curriculum: Curriculum;
  actions?: React.ReactNode;
  onClick?: () => void;
}

export function CurriculumCard({ curriculum, actions, onClick }: CurriculumCardProps) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow flex flex-col cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-xl font-semibold text-foreground flex-1">{curriculum.title}</h2>
        <span
          className={`px-2 py-1 rounded text-xs ${
            curriculum.isPublic
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          {curriculum.isPublic ? 'Public' : 'Private'}
        </span>
      </div>

      {curriculum.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {curriculum.description}
        </p>
      )}

      <div className="text-xs text-muted-foreground mb-4">
        Updated {new Date(curriculum.updatedAt).toLocaleDateString()}
      </div>

      {actions && (
        <div className="flex items-center justify-end gap-2 mt-auto pt-4 border-t border-border">
          {actions}
        </div>
      )}
    </div>
  );
}
