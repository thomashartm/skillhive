'use client';

import { useState, useEffect, useRef } from 'react';

interface Technique {
  id: number;
  name: string;
  slug: string;
}

interface TechniqueSearchAutocompleteProps {
  disciplineId: number;
  selectedTechnique: Technique | null;
  onSelect: (technique: Technique | null) => void;
  onCreateNew: (name: string) => void;
  className?: string;
}

export function TechniqueSearchAutocomplete({
  disciplineId,
  selectedTechnique,
  onSelect,
  onCreateNew,
  className = '',
}: TechniqueSearchAutocompleteProps) {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredTechniques, setFilteredTechniques] = useState<Technique[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch techniques
  useEffect(() => {
    const fetchTechniques = async () => {
      try {
        const response = await fetch(`/api/v1/techniques?disciplineId=${disciplineId}`);
        const data = await response.json();
        setTechniques(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load techniques:', error);
        setTechniques([]);
      }
    };

    if (disciplineId) {
      fetchTechniques();
    }
  }, [disciplineId]);

  // Update filtered techniques based on search term
  useEffect(() => {
    if (searchTerm.length === 0) {
      setFilteredTechniques([]);
    } else {
      const filtered = techniques.filter((technique) =>
        technique.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTechniques(filtered);
    }
  }, [searchTerm, techniques]);

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
    // Clear selection when typing
    if (selectedTechnique) {
      onSelect(null);
    }
  };

  const handleTechniqueSelect = (technique: Technique) => {
    onSelect(technique);
    setSearchTerm(technique.name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleCreateNew = () => {
    const name = searchTerm.trim();
    if (name) {
      onCreateNew(name);
      setSearchTerm(name);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // If there's a filtered technique, select the first one
      if (filteredTechniques.length > 0) {
        handleTechniqueSelect(filteredTechniques[0]);
      } else if (searchTerm.trim()) {
        // Otherwise, create a new technique
        handleCreateNew();
      }
    }
  };

  const showCreateOption = searchTerm.trim().length > 0;
  const showResults = isOpen && (filteredTechniques.length > 0 || showCreateOption);

  return (
    <div className={className}>
      {/* Selected technique display */}
      {selectedTechnique && (
        <div className="mb-2 inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">
          <span>{selectedTechnique.name}</span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setSearchTerm('');
              inputRef.current?.focus();
            }}
            className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${selectedTechnique.name}`}
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
          placeholder="Search techniques or create new..."
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Dropdown */}
        {showResults && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {/* Create new option - always first if search term exists */}
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b border-border flex items-center gap-2 text-primary font-medium"
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
                <span>Create new: &quot;{searchTerm.trim()}&quot;</span>
              </button>
            )}

            {/* Existing techniques */}
            {filteredTechniques.map((technique) => (
              <button
                key={technique.id}
                type="button"
                onClick={() => handleTechniqueSelect(technique)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                {technique.name}
              </button>
            ))}

            {filteredTechniques.length === 0 && !showCreateOption && (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No techniques found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
