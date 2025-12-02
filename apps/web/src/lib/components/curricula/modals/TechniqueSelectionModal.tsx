/**
 * Modal for selecting techniques
 */

import React, { useState, useEffect, useMemo } from 'react';
import { debounce } from '../utils';
import type { TechniqueSummary } from '../types';

export interface TechniqueSelectionModalProps {
  open: boolean;
  onClose(): void;
  onSelect(techniqueId: number): void;
  onSearch?(q: string): void;
  results?: TechniqueSummary[];
  loading?: boolean;
  currentTechnique?: TechniqueSummary | null;
}

export function TechniqueSelectionModal({
  open,
  onClose,
  onSelect,
  onSearch,
  results = [],
  loading = false,
  currentTechnique,
}: TechniqueSelectionModalProps) {
  const [query, setQuery] = useState('');
  const debouncedSearch = useMemo(
    () => (onSearch ? debounce(onSearch, 300) : undefined),
    [onSearch]
  );

  useEffect(() => {
    if (debouncedSearch) debouncedSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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
          <div className="font-semibold">Select Technique</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {currentTechnique && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-xs text-blue-600 mb-1">Currently Selected:</div>
            <div className="font-medium text-blue-900">{currentTechnique.name}</div>
            {currentTechnique.description && (
              <div className="text-xs text-blue-700 mt-1 line-clamp-2">
                {currentTechnique.description}
              </div>
            )}
          </div>
        )}

        <input
          type="search"
          placeholder="Search techniques…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-2 py-1 rounded border border-gray-300 mb-3"
        />

        <div className="max-h-80 overflow-auto rounded border border-gray-200">
          {loading ? (
            <div className="p-3 text-sm text-gray-500">Loading…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No results</div>
          ) : (
            <ul>
              {results.map((t) => {
                const isSelected = currentTechnique?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => onSelect(t.id)}
                    >
                      <div className={`font-medium ${isSelected ? 'text-blue-900' : ''}`}>
                        {t.name}
                        {isSelected && (
                          <span className="ml-2 text-xs text-blue-600">(Selected)</span>
                        )}
                      </div>
                      {t.description ? (
                        <div
                          className={`text-xs line-clamp-2 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}
                        >
                          {t.description}
                        </div>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-3 text-right">
          <button type="button" className="px-2 py-1 rounded hover:bg-gray-100" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
