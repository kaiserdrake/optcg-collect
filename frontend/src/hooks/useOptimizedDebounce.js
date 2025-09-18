import { useCallback, useEffect, useRef } from 'react';

/**
 * Advanced debounce hook with intelligent delay adjustment and request cancellation
 * Provides better UX by using shorter delays for additions and longer delays for deletions
 */
export const useOptimizedDebounce = (callback, baseDelay = 300) => {
  const timeoutRef = useRef(null);
  const lastValueRef = useRef('');
  const lastCallTimeRef = useRef(0);

  const debouncedCallback = useCallback((value, options = {}) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;
    const lastValue = lastValueRef.current;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Determine optimal delay based on user action
    let delay = baseDelay;

    if (typeof value === 'string' && typeof lastValue === 'string') {
      const isAddition = value.length > lastValue.length;
      const isDeletion = value.length < lastValue.length;
      const isRapidTyping = timeSinceLastCall < 100;

      if (isRapidTyping) {
        // During rapid typing/deletion, use longer delays to reduce API calls
        delay = isDeletion ? baseDelay * 2 : baseDelay * 1.5;
      } else if (isDeletion) {
        // Single character deletions can use longer delay
        delay = baseDelay * 1.3;
      } else if (isAddition) {
        // Character additions can be slightly faster
        delay = baseDelay * 0.8;
      }
    }

    // Apply minimum delay for very rapid calls
    if (timeSinceLastCall < 50) {
      delay = Math.max(delay, 600);
    }

    // Store current state
    lastValueRef.current = value;
    lastCallTimeRef.current = now;

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback(value, options);
    }, delay);
  }, [callback, baseDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Immediate execution method (bypasses debounce)
  const executeImmediately = useCallback((value, options = {}) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    callback(value, options);
  }, [callback]);

  // Cancel pending execution
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    debouncedCallback,
    executeImmediately,
    cancel
  };
};

/**
 * Hook for search-specific debouncing with request cancellation
 */
export const useSearchDebounce = (searchFunction, delay = 400) => {
  const abortControllerRef = useRef(null);
  const lastSearchRef = useRef('');

  const { debouncedCallback, cancel } = useOptimizedDebounce(
    async (searchTerm, options = {}) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Skip duplicate searches
      if (searchTerm === lastSearchRef.current && !options.force) {
        return;
      }

      lastSearchRef.current = searchTerm;

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        await searchFunction(searchTerm, {
          ...options,
          signal: abortControllerRef.current.signal
        });
      } catch (error) {
        // Don't log aborted requests as errors
        if (error.name !== 'AbortError') {
          console.error('Search error:', error);
        }
      }
    },
    delay
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    debouncedSearch: debouncedCallback,
    cancelSearch: () => {
      cancel();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  };
};

/**
 * Hook for memoizing expensive computations with dependencies
 */
export const useStableMemo = (factory, deps) => {
  const ref = useRef();
  const depsRef = useRef(deps);

  // Deep comparison for complex objects
  const depsChanged = !depsRef.current ||
    deps.length !== depsRef.current.length ||
    deps.some((dep, index) => {
      const prevDep = depsRef.current[index];
      if (typeof dep === 'object' && dep !== null) {
        return JSON.stringify(dep) !== JSON.stringify(prevDep);
      }
      return dep !== prevDep;
    });

  if (depsChanged) {
    ref.current = factory();
    depsRef.current = deps;
  }

  return ref.current;
};

/**
 * Hook for performance monitoring in development
 */
export const usePerformanceMonitor = (componentName, enabled = process.env.NODE_ENV === 'development') => {
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current += 1;
    const currentTime = performance.now();
    const renderDuration = currentTime - lastRenderTime.current;

    if (renderDuration > 16.67) { // 60fps threshold
      console.warn(`[${componentName}] Slow render: ${renderDuration.toFixed(2)}ms (render #${renderCountRef.current})`);
    }

    lastRenderTime.current = currentTime;
  });

  const measureOperation = useCallback((operationName, operation) => {
    if (!enabled) return operation();

    const startTime = performance.now();
    const result = operation();
    const duration = performance.now() - startTime;

    if (duration > 10) {
      console.warn(`[${componentName}] Slow operation "${operationName}": ${duration.toFixed(2)}ms`);
    }

    return result;
  }, [componentName, enabled]);

  return { measureOperation, renderCount: renderCountRef.current };
};
