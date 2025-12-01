/**
 * Modal for editing text elements
 */

import React, { useState, useEffect } from 'react';

export interface TextElementModalProps {
  open: boolean;
  initialValue?: string;
  onClose(): void;
  onSave(next: string): void;
}

export function TextElementModal({
  open,
  initialValue = '',
  onClose,
  onSave,
}: TextElementModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, open]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded shadow-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Text Element</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <textarea
          className="w-full min-h-[120px] px-2 py-1 rounded border border-gray-300"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter text…"
        />

        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" className="px-2 py-1 rounded hover:bg-gray-100" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => onSave(value)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
