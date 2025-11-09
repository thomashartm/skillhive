import { describe, it, expect } from 'vitest';
import { Category } from '../Category';

describe('Category Entity', () => {
  it('should create a category instance', () => {
    const category = new Category();
    expect(category).toBeDefined();
    expect(category).toBeInstanceOf(Category);
  });

  it('should have required properties', () => {
    const category = new Category();
    
    category.id = 'test-id';
    category.disciplineId = 'discipline-id';
    category.name = 'Test Category';
    category.slug = 'test-category';
    category.parentId = null;
    category.description = 'Test description';
    category.ord = 1;
    
    expect(category.id).toBe('test-id');
    expect(category.disciplineId).toBe('discipline-id');
    expect(category.name).toBe('Test Category');
    expect(category.slug).toBe('test-category');
    expect(category.parentId).toBeNull();
    expect(category.description).toBe('Test description');
    expect(category.ord).toBe(1);
  });

  it('should support hierarchical structure with parent-child relationships', () => {
    const parent = new Category();
    parent.id = 'parent-id';
    parent.name = 'Parent Category';
    parent.slug = 'parent';
    parent.disciplineId = 'discipline-id';
    parent.parentId = null;
    parent.ord = 0;

    const child = new Category();
    child.id = 'child-id';
    child.name = 'Child Category';
    child.slug = 'child';
    child.disciplineId = 'discipline-id';
    child.parentId = 'parent-id';
    child.ord = 0;
    child.parent = parent;

    expect(child.parent).toBe(parent);
    expect(child.parentId).toBe('parent-id');
  });
});

