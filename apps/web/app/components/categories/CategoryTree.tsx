'use client';

import { useEffect, useState } from 'react';
import { CategoryTreeNode, CategoryNode } from './CategoryTreeNode';

interface CategoryTreeProps {
  disciplineId?: string;
  maxLevel?: number;
  onEdit?: (category: CategoryNode) => void;
  onDelete?: (category: CategoryNode) => void;
  onAddChild?: (parentCategory: CategoryNode) => void;
}

export function CategoryTree({
  disciplineId,
  maxLevel = 5,
  onEdit,
  onDelete,
  onAddChild,
}: CategoryTreeProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ tree: 'true' });
        if (disciplineId) {
          params.append('disciplineId', disciplineId);
        }

        const response = await fetch(`/api/v1/categories?${params.toString()}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch categories' }));
          throw new Error(errorData.error || 'Failed to fetch categories');
        }

        const data = (await response.json()) as CategoryNode[];
        setCategories(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
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
        />
      ))}
    </div>
  );
}
