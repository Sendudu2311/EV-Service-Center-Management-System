import { useCallback, useRef } from 'react';

/**
 * Custom hook for debouncing and deduplicating API fetch calls
 * Prevents multiple concurrent calls and debounces rapid successive calls
 */
export const useDebouncedFetch = (delay: number = 500) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  const debouncedFetch = useCallback(
    (fetchFunction: () => Promise<void>, immediate: boolean = false) => {
      // If immediate flag is true, execute right away (for user actions)
      if (immediate) {
        // Still prevent concurrent calls
        if (isLoadingRef.current) {
          return;
        }

        isLoadingRef.current = true;
        return fetchFunction().finally(() => {
          isLoadingRef.current = false;
        });
      }

      // If already loading, don't start another request
      if (isLoadingRef.current) {
        return;
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for debounced execution
      timeoutRef.current = setTimeout(async () => {
        isLoadingRef.current = true;
        try {
          await fetchFunction();
        } finally {
          isLoadingRef.current = false;
        }
      }, delay);
    },
    [delay]
  );

  const clearDebounce = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isLoadingRef.current = false;
  }, []);

  const isLoading = useCallback(() => isLoadingRef.current, []);

  return {
    debouncedFetch,
    clearDebounce,
    isLoading
  };
};