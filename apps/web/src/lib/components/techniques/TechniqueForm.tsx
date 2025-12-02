'use client';

import { useState, useEffect } from 'react';
import { generateSlug } from '@trainhive/shared';
import { RichTextEditor } from '../common/RichTextEditor';
import { CategoryAutocomplete } from '../common/CategoryAutocomplete';
import { TagAutocomplete } from '../common/TagAutocomplete';
import { AssetChoiceModal } from './AssetChoiceModal';
import { ReferenceAssetSearchModal } from './ReferenceAssetSearchModal';
import { apiClient } from '@/lib/backend';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string | null;
}

export interface ReferenceAssetFormData {
  id?: number; // Optional ID for existing assets
  type: 'video' | 'web' | 'image';
  url: string;
  title?: string | null;
  description?: string | null;
  videoType?: 'short' | 'full' | 'instructional' | 'seminar' | null;
  originator?: string | null;
  ord: number;
  tagIds: number[];
  isExisting?: boolean; // Flag to track if this references an existing asset
}

export interface TechniqueFormData {
  disciplineId: number;
  name: string;
  slug?: string;
  description?: string | null;
  categoryIds: number[];
  tagIds: number[];
  referenceAssets: ReferenceAssetFormData[];
}

interface TechniqueFormProps {
  technique?: any | null;
  disciplineId: number;
  onSubmit: (data: TechniqueFormData) => void;
  onCancel: () => void;
}

export function TechniqueForm({
  technique,
  disciplineId,
  onSubmit,
  onCancel,
}: TechniqueFormProps) {
  const [formData, setFormData] = useState<TechniqueFormData>({
    disciplineId: technique?.disciplineId || disciplineId,
    name: technique?.name || '',
    slug: technique?.slug || '',
    description: technique?.description || null,
    categoryIds: technique?.categoryIds || [],
    tagIds: technique?.tagIds || [],
    referenceAssets: technique?.referenceAssets || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingAssetIndex, setEditingAssetIndex] = useState<number | null>(null);
  const [assetModalMode, setAssetModalMode] = useState<'choice' | 'search' | null>(null);

  // Fetch tags for reference asset tagging
  useEffect(() => {
    const fetchTags = async () => {
      try {
        // Use API client to fetch tags
        const tagsData = await apiClient.tags.list({ disciplineId });
        setTags(Array.isArray(tagsData) ? tagsData : []);
      } catch (error) {
        console.error('Failed to load tags:', error);
        setTags([]);
      }
    };

    fetchTags();
  }, [disciplineId]);

  const handleChange = (field: keyof TechniqueFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate slug from name
    if (field === 'name' && value) {
      const slug = generateSlug(value.toString());
      setFormData((prev) => ({ ...prev, slug }));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCategoryChange = (categoryIds: number[]) => {
    setFormData((prev) => ({ ...prev, categoryIds }));
  };

  const handleTagChange = (tagIds: number[]) => {
    setFormData((prev) => ({ ...prev, tagIds }));
  };

  const handleAddAsset = () => {
    // Open the choice modal instead of immediately creating a new asset
    setAssetModalMode('choice');
  };

  const handleSelectExistingAsset = async (assetId: number) => {
    try {
      // Fetch full asset details
      const asset = await apiClient.referenceAssets.getById(assetId);

      // Add to form data with new ord value
      setFormData((prev) => ({
        ...prev,
        referenceAssets: [
          ...prev.referenceAssets,
          {
            id: asset.id,
            type: asset.type,
            url: asset.url,
            title: asset.title,
            description: asset.description,
            videoType: asset.videoType,
            originator: asset.originator,
            ord: prev.referenceAssets.length,
            tagIds: [],
            isExisting: true,
          },
        ],
      }));

      setAssetModalMode(null);
    } catch (error) {
      console.error('Failed to load asset:', error);
      alert('Failed to load the selected asset. Please try again.');
    }
  };

  const handleCreateNewAsset = () => {
    const newIndex = formData.referenceAssets.length;
    setFormData((prev) => ({
      ...prev,
      referenceAssets: [
        ...prev.referenceAssets,
        {
          type: 'web',
          url: '',
          title: null,
          description: null,
          originator: null,
          ord: prev.referenceAssets.length,
          tagIds: [],
          isExisting: false,
        },
      ],
    }));
    setEditingAssetIndex(newIndex);
    setAssetModalMode(null);
  };

  const handleRemoveAsset = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      referenceAssets: prev.referenceAssets.filter((_, i) => i !== index),
    }));
    // Clear editing state if we're removing the asset being edited
    if (editingAssetIndex === index) {
      setEditingAssetIndex(null);
    } else if (editingAssetIndex !== null && editingAssetIndex > index) {
      // Adjust index if we're removing an asset before the one being edited
      setEditingAssetIndex(editingAssetIndex - 1);
    }
  };

  const handleAssetChange = (index: number, field: keyof ReferenceAssetFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      referenceAssets: prev.referenceAssets.map((asset, i) =>
        i === index ? { ...asset, [field]: value } : asset
      ),
    }));
  };

  const handleAssetTagToggle = (assetIndex: number, tagId: number) => {
    setFormData((prev) => ({
      ...prev,
      referenceAssets: prev.referenceAssets.map((asset, i) =>
        i === assetIndex
          ? {
              ...asset,
              tagIds: asset.tagIds.includes(tagId)
                ? asset.tagIds.filter((id) => id !== tagId)
                : [...asset.tagIds, tagId],
            }
          : asset
      ),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Validate reference assets
    formData.referenceAssets.forEach((asset, index) => {
      if (!asset.url.trim()) {
        newErrors[`asset_${index}_url`] = 'URL is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const submitData: TechniqueFormData = {
        disciplineId: formData.disciplineId,
        name: formData.name.trim(),
        slug: formData.slug?.trim(),
        description: formData.description?.trim() || null,
        categoryIds: formData.categoryIds,
        tagIds: formData.tagIds,
        referenceAssets: formData.referenceAssets.map((asset) => ({
          ...asset,
          url: asset.url.trim(),
          title: asset.title?.trim() || null,
          description: asset.description?.trim() || null,
          originator: asset.originator?.trim() || null,
        })),
      };

      onSubmit(submitData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
            Technique Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., Armbar from Guard"
          />
          {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-foreground mb-1">
            Slug (auto-generated)
          </label>
          <input
            type="text"
            id="slug"
            value={formData.slug}
            readOnly
            className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground cursor-not-allowed"
            placeholder="Auto-generated from name"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <RichTextEditor
            value={formData.description || ''}
            onChange={(value) => handleChange('description', value || null)}
            placeholder="Describe the technique..."
            className="min-h-[150px]"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Categories (Optional)</h3>
        <p className="text-sm text-muted-foreground">
          Search and select categories this technique belongs to
        </p>
        <CategoryAutocomplete
          disciplineId={disciplineId}
          selectedIds={formData.categoryIds}
          onSelectionChange={handleCategoryChange}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Tags</h3>
        <p className="text-sm text-muted-foreground">
          Type to search existing tags or create new ones
        </p>
        <TagAutocomplete
          disciplineId={disciplineId}
          selectedIds={formData.tagIds}
          onSelectionChange={handleTagChange}
        />
      </div>

      {/* Reference Assets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Reference Assets</h3>
          <button
            type="button"
            onClick={handleAddAsset}
            className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Add Asset
          </button>
        </div>

        {formData.referenceAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reference assets added yet</p>
        ) : (
          <div className="space-y-2">
            {formData.referenceAssets.map((asset, index) => (
              <div key={index}>
                {editingAssetIndex === index ? (
                  // Edit Form View
                  <div className="border border-border rounded-md p-4 bg-accent/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">Editing Asset {index + 1}</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingAssetIndex(null)}
                          className="text-sm text-primary hover:text-primary/80"
                        >
                          Done
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(index)}
                          className="text-destructive hover:text-destructive/80 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                        <select
                          value={asset.type}
                          onChange={(e) =>
                            handleAssetChange(index, 'type', e.target.value as 'video' | 'web' | 'image')
                          }
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                        >
                          <option value="video">Video</option>
                          <option value="web">Web Link</option>
                          <option value="image">Image</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Originator
                        </label>
                        <input
                          type="text"
                          value={asset.originator || ''}
                          onChange={(e) => handleAssetChange(index, 'originator', e.target.value || null)}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                          placeholder="e.g., John Danaher"
                        />
                      </div>
                    </div>

                    {/* Video Type - Only show for video assets */}
                    {asset.type === 'video' && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Video Type
                        </label>
                        <select
                          value={asset.videoType || 'instructional'}
                          onChange={(e) =>
                            handleAssetChange(index, 'videoType', e.target.value as 'short' | 'full' | 'instructional' | 'seminar')
                          }
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                        >
                          <option value="short">Short</option>
                          <option value="full">Full</option>
                          <option value="instructional">Instructional</option>
                          <option value="seminar">Seminar</option>
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Select the type of video content
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">URL *</label>
                      <input
                        type="url"
                        value={asset.url}
                        onChange={(e) => handleAssetChange(index, 'url', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                        placeholder="https://..."
                      />
                      {errors[`asset_${index}_url`] && (
                        <p className="mt-1 text-sm text-destructive">{errors[`asset_${index}_url`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                      <input
                        type="text"
                        value={asset.title || ''}
                        onChange={(e) => handleAssetChange(index, 'title', e.target.value || null)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                        placeholder="Optional title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Description
                      </label>
                      <RichTextEditor
                        value={asset.description || ''}
                        onChange={(value) => handleAssetChange(index, 'description', value || null)}
                        placeholder="Optional description"
                        className="min-h-[100px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Tags</label>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleAssetTagToggle(index, tag.id)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              asset.tagIds.includes(tag.id)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Compact List View
                  <div className="border border-border rounded-md p-3 bg-card hover:bg-accent/20 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <a
                              href={asset.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {asset.title || asset.url}
                            </a>
                            {asset.isExisting && (
                              <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                Referenced
                              </span>
                            )}
                            {asset.originator && (
                              <span className="text-xs text-muted-foreground">
                                by {asset.originator}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground capitalize">{asset.type}</span>
                            {asset.type === 'video' && asset.videoType && (
                              <span className="text-xs text-muted-foreground">
                                • {asset.videoType}
                              </span>
                            )}
                            {asset.tagIds && asset.tagIds.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                • {asset.tagIds.length} tag{asset.tagIds.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!asset.isExisting && (
                          <button
                            type="button"
                            onClick={() => setEditingAssetIndex(index)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                            title="Edit asset"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(index)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                          title="Remove asset"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {technique ? 'Update Technique' : 'Create Technique'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Cancel
        </button>
      </div>

      {/* Asset Choice Modal */}
      {assetModalMode === 'choice' && (
        <AssetChoiceModal
          onSearchExisting={() => setAssetModalMode('search')}
          onCreateNew={handleCreateNewAsset}
          onClose={() => setAssetModalMode(null)}
        />
      )}

      {/* Asset Search Modal */}
      {assetModalMode === 'search' && (
        <ReferenceAssetSearchModal
          disciplineId={disciplineId}
          onSelect={handleSelectExistingAsset}
          onCreateNew={handleCreateNewAsset}
          onClose={() => setAssetModalMode(null)}
        />
      )}
    </form>
  );
}
