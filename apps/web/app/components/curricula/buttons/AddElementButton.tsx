/**
 * Button component for adding curriculum elements
 */

import React from 'react';
import type { ElementKind } from '../types';

export interface AddElementButtonProps {
  onAdd(kind: ElementKind): void;
}

export function AddElementButton({ onAdd }: AddElementButtonProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        onClick={() => onAdd('technique')}
      >
        + Technique
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        onClick={() => onAdd('asset')}
      >
        + Asset
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        onClick={() => onAdd('text')}
      >
        + Instruction
      </button>
    </div>
  );
}
