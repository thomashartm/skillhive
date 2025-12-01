/**
 * Hook for managing curriculum elements (CRUD + reorder)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, getErrorMessage } from '@/lib/api';
import type { CurriculumElement, TechniqueMap, VideoMap, ElementKind } from '../types';

interface UseCurriculumElementsOptions {
  autoFetch?: boolean;
}

interface UseCurriculumElementsReturn {
  elements: CurriculumElement[];
  techniqueMap: TechniqueMap;
  videoMap: VideoMap;
  disciplineId: number | null;
  loading: boolean;
  error: string | null;
  addElement: (kind: ElementKind, data?: any) => Promise<void>;
  updateElement: (id: number, data: any) => Promise<void>;
  deleteElement: (id: number) => Promise<void>;
  reorderElements: (orderedIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCurriculumElements(
  curriculumId: number | string,
  options: UseCurriculumElementsOptions = {}
): UseCurriculumElementsReturn {
  const { autoFetch = true } = options;

  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disciplineId, setDisciplineId] = useState<number | null>(null);

  const id = typeof curriculumId === 'string' ? parseInt(curriculumId, 10) : curriculumId;

  // Build technique and asset maps from elements
  const { techniqueMap, videoMap } = useMemo(() => {
    const tmap: TechniqueMap = {};
    const vmap: VideoMap = {};
    let foundDisciplineId: number | null = null;

    elements.forEach((el: any) => {
      // Extract technique data if present
      if (el.technique) {
        tmap[el.technique.id] = el.technique;
        if (foundDisciplineId == null && typeof el.technique.disciplineId === 'number') {
          foundDisciplineId = el.technique.disciplineId;
        }
      }
      // Extract asset data if present
      if (el.asset) {
        vmap[el.asset.id] = el.asset;
      }
    });

    // Update disciplineId if found
    if (foundDisciplineId !== null && disciplineId === null) {
      setDisciplineId(foundDisciplineId);
    }

    return { techniqueMap: tmap, videoMap: vmap };
  }, [elements, disciplineId]);

  const fetchElements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use API client to fetch curriculum elements
      const data = await apiClient.curricula.elements.list(id);
      setElements(data || []);
    } catch (err: any) {
      console.error('Error fetching elements:', err);
      setError(getErrorMessage(err));
      setElements([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const addElement = useCallback(
    async (kind: ElementKind, data: any = {}) => {
      try {
        const payload: any = {
          type: kind,
          ...data,
        };

        // For text elements, provide default title if not provided
        if (kind === 'text' && !payload.title) {
          payload.title = 'Click to add instruction text...';
        }

        await apiClient.curricula.elements.add(id, payload);
        await fetchElements();
      } catch (err: any) {
        throw new Error(getErrorMessage(err));
      }
    },
    [id, fetchElements]
  );

  const updateElement = useCallback(
    async (elementId: number, data: any) => {
      try {
        await apiClient.curricula.elements.update(id, elementId, data);
        await fetchElements();
      } catch (err: any) {
        throw new Error(getErrorMessage(err));
      }
    },
    [id, fetchElements]
  );

  const deleteElement = useCallback(
    async (elementId: number) => {
      try {
        await apiClient.curricula.elements.delete(id, elementId);
        await fetchElements();
      } catch (err: any) {
        throw new Error(getErrorMessage(err));
      }
    },
    [id, fetchElements]
  );

  const reorderElements = useCallback(
    async (orderedIds: string[]) => {
      try {
        const elementIds = orderedIds.map((id) => parseInt(id, 10));
        await apiClient.curricula.elements.reorder(id, elementIds);
        await fetchElements();
      } catch (err: any) {
        throw new Error(getErrorMessage(err));
      }
    },
    [id, fetchElements]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchElements();
    }
  }, [autoFetch, fetchElements]);

  // Transform elements to match the CurriculumElement interface
  const transformedElements: CurriculumElement[] = useMemo(
    () =>
      elements.map((el) => ({
        id: String(el.id),
        ord: el.ord,
        kind: el.type as ElementKind,
        techniqueId: el.techniqueId ?? undefined,
        assetId: el.assetId ?? undefined,
        text: el.type === 'text' ? el.title || '' : undefined,
      })),
    [elements]
  );

  return {
    elements: transformedElements,
    techniqueMap,
    videoMap,
    disciplineId,
    loading,
    error,
    addElement,
    updateElement,
    deleteElement,
    reorderElements,
    refresh: fetchElements,
  };
}
