'use client';

import { useState, useEffect } from 'react';
import { CategoryNode } from './CategoryTreeNode';

interface CategoryDetailViewProps {
  category: CategoryNode;
  allCategories: CategoryNode[]; // Needed for breadcrumb
  onClose: () => void;
  onEdit: (category: CategoryNode) => void;
  onAddChild: (category: CategoryNode) => void;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string | null;
}

interface Technique {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  tagIds: number[];
}

interface TechniquesResponse {
  techniques: Technique[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function CategoryDetailView({
  category,
  allCategories,
  onClose,
  onEdit,
  onAddChild,
}: CategoryDetailViewProps) {
  const hasChildren = category.children && category.children.length > 0;

  // State for techniques
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [totalTechniques, setTotalTechniques] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // State for filters
  const [titleFilter, setTitleFilter] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const limit = 20;

  // Build breadcrumb path
  const buildBreadcrumb = (): CategoryNode[] => {
    const path: CategoryNode[] = [];
    let current: CategoryNode | undefined = category;

    while (current) {
      path.unshift(current);
      if (current.parentId) {
        current = findCategoryById(current.parentId, allCategories);
      } else {
        break;
      }
    }

    return path;
  };

  const findCategoryById = (id: number, categories: CategoryNode[]): CategoryNode | undefined => {
    for (const cat of categories) {
      if (cat.id === id) return cat;
      if (cat.children) {
        const found = findCategoryById(id, cat.children);
        if (found) return found;
      }
    }
    return undefined;
  };

  const breadcrumb = buildBreadcrumb();

  // Fetch tags for the discipline
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch(`/api/v1/tags?disciplineId=${category.disciplineId}`);
        if (response.ok) {
          const data = await response.json();
          setTags(data);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    fetchTags();
  }, [category.disciplineId]);

  // Fetch techniques
  useEffect(() => {
    const fetchTechniques = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: limit.toString(),
        });

        if (titleFilter.trim()) {
          params.append('title', titleFilter.trim());
        }

        if (selectedTagIds.length > 0) {
          params.append('tagIds', selectedTagIds.join(','));
        }

        const response = await fetch(
          `/api/v1/categories/${category.id}/techniques?${params.toString()}`
        );

        if (response.ok) {
          const data: TechniquesResponse = await response.json();
          setTechniques(data.techniques);
          setTotalTechniques(data.total);
          setTotalPages(data.totalPages);
        }
      } catch (error) {
        console.error('Error fetching techniques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTechniques();
  }, [category.id, currentPage, titleFilter, selectedTagIds]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [titleFilter, selectedTagIds]);

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="border border-border rounded-lg p-6 bg-card">
      {/* Breadcrumb and Close Button */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            {breadcrumb.map((cat, index) => (
              <div key={cat.id} className="flex items-center gap-2">
                {index > 0 && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span className={index === breadcrumb.length - 1 ? 'text-foreground font-medium' : ''}>
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
          <h3 className="text-2xl font-bold text-foreground">{category.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          aria-label="Close details"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Metadata Grid */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
          <div className="px-3 py-2 bg-muted rounded-md min-h-[60px]">
            <p className="text-sm text-foreground">
              {category.description || <span className="text-muted-foreground italic">No description</span>}
            </p>
          </div>
        </div>

        {/* Subcategories Section */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Subcategories</label>
          {hasChildren ? (
            <div className="border border-border rounded-md divide-y divide-border">
              {category.children!.map((child) => (
                <div
                  key={child.id}
                  className="px-3 py-2 flex items-center justify-between hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <span className="text-sm text-foreground">{child.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {child.children && child.children.length > 0
                      ? `${child.children.length} subcategories`
                      : 'No subcategories'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-6 bg-muted rounded-md text-center">
              <p className="text-sm text-muted-foreground mb-3">No subcategories yet</p>
              <button
                type="button"
                onClick={() => onAddChild(category)}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Add first subcategory
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Techniques Section */}
      <div className="space-y-4 mb-6 pt-6 border-t border-border">
        <label className="block text-sm font-medium text-muted-foreground">
          Techniques ({totalTechniques})
        </label>

        {/* Filters */}
        <div className="space-y-3">
          {/* Title Filter */}
          <div>
            <input
              type="text"
              placeholder="Filter by technique name..."
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
            />
          </div>

          {/* Tag Filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Filter by tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                  style={
                    selectedTagIds.includes(tag.id) && tag.color
                      ? { backgroundColor: tag.color, color: '#fff' }
                      : {}
                  }
                >
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No tags available</span>
              )}
            </div>
          </div>
        </div>

        {/* Techniques Table */}
        <div className="border border-border rounded-md overflow-hidden">
          {loading ? (
            <div className="px-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">Loading techniques...</p>
            </div>
          ) : techniques.length > 0 ? (
            <>
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Tags
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {techniques.map((technique) => (
                    <tr
                      key={technique.id}
                      onClick={() => window.location.href = `/techniques/${technique.slug}`}
                      className="hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-primary">
                          {technique.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {technique.description ? (
                          <div
                            className="text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: technique.description }}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground italic">No description</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {technique.tagIds.slice(0, 3).map((tagId) => {
                            const tag = tags.find((t) => t.id === tagId);
                            return tag ? (
                              <span
                                key={tag.id}
                                className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                                style={tag.color ? { backgroundColor: tag.color, color: '#fff' } : {}}
                              >
                                {tag.name}
                              </span>
                            ) : null;
                          })}
                          {technique.tagIds.length > 3 && (
                            <span className="px-2 py-0.5 text-xs text-muted-foreground">
                              +{technique.tagIds.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-muted/50 flex items-center justify-between border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-xs rounded-md bg-background border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-xs rounded-md bg-background border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {titleFilter || selectedTagIds.length > 0
                  ? 'No techniques match the selected filters'
                  : 'No techniques in this category yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-border">
        <button
          type="button"
          onClick={() => onAddChild(category)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Subcategory
        </button>
        <button
          type="button"
          onClick={() => onEdit(category)}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Edit Category
        </button>
      </div>
    </div>
  );
}
