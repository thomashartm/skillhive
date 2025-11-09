import { describe, it, expect } from 'vitest';
import { Technique } from '../Technique';

describe('Technique Entity', () => {
  it('should create a technique instance', () => {
    const technique = new Technique();
    expect(technique).toBeDefined();
    expect(technique).toBeInstanceOf(Technique);
  });

  it('should have required properties', () => {
    const technique = new Technique();
    
    technique.id = 'test-id';
    technique.disciplineId = 'discipline-id';
    technique.name = 'Test Technique';
    technique.slug = 'test-technique';
    technique.description = 'Test description';
    technique.taxonomy = { position: 'guard', type: 'sweep' };
    
    expect(technique.id).toBe('test-id');
    expect(technique.disciplineId).toBe('discipline-id');
    expect(technique.name).toBe('Test Technique');
    expect(technique.slug).toBe('test-technique');
    expect(technique.description).toBe('Test description');
    expect(technique.taxonomy).toEqual({ position: 'guard', type: 'sweep' });
  });

  it('should support nullable description and taxonomy', () => {
    const technique = new Technique();
    technique.id = 'test-id';
    technique.disciplineId = 'discipline-id';
    technique.name = 'Test Technique';
    technique.slug = 'test-technique';
    technique.description = null;
    technique.taxonomy = null;
    
    expect(technique.description).toBeNull();
    expect(technique.taxonomy).toBeNull();
  });
});

