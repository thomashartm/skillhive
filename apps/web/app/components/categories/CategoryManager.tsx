'use client';

import { useState, useEffect } from 'react';
import { CategoryTree } from './CategoryTree';
import { CategoryForm, CategoryFormData } from './CategoryForm';
import { CategoryNode } from './CategoryTreeNode';
import { CategoryDetailView } from './CategoryDetailView';
import { apiClient, getErrorMessage } from '@/lib/api';

interface CategoryManagerProps {
  disciplineId: number;
  maxLevel?: number;
}

type ModalMode = 'create' | 'edit' | 'addChild' | null;

export function CategoryManager({ disciplineId, maxLevel = 5 }: CategoryManagerProps) {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [parentCategory, setParentCategory] = useState<CategoryNode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewCategory, setViewCategory] = useState<CategoryNode | null>(null);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const [allCategories, setAllCategories] = useState<CategoryNode[]>([]);

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
      // Use API client for deletion
      await apiClient.categories.delete(category.id);

      // Refresh the tree
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting category:', error);
      // eslint-disable-next-line no-alert
      alert(getErrorMessage(error));
    }
  };

  const handleSubmit = async (data: CategoryFormData) => {
    try {
      if (modalMode === 'edit' && selectedCategory) {
        // Update existing category
        await apiClient.categories.update(selectedCategory.id, data);
      } else {
        // Create new category
        await apiClient.categories.create(data);
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
      alert(getErrorMessage(error));
    }
  };

  const handleCancel = () => {
    setModalMode(null);
    setSelectedCategory(null);
    setParentCategory(null);
  };

  const handleSelect = (category: CategoryNode) => {
    setViewCategory(category);
  };

  const handleCloseDetail = () => {
    setViewCategory(null);
  };

  // Fetch all categories for breadcrumb building
  useEffect(() => {
    async function fetchCategories() {
      try {
        // Use API client to fetch categories
        const data = await apiClient.categories.list({
          disciplineId,
          tree: true
        });
        setAllCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }

    void fetchCategories();
  }, [disciplineId, refreshKey]);

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

      {/* Main Content: Tree + Detail View */}
      <div className="flex gap-4">
        {/* Category Tree Panel */}
        <div
          className={`transition-all duration-300 ease-in-out border border-border rounded-lg bg-card ${
            isTreeCollapsed ? 'w-12' : 'w-full lg:w-1/2'
          }`}
        >
          {isTreeCollapsed ? (
            <div className="flex flex-col items-center py-4">
              <button
                type="button"
                onClick={() => setIsTreeCollapsed(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                title="Expand tree panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Category Tree</h3>
                <button
                  type="button"
                  onClick={() => setIsTreeCollapsed(true)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                  title="Collapse tree panel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <CategoryTree
                  key={refreshKey}
                  disciplineId={disciplineId}
                  maxLevel={maxLevel}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddChild={handleAddChild}
                  onSelect={handleSelect}
                  selectedId={viewCategory?.id || null}
                />
              </div>
            </>
          )}
        </div>

        {/* Category Detail View */}
        <div className={`transition-all duration-300 ease-in-out ${isTreeCollapsed ? 'flex-1' : 'w-full lg:w-1/2'}`}>
          {viewCategory ? (
            <CategoryDetailView
              category={viewCategory}
              allCategories={allCategories}
              onClose={handleCloseDetail}
              onEdit={handleEdit}
              onAddChild={handleAddChild}
            />
          ) : (
            <div className="border border-border rounded-lg p-6 bg-card flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <svg
                  className="w-16 h-16 mx-auto text-muted-foreground/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm text-muted-foreground">Select a category to view its details</p>
              </div>
            </div>
          )}
        </div>
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
