'use client';

import { useEffect, useState } from 'react';
import { CategoryTreeNode, CategoryNode } from './CategoryTreeNode';
import { apiClient, getErrorMessage } from '@/lib/api';

interface CategoryTreeProps {
  disciplineId?: number;
  maxLevel?: number;
  onEdit?: (category: CategoryNode) => void;
  onDelete?: (category: CategoryNode) => void;
  onAddChild?: (parentCategory: CategoryNode) => void;
  onSelect?: (category: CategoryNode) => void;
  selectedId?: number | null;
}

export function CategoryTree({
  disciplineId,
  maxLevel = 5,
  onEdit,
  onDelete,
  onAddChild,
  onSelect,
  selectedId,
}: CategoryTreeProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);

        // Use API client to fetch categories
        const data = await apiClient.categories.list({
          disciplineId,
          tree: true
        });

        setCategories((data as unknown as CategoryNode[]) || []);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchCategories();
  }, [disciplineId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading categories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (categories.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <div className="text-muted-foreground">No categories found</div>
        <p className="text-sm text-muted-foreground">
          Click &quot;Add Root Category&quot; to create your first category
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {categories.map((category) => (
        <CategoryTreeNode
          key={category.id}
          category={category}
          level={0}
          maxLevel={maxLevel}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
