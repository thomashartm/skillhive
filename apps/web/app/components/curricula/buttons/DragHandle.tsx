/**
 * Drag handle component for reordering elements
 */

import React from 'react';
import { IconDrag } from '../icons';

export interface DragHandleProps extends React.HTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function DragHandle({ label = 'Drag to reorder', ...rest }: DragHandleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100"
      {...rest}
    >
      <IconDrag />
    </button>
  );
}
