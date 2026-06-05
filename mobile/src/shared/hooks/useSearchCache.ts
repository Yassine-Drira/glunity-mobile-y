import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSearchCache(storageKey: string) {
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  // Load queries on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const val = await AsyncStorage.getItem(storageKey);
        if (val && mounted) {
          setRecentQueries(JSON.parse(val));
        }
      } catch (e) {
        console.error('Failed to load search cache', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  // Add query to cache (maximum 5 items, unique, most recent first)
  const addQuery = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const filtered = recentQueries.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      setRecentQueries(updated);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save search query', e);
    }
  }, [recentQueries, storageKey]);

  // Remove query from cache
  const removeQuery = useCallback(async (query: string) => {
    try {
      const updated = recentQueries.filter((q) => q !== query);
      setRecentQueries(updated);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove search query', e);
    }
  }, [recentQueries, storageKey]);

  // Get matching suggestions
  const getSuggestions = useCallback((input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return recentQueries;
    return recentQueries.filter((q) => q.toLowerCase().includes(trimmed));
  }, [recentQueries]);

  return {
    recentQueries,
    addQuery,
    removeQuery,
    getSuggestions,
  };
}
