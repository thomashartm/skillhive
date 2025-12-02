/**
 * Modal for selecting video assets
 */

import React, { useState, useEffect, useMemo } from 'react';
import { debounce, formatDuration } from '../utils';
import { IconVideo } from '../icons';
import type { VideoSummary } from '../types';

export interface AssetSelectionModalProps {
  open: boolean;
  onClose(): void;
  onSelect(assetId: number): void;
  onSearch?(q: string): void;
  results?: VideoSummary[];
  loading?: boolean;
  currentAsset?: VideoSummary | null;
}

export function AssetSelectionModal({
  open,
  onClose,
  onSelect,
  onSearch,
  results = [],
  loading = false,
  currentAsset,
}: AssetSelectionModalProps) {
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
          <div className="font-semibold">Select Asset</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {currentAsset && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-xs text-blue-600 mb-1">Currently Selected:</div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                {currentAsset.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentAsset.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <IconVideo />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-blue-900 truncate">{currentAsset.title}</div>
                {typeof currentAsset.durationSeconds === 'number' && (
                  <div className="text-xs text-blue-700">
                    {formatDuration(currentAsset.durationSeconds)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <input
          type="search"
          placeholder="Search assets…"
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
              {results.map((v) => {
                const isSelected = currentAsset?.id === v.id;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3 ${
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => onSelect(v.id)}
                    >
                      <div className="w-12 h-8 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                        {v.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <IconVideo />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`font-medium truncate ${isSelected ? 'text-blue-900' : ''}`}
                        >
                          {v.title}
                          {isSelected && (
                            <span className="ml-2 text-xs text-blue-600">(Selected)</span>
                          )}
                        </div>
                        {typeof v.durationSeconds === 'number' ? (
                          <div
                            className={`text-xs ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}
                          >
                            {formatDuration(v.durationSeconds)}
                          </div>
                        ) : null}
                      </div>
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
