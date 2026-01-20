import { useEffect, useMemo, useCallback } from 'react';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Hook for persisting data across mobile browser sleep/wake cycles
 * Uses sessionStorage and visibilitychange events to prevent full re-fetches
 */
export function useSessionPersistence<T>(
  key: string,
  data: T | null,
  maxAgeMs: number = 30 * 60 * 1000 // Default: 30 minutes
): T | null {
  // Save data to sessionStorage when page becomes hidden
  useEffect(() => {
    if (data === null) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const cacheEntry: CachedData<T> = {
          data,
          timestamp: Date.now()
        };
        try {
          sessionStorage.setItem(key, JSON.stringify(cacheEntry));
        } catch (err) {
          // sessionStorage might be full or disabled
          console.warn('Failed to persist session data:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [key, data]);

  // Check for cached data on mount
  const cachedData = useMemo(() => {
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const { data: storedData, timestamp } = JSON.parse(cached) as CachedData<T>;
        if (Date.now() - timestamp < maxAgeMs) {
          return storedData;
        }
        // Remove stale data
        sessionStorage.removeItem(key);
      }
    } catch (err) {
      // Handle JSON parse errors or storage access issues
      console.warn('Failed to retrieve session data:', err);
    }
    return null;
  }, [key, maxAgeMs]);

  return cachedData;
}

/**
 * Hook to clear specific session cache
 */
export function useClearSessionCache(key: string) {
  return useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch (err) {
      console.warn('Failed to clear session cache:', err);
    }
  }, [key]);
}
