'use client';

import { useState } from 'react';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  disciplineId: string;
  ord: number;
  children?: CategoryNode[];
}

interface CategoryTreeNodeProps {
  category: CategoryNode;
  level: number;
  maxLevel: number;
  onEdit?: (category: CategoryNode) => void;
  onDelete?: (category: CategoryNode) => void;
  onAddChild?: (parentCategory: CategoryNode) => void;
}

export function CategoryTreeNode({
  category,
  level,
  maxLevel,
  onEdit,
  onDelete,
  onAddChild,
}: CategoryTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = category.children && category.children.length > 0;
  const canAddChildren = level < maxLevel;

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-accent/50 rounded-md group"
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Placeholder for alignment when no children */}
        {!hasChildren && <div className="w-5" />}

        {/* Folder Icon */}
        <div className="flex-shrink-0 w-5 h-5 text-primary">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>

        {/* Category Name */}
        <span className="flex-1 text-sm font-medium text-foreground">{category.name}</span>

        {/* Action Buttons (shown on hover) */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canAddChildren && (
            <button
              type="button"
              onClick={() => onAddChild?.(category)}
              className="p-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded"
              title="Add subcategory"
              aria-label="Add subcategory"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit?.(category)}
            className="p-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded"
            title="Edit category"
            aria-label="Edit category"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(category)}
            className="p-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
            title="Delete category"
            aria-label="Delete category"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Children (recursively rendered) */}
      {isExpanded && hasChildren && (
        <div>
          {category.children!.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              level={level + 1}
              maxLevel={maxLevel}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
