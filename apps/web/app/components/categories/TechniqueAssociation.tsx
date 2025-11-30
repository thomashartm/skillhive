'use client';

import { useState, useEffect } from 'react';
import { CategoryNode } from './CategoryTreeNode';
import { apiClient, getErrorMessage } from '@/lib/api';

interface Technique {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primary?: boolean;
}

interface TechniqueAssociationProps {
  techniqueId: string;
  onClose?: () => void;
}

export function TechniqueAssociation({ techniqueId, onClose }: TechniqueAssociationProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [associatedCategories, setAssociatedCategories] = useState<Technique[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch all categories using API client
        const categoriesData = await apiClient.categories.list({});
        setCategories(categoriesData || []);

        // Fetch associated categories for this technique using API client
        const associatedData = await apiClient.techniques.getCategories(Number(techniqueId));
        setAssociatedCategories(associatedData || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [techniqueId]);

  const handleAssociate = async () => {
    if (!selectedCategoryId) {
      return;
    }

    try {
      // Use API client to add category to technique
      await apiClient.techniques.addCategory(
        Number(techniqueId),
        Number(selectedCategoryId),
        isPrimary
      );

      // Refresh associated categories
      const associatedData = await apiClient.techniques.getCategories(Number(techniqueId));
      setAssociatedCategories(associatedData || []);

      // Reset form
      setSelectedCategoryId('');
      setIsPrimary(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error associating category:', error);
      // eslint-disable-next-line no-alert
      alert(getErrorMessage(error));
    }
  };

  const handleRemove = async (categoryId: string) => {
    try {
      // Use API client to remove category from technique
      await apiClient.techniques.removeCategory(Number(techniqueId), Number(categoryId));

      // Refresh associated categories
      const associatedData = await apiClient.techniques.getCategories(Number(techniqueId));
      setAssociatedCategories(associatedData || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error removing association:', error);
      // eslint-disable-next-line no-alert
      alert(getErrorMessage(error));
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Associated Categories List */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Associated Categories</h3>
        {associatedCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories associated yet</p>
        ) : (
          <div className="space-y-2">
            {associatedCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 border border-border rounded-md bg-card"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  {cat.primary && (
                    <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(cat.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove association"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Association Form */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Add Category</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="category-select" className="block text-sm font-medium text-foreground mb-1">
              Select Category
            </label>
            <select
              id="category-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">-- Select a category --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="primary-checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 border-border rounded focus:ring-2 focus:ring-ring"
            />
            <label htmlFor="primary-checkbox" className="text-sm text-foreground">
              Set as primary category
            </label>
          </div>

          <button
            type="button"
            onClick={handleAssociate}
            disabled={!selectedCategoryId}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Category
          </button>
        </div>
      </div>

      {onClose && (
        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
