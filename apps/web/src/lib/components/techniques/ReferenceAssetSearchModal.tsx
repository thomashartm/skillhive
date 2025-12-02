'use client';

/**
 * Modal for searching and selecting existing reference assets
 */

import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/backend';

interface ReferenceAsset {
  id: number;
  techniqueId: number;
  type: 'video' | 'web' | 'image';
  url: string;
  title: string | null;
  description: string | null;
  videoType: 'short' | 'full' | 'instructional' | 'seminar' | null;
  originator: string | null;
  ord: number;
}

interface ReferenceAssetSearchModalProps {
  disciplineId: number;
  onSelect: (assetId: number) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export function ReferenceAssetSearchModal({
  disciplineId,
  onSelect,
  onCreateNew,
  onClose,
}: ReferenceAssetSearchModalProps) {
  const [assets, setAssets] = useState<ReferenceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'video' | 'web' | 'image'>('all');

  // Fetch all reference assets
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const data = await apiClient.referenceAssets.list();
        setAssets(data);
      } catch (error) {
        console.error('Failed to load reference assets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  // Filter assets based on search query and type
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((asset) => asset.type === typeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.title?.toLowerCase().includes(query) ||
          asset.url.toLowerCase().includes(query) ||
          asset.originator?.toLowerCase().includes(query) ||
          asset.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [assets, searchQuery, typeFilter]);

  const handleSelect = (assetId: number) => {
    onSelect(assetId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">Search Existing Assets</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select an asset to reference in this technique
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors ml-4"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-border space-y-3">
          {/* Search Input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search by title, URL, originator, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              All ({assets.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('video')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === 'video'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Videos ({assets.filter((a) => a.type === 'video').length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('web')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === 'web'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Web ({assets.filter((a) => a.type === 'web').length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('image')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === 'image'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Images ({assets.filter((a) => a.type === 'image').length})
            </button>
          </div>
        </div>

        {/* Asset List */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading assets...</div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-12 h-12 text-muted-foreground/50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-muted-foreground mb-2">No assets found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || typeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No reference assets have been created yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => handleSelect(asset.id)}
                  className="w-full p-4 border border-border rounded-lg hover:border-primary hover:bg-accent/50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      {asset.type === 'video' ? (
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : asset.type === 'image' ? (
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}
                    </div>

                    {/* Asset Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">
                          {asset.title || 'Untitled'}
                        </h3>
                        <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded capitalize">
                          {asset.type}
                          {asset.type === 'video' && asset.videoType && ` • ${asset.videoType}`}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate mb-1">
                        {asset.url}
                      </div>
                      {asset.originator && (
                        <div className="text-xs text-muted-foreground">
                          by {asset.originator}
                        </div>
                      )}
                      {asset.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {asset.description.replace(/<[^>]*>/g, '')}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            type="button"
            onClick={onCreateNew}
            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Instead
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
