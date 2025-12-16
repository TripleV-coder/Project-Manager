'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for API requests with caching, debounce, and retry
 */
export function useOptimizedQuery(fetchFn, options = {}) {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes
    retry = 3,
    retryDelay = 1000,
    debounce = 0,
    enabled = true
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const fetchData = useCallback(async (params = {}) => {
    if (!enabled) return;

    // Generate cache key
    const cacheKey = JSON.stringify(params);

    // Check cache
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data);
      setLoading(false);
      return cached.data;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    let lastError;

    // Retry logic
    for (let attempt = 0; attempt < retry; attempt++) {
      try {
        const result = await fetchFn(params, {
          signal: abortControllerRef.current.signal
        });

        // Cache result
        cacheRef.current.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });

        setData(result);
        setLoading(false);
        return result;
      } catch (err) {
        if (err.name === 'AbortError') {
          return; // Request aborted
        }

        lastError = err;

        // Wait before retrying
        if (attempt < retry - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, retryDelay * (attempt + 1))
          );
        }
      }
    }

    // All attempts failed
    setError(lastError);
    setLoading(false);
    throw lastError;
  }, [fetchFn, enabled, cacheTime, retry, retryDelay]);

  const debouncedFetch = useCallback((...args) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchData(...args);
    }, debounce);
  }, [fetchData, debounce]);

  const refetch = useCallback(() => {
    cacheRef.current.clear();
    return fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    data,
    loading,
    error,
    refetch,
    fetch: debounce > 0 ? debouncedFetch : fetchData
  };
}

/**
 * Example usage:
 * 
 * function ProjectsList() {
 *   const { data, loading, error, refetch } = useOptimizedQuery(
 *     async (params, { signal }) => {
 *       const res = await fetch(`/api/projects?${new URLSearchParams(params)}`, { signal });
 *       return res.json();
 *     },
 *     {
 *       cacheTime: 5 * 60 * 1000,
 *       retry: 3,
 *       debounce: 300
 *     }
 *   );
 *
 *   if (loading) return <div>Chargement...</div>;
 *   if (error) return <div>Erreur: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {data?.data?.map(project => (
 *         <div key={project._id}>{project.nom}</div>
 *       ))}
 *       <button onClick={refetch}>Rafraîchir</button>
 *     </div>
 *   );
 * }
 */
