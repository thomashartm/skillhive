'use client';

import { useState, useEffect, useRef } from 'react';
import { TechniqueForm, TechniqueFormData } from './TechniqueForm';
import { Technique, TechniqueTile } from './TechniqueTile';
import { apiClient, getErrorMessage } from '@/lib/backend';

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
      // Use API client to fetch techniques
      const data = await apiClient.techniques.list({
        disciplineId,
        categoryId: selectedCategory || undefined,
        tagId: selectedTag || undefined,
      });

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
      // Use API client to fetch categories and tags
      const [categoriesData, tagsData] = await Promise.all([
        apiClient.categories.list({ disciplineId }),
        apiClient.tags.list({ disciplineId }),
      ]);

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
      // Use API client to create technique
      await apiClient.techniques.create(data);

      setShowForm(false);
      fetchTechniques();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleEdit = (technique: Technique) => {
    setEditingTechnique(technique);
    setShowForm(true);
  };

  const handleUpdate = async (data: TechniqueFormData) => {
    if (!editingTechnique) return;

    try {
      // Use API client to update technique
      await apiClient.techniques.update(editingTechnique.id, data);

      setShowForm(false);
      setEditingTechnique(null);
      fetchTechniques();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDelete = async (techniqueId: number) => {
    if (!confirm('Are you sure you want to delete this technique?')) return;

    try {
      // Use API client to delete technique
      await apiClient.techniques.delete(techniqueId);

      fetchTechniques();
    } catch (err) {
      alert(getErrorMessage(err));
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
            <TechniqueTile
              key={technique.id}
              disciplineId="1"
              technique={technique}
              categories={categories}
              tags={tags}
              editHandler={() => handleEdit(technique)}
              deleteHandler={() => handleDelete(technique.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
