/**
 * Hook for fetching and managing a single curriculum
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, getErrorMessage } from '@/lib/api';
import type { Curriculum } from '../types';

interface UseCurriculumDetailOptions {
  autoFetch?: boolean;
}

interface UseCurriculumDetailReturn {
  curriculum: Curriculum | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  update: (data: Partial<Curriculum>) => Promise<void>;
  deleteCurriculum: () => Promise<void>;
  togglePublic: () => Promise<void>;
}

export function useCurriculumDetail(
  id: number | string,
  options: UseCurriculumDetailOptions = {}
): UseCurriculumDetailReturn {
  const { autoFetch = true } = options;

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const curriculumId = typeof id === 'string' ? parseInt(id, 10) : id;

  const fetchCurriculum = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use API client to fetch curriculum by ID
      const data = await apiClient.curricula.getById(curriculumId);
      setCurriculum(data);
    } catch (err: any) {
      console.error('Error fetching curriculum:', err);
      setError(getErrorMessage(err));
      setCurriculum(null);
    } finally {
      setLoading(false);
    }
  }, [curriculumId]);

  const update = useCallback(
    async (data: Partial<Curriculum>) => {
      try {
        // Use API client to update curriculum
        await apiClient.curricula.update(curriculumId, data);
        await fetchCurriculum();
      } catch (err: any) {
        throw new Error(getErrorMessage(err));
      }
    },
    [curriculumId, fetchCurriculum]
  );

  const deleteCurriculum = useCallback(async () => {
    try {
      // Use API client to delete curriculum
      await apiClient.curricula.delete(curriculumId);
    } catch (err: any) {
      throw new Error(getErrorMessage(err));
    }
  }, [curriculumId]);

  const togglePublic = useCallback(async () => {
    if (!curriculum) return;

    try {
      // Use API client to toggle public status
      await apiClient.curricula.update(curriculumId, {
        isPublic: !curriculum.isPublic,
      });
      await fetchCurriculum();
    } catch (err: any) {
      throw new Error(getErrorMessage(err));
    }
  }, [curriculumId, curriculum, fetchCurriculum]);

  useEffect(() => {
    if (autoFetch) {
      fetchCurriculum();
    }
  }, [autoFetch, fetchCurriculum]);

  return {
    curriculum,
    loading,
    error,
    refresh: fetchCurriculum,
    update,
    deleteCurriculum,
    togglePublic,
  };
}
