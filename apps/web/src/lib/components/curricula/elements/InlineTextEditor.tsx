/**
 * Inline text editor component with edit mode
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface InlineTextEditorProps {
  value: string;
  onChange?: (next: string) => void;
}

export function InlineTextEditor({ value, onChange }: InlineTextEditorProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const commit = useCallback(() => {
    onChange?.(local);
    setEditing(false);
  }, [local, onChange]);

  if (!editing) {
    return (
      <button
        type="button"
        className="text-left w-full px-2 py-1 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200"
        onClick={() => setEditing(true)}
        aria-label="Edit text"
      >
        {value ? (
          <span className="whitespace-pre-wrap break-words">{value}</span>
        ) : (
          <span className="text-gray-400">Click to add text…</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="w-full min-h-[80px] px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setLocal(value);
            setEditing(false);
          }
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          onClick={commit}
        >
          Save
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded hover:bg-gray-100"
          onClick={() => {
            setLocal(value);
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
