'use client';

import { useState, useEffect, useRef } from 'react';

interface Category {
  id: number;
  name: string;
  slug: string;
  children?: Category[];
}

interface CategoryAutocompleteProps {
  disciplineId: number;
  selectedIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  className?: string;
}

export function CategoryAutocomplete({
  disciplineId,
  selectedIds,
  onSelectionChange,
  className = '',
}: CategoryAutocompleteProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`/api/v1/categories?disciplineId=${disciplineId}`);
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);

        // Flatten category tree with hierarchy information
        const flatten = (cats: Category[], result: any[] = [], level: number = 0, parent: string = ''): any[] => {
          cats.forEach((cat) => {
            const path = parent ? `${parent} > ${cat.name}` : cat.name;
            result.push({
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              level,
              path,
              children: cat.children
            });
            if (cat.children && cat.children.length > 0) {
              flatten(cat.children, result, level + 1, path);
            }
          });
          return result;
        };

        setFlatCategories(Array.isArray(data) ? flatten(data) : []);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategories([]);
        setFlatCategories([]);
      }
    };

    fetchCategories();
  }, [disciplineId]);

  // Update filtered categories based on search term
  useEffect(() => {
    if (searchTerm.length === 0) {
      // Show root categories when no search term
      setFilteredCategories(categories);
    } else {
      // Filter all categories by search term
      const filtered = flatCategories.filter((cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  }, [searchTerm, categories, flatCategories]);

  // Handle click outside to close dropdown
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

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleCategorySelect = (categoryId: number) => {
    if (!selectedIds.includes(categoryId)) {
      onSelectionChange([...selectedIds, categoryId]);
    }
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleCategoryRemove = (categoryId: number) => {
    onSelectionChange(selectedIds.filter((id) => id !== categoryId));
  };

  const selectedCategories = selectedIds
    .map((id) => flatCategories.find((cat) => cat.id === id))
    .filter((cat): cat is Category => cat !== undefined);

  const renderCategoryTree = (cats: Category[], level: number = 0): JSX.Element[] => {
    return cats.map((cat) => {
      const isSelected = selectedIds.includes(cat.id);
      const paddingLeft = `${level * 1.5}rem`;

      return (
        <div key={cat.id}>
          <button
            type="button"
            onClick={() => handleCategorySelect(cat.id)}
            disabled={isSelected}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
              isSelected ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ paddingLeft }}
          >
            {cat.name}
            {isSelected && <span className="ml-2 text-xs text-muted-foreground">(selected)</span>}
          </button>
          {cat.children && cat.children.length > 0 && renderCategoryTree(cat.children, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className={className}>
      {/* Selected categories as chips */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedCategories.map((cat) => (
            <div
              key={cat.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm"
            >
              <span>{cat.name}</span>
              <button
                type="button"
                onClick={() => handleCategoryRemove(cat.id)}
                className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${cat.name}`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder="Search and select categories..."
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Dropdown */}
        {isOpen && filteredCategories.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {searchTerm.length === 0
              ? renderCategoryTree(filteredCategories)
              : flatCategories
                  .filter((cat: any) =>
                    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((cat: any) => {
                    const isSelected = selectedIds.includes(cat.id);
                    const paddingLeft = `${cat.level * 1.5 + 0.75}rem`;
                    const indent = '  '.repeat(cat.level);

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(cat.id)}
                        disabled={isSelected}
                        className={`w-full text-left py-2 text-sm hover:bg-accent transition-colors ${
                          isSelected ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        style={{ paddingLeft }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {cat.level > 0 && <span className="text-muted-foreground mr-1">└</span>}
                            {cat.name}
                            {isSelected && (
                              <span className="ml-2 text-xs text-muted-foreground">(selected)</span>
                            )}
                          </span>
                          {cat.level > 0 && (
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {cat.path}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
          </div>
        )}

        {isOpen && filteredCategories.length === 0 && searchTerm.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center"
          >
            No categories found
          </div>
        )}
      </div>
    </div>
  );
}
