'use client';

import { useState, useEffect } from 'react';
import { generateSlug } from '@trainhive/shared';
import { CategoryNode } from './CategoryTreeNode';
import { apiClient } from '@/lib/api';

interface CategoryFormProps {
  category?: CategoryNode | null;
  parentCategory?: CategoryNode | null;
  disciplineId: number;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
}

export interface CategoryFormData {
  disciplineId: number;
  name: string;
  slug?: string;
  parentId: number | null;
  description?: string | null;
  ord?: number;
}

export function CategoryForm({
  category,
  parentCategory,
  disciplineId,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    disciplineId: category?.disciplineId || parentCategory?.disciplineId || disciplineId,
    name: category?.name || '',
    slug: category?.slug || '',
    parentId: category?.parentId || parentCategory?.id || null,
    description: category?.description || null,
    ord: category?.ord ?? 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allCategories, setAllCategories] = useState<CategoryNode[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Fetch all categories for parent selection when editing
  useEffect(() => {
    if (category) {
      // Only fetch categories when editing
      setLoadingCategories(true);
      apiClient.categories.list({ disciplineId })
        .then((data) => {
          setAllCategories(data as CategoryNode[]);
        })
        .catch((err) => {
          console.error('Failed to load categories:', err);
        })
        .finally(() => {
          setLoadingCategories(false);
        });
    }
  }, [category, disciplineId]);

  // Flatten category tree and filter out current category and its descendants
  const getValidParentCategories = (): CategoryNode[] => {
    if (!category) return [];

    const flattenCategories = (cats: CategoryNode[], result: CategoryNode[] = []): CategoryNode[] => {
      cats.forEach((cat) => {
        result.push(cat);
        if (cat.children && cat.children.length > 0) {
          flattenCategories(cat.children, result);
        }
      });
      return result;
    };

    // Get all descendants of current category
    const getDescendantIds = (cat: CategoryNode): Set<number> => {
      const ids = new Set<number>([cat.id]);
      if (cat.children) {
        cat.children.forEach((child) => {
          getDescendantIds(child).forEach((id) => ids.add(id));
        });
      }
      return ids;
    };

    const allFlat = flattenCategories(allCategories);
    const currentCat = allFlat.find((c) => c.id === category.id);
    const excludeIds = currentCat ? getDescendantIds(currentCat) : new Set([category.id]);

    return allFlat.filter((cat) => !excludeIds.has(cat.id));
  };

  const handleChange = (field: keyof CategoryFormData, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate slug from name
    if (field === 'name' && value !== null) {
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    // Slug is optional, only validate if provided
    if (formData.slug && !formData.slug.trim()) {
      newErrors.slug = 'Slug cannot be empty if provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Clean up the data before sending
      const submitData: CategoryFormData = {
        disciplineId: formData.disciplineId,
        name: formData.name.trim(),
        parentId: formData.parentId,
      };

      // Only include optional fields if they have values
      if (formData.slug && formData.slug.trim()) {
        submitData.slug = formData.slug.trim();
      }

      if (formData.description && formData.description.trim()) {
        submitData.description = formData.description.trim();
      }

      if (formData.ord !== undefined && !isNaN(formData.ord)) {
        submitData.ord = formData.ord;
      }

      onSubmit(submitData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g., Guard"
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
        <p className="mt-1 text-xs text-muted-foreground">
          Automatically generated from the category name
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value || null)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Description of this category"
          rows={3}
        />
      </div>

      {/* Parent Category Selector - shown when editing or has fixed parent */}
      {category ? (
        <div>
          <label htmlFor="parentId" className="block text-sm font-medium text-foreground mb-1">
            Parent Category
          </label>
          {loadingCategories ? (
            <div className="px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground">
              Loading categories...
            </div>
          ) : (
            <select
              id="parentId"
              value={formData.parentId || ''}
              onChange={(e) => handleChange('parentId', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">No Parent (Root Category)</option>
              {getValidParentCategories().map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Change the parent category to move this category
          </p>
        </div>
      ) : parentCategory ? (
        <div className="p-3 bg-accent/50 rounded-md">
          <p className="text-sm text-muted-foreground">
            Parent Category: <span className="font-medium text-foreground">{parentCategory.name}</span>
          </p>
        </div>
      ) : null}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {category ? 'Update Category' : 'Create Category'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
