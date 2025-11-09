import { describe, it, expect } from 'vitest';
import { TechniqueCategory } from '../TechniqueCategory';

describe('TechniqueCategory Entity', () => {
  it('should create a technique-category association instance', () => {
    const association = new TechniqueCategory();
    expect(association).toBeDefined();
    expect(association).toBeInstanceOf(TechniqueCategory);
  });

  it('should have required properties', () => {
    const association = new TechniqueCategory();
    
    association.techniqueId = 'technique-id';
    association.categoryId = 'category-id';
    association.primary = true;
    
    expect(association.techniqueId).toBe('technique-id');
    expect(association.categoryId).toBe('category-id');
    expect(association.primary).toBe(true);
  });

  it('should default primary to false', () => {
    const association = new TechniqueCategory();
    association.techniqueId = 'technique-id';
    association.categoryId = 'category-id';
    
    expect(association.primary).toBeFalsy();
  });
});

