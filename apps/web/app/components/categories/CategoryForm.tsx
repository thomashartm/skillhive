'use client';

import { useState } from 'react';
import { generateSlug } from '@trainhive/shared';
import { CategoryNode } from './CategoryTreeNode';

interface CategoryFormProps {
  category?: CategoryNode | null;
  parentCategory?: CategoryNode | null;
  disciplineId: string;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
}

export interface CategoryFormData {
  disciplineId: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  ord: number;
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
    description: category?.description || '',
    ord: category?.ord || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof CategoryFormData, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate slug from name
    if (field === 'name') {
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
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
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
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Description of this category"
          rows={3}
        />
      </div>

      <div>
        <label htmlFor="ord" className="block text-sm font-medium text-foreground mb-1">
          Order
        </label>
        <input
          type="number"
          id="ord"
          value={formData.ord}
          onChange={(e) => handleChange('ord', parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="0"
        />
      </div>

      {parentCategory && (
        <div className="p-3 bg-accent/50 rounded-md">
          <p className="text-sm text-muted-foreground">
            Parent Category: <span className="font-medium text-foreground">{parentCategory.name}</span>
          </p>
        </div>
      )}

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
