/**
 * Hook for managing contact filter state.
 * Handles search, tag filters, and source filters.
 */
import { useState, useCallback } from 'react';
import type { ContactFilter } from '../types';

export function useContactFilters() {
  const [filters, setFilters] = useState<ContactFilter>({
    search: '',
    tag: [],
    source: [],
  });

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const setTags = useCallback((tag: string[]) => {
    setFilters(prev => ({ ...prev, tag }));
  }, []);

  const setSources = useCallback((source: string[]) => {
    setFilters(prev => ({ ...prev, source }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: '', tag: [], source: [] });
  }, []);

  return {
    filters,
    setSearch,
    setTags,
    setSources,
    clearFilters,
  };
}

