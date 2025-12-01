/**
 * Action buttons for curriculum elements (edit, delete)
 */

import React from 'react';
import { IconEdit, IconTrash } from '../icons';

export interface ElementActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ElementActions({ onEdit, onDelete }: ElementActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <button
          type="button"
          aria-label="Edit element"
          onClick={onEdit}
          className="p-1 rounded hover:bg-gray-100"
        >
          <IconEdit />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label="Delete element"
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-100 text-red-700"
        >
          <IconTrash />
        </button>
      )}
    </div>
  );
}
