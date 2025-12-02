'use client';

import { useState, useEffect, useRef } from 'react';
import { generateSlug } from '@trainhive/shared';
import { apiClient, getErrorMessage } from '@/lib/backend';

interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string | null;
}

interface TagAutocompleteProps {
  disciplineId: number;
  selectedIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  className?: string;
}

export function TagAutocomplete({
  disciplineId,
  selectedIds,
  onSelectionChange,
  className = '',
}: TagAutocompleteProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        // Use API client to fetch tags
        const data = await apiClient.tags.list({ disciplineId });
        setTags(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load tags:', error);
        setTags([]);
      }
    };

    fetchTags();
  }, [disciplineId]);

  // Update filtered tags based on search term
  useEffect(() => {
    if (searchTerm.length === 0) {
      setFilteredTags([]);
    } else {
      const filtered = tags.filter(
        (tag) =>
          tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !selectedIds.includes(tag.id)
      );
      setFilteredTags(filtered);
    }
  }, [searchTerm, tags, selectedIds]);

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

  const handleTagSelect = (tagId: number) => {
    if (!selectedIds.includes(tagId)) {
      onSelectionChange([...selectedIds, tagId]);
    }
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleTagRemove = (tagId: number) => {
    onSelectionChange(selectedIds.filter((id) => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!searchTerm.trim() || isCreating) return;

    // Check if tag already exists
    const existingTag = tags.find(
      (tag) => tag.name.toLowerCase() === searchTerm.trim().toLowerCase()
    );

    if (existingTag) {
      handleTagSelect(existingTag.id);
      return;
    }

    setIsCreating(true);

    try {
      const slug = generateSlug(searchTerm.trim());

      // Use API client to create tag
      const newTag = await apiClient.tags.create({
        disciplineId,
        name: searchTerm.trim(),
        slug,
        description: undefined,
        color: undefined,
      });

      setTags([...tags, newTag]);
      onSelectionChange([...selectedIds, newTag.id]);
      setSearchTerm('');
      setIsOpen(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error creating tag:', error);
      alert(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // If there's a filtered tag, select the first one
      if (filteredTags.length > 0) {
        handleTagSelect(filteredTags[0].id);
      } else if (searchTerm.trim()) {
        // Otherwise, create a new tag
        handleCreateTag();
      }
    }
  };

  const selectedTags = selectedIds
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined);

  const showCreateOption =
    searchTerm.trim().length > 0 &&
    !tags.some((tag) => tag.name.toLowerCase() === searchTerm.trim().toLowerCase());

  return (
    <div className={className}>
      {/* Selected tags as chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
              style={{
                backgroundColor: tag.color || '#3b82f6',
                color: '#ffffff',
              }}
            >
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => handleTagRemove(tag.id)}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${tag.name}`}
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
          onKeyDown={handleKeyDown}
          placeholder="Type to search or create tags..."
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isCreating}
        />

        {/* Dropdown */}
        {isOpen && (filteredTags.length > 0 || showCreateOption) && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {/* Existing tags */}
            {filteredTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagSelect(tag.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                {tag.color && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
                <span>{tag.name}</span>
              </button>
            ))}

            {/* Create new tag option */}
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={isCreating}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-t border-border flex items-center gap-2 text-primary font-medium"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>
                  {isCreating ? 'Creating...' : `Create "${searchTerm.trim()}"`}
                </span>
              </button>
            )}
          </div>
        )}

        {isOpen &&
          filteredTags.length === 0 &&
          !showCreateOption &&
          searchTerm.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center"
            >
              No tags found
            </div>
          )}
      </div>
    </div>
  );
}
