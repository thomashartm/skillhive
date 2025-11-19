'use client';

import { useState, useEffect, useRef } from 'react';
import { TechniqueForm, TechniqueFormData } from './TechniqueForm';

interface Technique {
  id: number;
  disciplineId: number;
  name: string;
  slug: string;
  description: string | null;
  categoryIds: number[];
  tagIds: number[];
  referenceAssets: any[];
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
}

interface Tag {
  id: number;
  name: string;
  color: string | null;
}

interface TechniqueManagerProps {
  disciplineId: number;
}

// Category Filter Input Component
function CategoryFilterInput({
  categories,
  selectedCategory,
  onCategoryChange,
}: {
  categories: Category[];
  selectedCategory: number | null;
  onCategoryChange: (id: number | null) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCategoryName = categories.find((cat) => cat.id === selectedCategory)?.name || '';

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (categoryId: number | null) => {
    onCategoryChange(categoryId);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : selectedCategoryName || 'All Categories'}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => {
          setIsOpen(true);
          setSearchTerm('');
        }}
        placeholder="All Categories"
        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
              selectedCategory === null ? 'bg-accent' : ''
            }`}
          >
            All Categories
          </button>
          {filteredCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleSelect(category.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                selectedCategory === category.id ? 'bg-accent' : ''
              }`}
            >
              {category.name}
            </button>
          ))}
          {filteredCategories.length === 0 && searchTerm && (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              No categories found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Tag Filter Input Component
function TagFilterInput({
  tags,
  selectedTag,
  onTagChange,
}: {
  tags: Tag[];
  selectedTag: number | null;
  onTagChange: (id: number | null) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTagName = tags.find((tag) => tag.id === selectedTag)?.name || '';

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (tagId: number | null) => {
    onTagChange(tagId);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : selectedTagName || 'All Tags'}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => {
          setIsOpen(true);
          setSearchTerm('');
        }}
        placeholder="All Tags"
        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
              selectedTag === null ? 'bg-accent' : ''
            }`}
          >
            All Tags
          </button>
          {filteredTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleSelect(tag.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                selectedTag === tag.id ? 'bg-accent' : ''
              }`}
            >
              {tag.color && (
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
              )}
              {tag.name}
            </button>
          ))}
          {filteredTags.length === 0 && searchTerm && (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">No tags found</div>
          )}
        </div>
      )}
    </div>
  );
}

export function TechniqueManager({ disciplineId }: TechniqueManagerProps) {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<Technique | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);

  const fetchTechniques = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ disciplineId: disciplineId.toString() });
      if (selectedCategory) params.append('categoryId', selectedCategory.toString());
      if (selectedTag) params.append('tagId', selectedTag.toString());

      const response = await fetch(`/api/v1/techniques?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch techniques');
      }

      const data = await response.json();
      // Ensure data is an array
      setTechniques(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching techniques:', err);
      // Set empty array on error to prevent UI from breaking
      setTechniques([]);
      setError(null); // Don't show error, just show empty state
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesAndTags = async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch(`/api/v1/categories?disciplineId=${disciplineId}`),
        fetch(`/api/v1/tags?disciplineId=${disciplineId}`),
      ]);

      const categoriesData = await categoriesRes.json();
      const tagsData = await tagsRes.json();

      // Flatten category tree
      const flattenCategories = (cats: any[], result: Category[] = []): Category[] => {
        cats.forEach((cat) => {
          result.push({ id: cat.id, name: cat.name });
          if (cat.children && cat.children.length > 0) {
            flattenCategories(cat.children, result);
          }
        });
        return result;
      };

      // Ensure data is an array before processing
      setCategories(Array.isArray(categoriesData) ? flattenCategories(categoriesData) : []);
      setTags(Array.isArray(tagsData) ? tagsData : []);
    } catch (err) {
      console.error('Failed to load categories and tags:', err);
      // Set empty arrays on error
      setCategories([]);
      setTags([]);
    }
  };

  useEffect(() => {
    fetchTechniques();
    fetchCategoriesAndTags();
  }, [disciplineId, selectedCategory, selectedTag]);

  const handleCreate = async (data: TechniqueFormData) => {
    try {
      const response = await fetch('/api/v1/techniques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create technique');
      }

      setShowForm(false);
      fetchTechniques();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create technique');
    }
  };

  const handleEdit = (technique: Technique) => {
    setEditingTechnique(technique);
    setShowForm(true);
  };

  const handleUpdate = async (data: TechniqueFormData) => {
    if (!editingTechnique) return;

    try {
      const response = await fetch(`/api/v1/techniques/${editingTechnique.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update technique');
      }

      setShowForm(false);
      setEditingTechnique(null);
      fetchTechniques();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update technique');
    }
  };

  const handleDelete = async (techniqueId: number) => {
    if (!confirm('Are you sure you want to delete this technique?')) return;

    try {
      const response = await fetch(`/api/v1/techniques/${techniqueId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete technique');
      }

      fetchTechniques();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete technique');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTechnique(null);
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {editingTechnique ? 'Edit Technique' : 'Create New Technique'}
          </h1>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <TechniqueForm
            technique={editingTechnique}
            disciplineId={disciplineId}
            onSubmit={editingTechnique ? handleUpdate : handleCreate}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Techniques</h1>
          <p className="text-muted-foreground">Browse and manage your technique library</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Add Technique
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Filter by Category
            </label>
            <CategoryFilterInput
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Filter by Tag</label>
            <TagFilterInput tags={tags} selectedTag={selectedTag} onTagChange={setSelectedTag} />
          </div>
        </div>
      </div>

      {/* Techniques List */}
      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Loading techniques...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-destructive">{error}</p>
        </div>
      ) : techniques.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No techniques found. Create your first technique to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {techniques.map((technique) => (
            <div
              key={technique.id}
              className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{technique.name}</h3>
                  {technique.description && (
                    <div
                      className="text-muted-foreground mb-3 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: technique.description }}
                    />
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    {technique.categoryIds.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Categories: </span>
                        <span className="text-foreground">
                          {technique.categoryIds
                            .map((id) => categories.find((c) => c.id === id)?.name)
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}

                    {technique.tagIds.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Tags: </span>
                        <div className="inline-flex flex-wrap gap-1">
                          {technique.tagIds.map((tagId) => {
                            const tag = tags.find((t) => t.id === tagId);
                            return tag ? (
                              <span
                                key={tagId}
                                className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
                                style={tag.color ? { backgroundColor: tag.color } : {}}
                              >
                                {tag.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {technique.referenceAssets && technique.referenceAssets.length > 0 && (
                      <div className="mt-3">
                        <span className="text-muted-foreground font-medium">Reference Assets:</span>
                        <ul className="mt-2 space-y-1">
                          {technique.referenceAssets.map((asset: any) => (
                            <li key={asset.id} className="flex items-center gap-2 text-sm">
                              <svg
                                className="w-4 h-4 text-muted-foreground flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                />
                              </svg>
                              <a
                                href={asset.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {asset.title || asset.url}
                              </a>
                              {asset.originator && (
                                <span className="text-muted-foreground text-xs">
                                  by {asset.originator}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(technique)}
                    className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(technique.id)}
                    className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
