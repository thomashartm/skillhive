/**
 * Hook for fetching and managing lists of curricula
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, getErrorMessage } from '@/lib/backend';
import type { Curriculum } from '../types';

interface UseCurriculaListOptions {
  onlyMine?: boolean;
  isPublic?: boolean;
  autoFetch?: boolean;
}

interface UseCurriculaListReturn {
  curricula: Curriculum[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCurriculaList(options: UseCurriculaListOptions = {}): UseCurriculaListReturn {
  const { onlyMine = false, isPublic, autoFetch = true } = options;

  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurricula = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build filter parameters
      const filters: { onlyMine?: boolean; isPublic?: boolean } = {};
      if (onlyMine) filters.onlyMine = true;
      if (isPublic !== undefined) filters.isPublic = isPublic;

      // Use API client to fetch curricula
      const data = await apiClient.curricula.list(filters);
      setCurricula(data || []);
    } catch (err: any) {
      console.error('Error fetching curricula:', err);
      setError(getErrorMessage(err));
      setCurricula([]);
    } finally {
      setLoading(false);
    }
  }, [onlyMine, isPublic]);

  useEffect(() => {
    if (autoFetch) {
      fetchCurricula();
    }
  }, [autoFetch, fetchCurricula]);

  return {
    curricula,
    loading,
    error,
    refresh: fetchCurricula,
  };
}
