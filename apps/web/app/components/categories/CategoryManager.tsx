'use client';

import { useState } from 'react';
import { CategoryTree } from './CategoryTree';
import { CategoryForm, CategoryFormData } from './CategoryForm';
import { CategoryNode } from './CategoryTreeNode';

interface CategoryManagerProps {
  disciplineId: string;
  maxLevel?: number;
}

type ModalMode = 'create' | 'edit' | 'addChild' | null;

export function CategoryManager({ disciplineId, maxLevel = 5 }: CategoryManagerProps) {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [parentCategory, setParentCategory] = useState<CategoryNode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddRoot = () => {
    setModalMode('create');
    setSelectedCategory(null);
    setParentCategory(null);
  };

  const handleAddChild = (parent: CategoryNode) => {
    setModalMode('addChild');
    setParentCategory(parent);
    setSelectedCategory(null);
  };

  const handleEdit = (category: CategoryNode) => {
    setModalMode('edit');
    setSelectedCategory(category);
    setParentCategory(null);
  };

  const handleDelete = async (category: CategoryNode) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = (await response.json()) as { error: string };
        throw new Error(error.error || 'Failed to delete category');
      }

      // Refresh the tree
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting category:', error);
      // eslint-disable-next-line no-alert
      alert(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  const handleSubmit = async (data: CategoryFormData) => {
    try {
      let response;

      if (modalMode === 'edit' && selectedCategory) {
        // Update existing category
        response = await fetch(`/api/v1/categories/${selectedCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        // Create new category
        response = await fetch('/api/v1/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }

      if (!response.ok) {
        const error = (await response.json()) as { error: string };
        throw new Error(error.error || 'Failed to save category');
      }

      // Close modal and refresh tree
      setModalMode(null);
      setSelectedCategory(null);
      setParentCategory(null);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving category:', error);
      // eslint-disable-next-line no-alert
      alert(error instanceof Error ? error.message : 'Failed to save category');
    }
  };

  const handleCancel = () => {
    setModalMode(null);
    setSelectedCategory(null);
    setParentCategory(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Categories</h2>
          <p className="text-sm text-muted-foreground">Organize techniques into hierarchical categories</p>
        </div>
        <button
          type="button"
          onClick={handleAddRoot}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Root Category
        </button>
      </div>

      {/* Category Tree */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <CategoryTree
          key={refreshKey}
          disciplineId={disciplineId}
          maxLevel={maxLevel}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddChild={handleAddChild}
        />
      </div>

      {/* Modal for Create/Edit */}
      {modalMode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {modalMode === 'edit' && 'Edit Category'}
              {modalMode === 'create' && 'Create Root Category'}
              {modalMode === 'addChild' && 'Add Subcategory'}
            </h3>
            <CategoryForm
              category={selectedCategory}
              parentCategory={parentCategory}
              disciplineId={disciplineId}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
