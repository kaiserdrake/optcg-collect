// hooks/usePerformance.js
import { useEffect, useRef } from 'react';

// Hook to measure component render performance
export const useRenderPerformance = (componentName) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = performance.now();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${componentName}] Render #${renderCount.current} at ${currentTime.toFixed(2)}ms`);

      if (lastRenderTime.current > 0) {
        const timeDiff = currentTime - lastRenderTime.current;
        if (timeDiff < 16.67) { // 60fps threshold
          console.log(`[${componentName}] Fast render: ${timeDiff.toFixed(2)}ms`);
        } else {
          console.warn(`[${componentName}] Slow render: ${timeDiff.toFixed(2)}ms`);
        }
      }

      lastRenderTime.current = currentTime;
    }
  });

  return { renderCount: renderCount.current };
};

// Hook to measure API call performance
export const useAPIPerformance = () => {
  const trackAPICall = (endpoint, startTime, endTime, success = true) => {
    const duration = endTime - startTime;

    if (process.env.NODE_ENV === 'development') {
      const status = success ? '✅' : '❌';
      console.log(`[API] ${status} ${endpoint}: ${duration.toFixed(2)}ms`);

      if (duration > 2000) {
        console.warn(`[API] Slow API call detected: ${endpoint} took ${duration.toFixed(2)}ms`);
      }
    }

    // You could send this data to an analytics service in production
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'api_call', {
        endpoint,
        duration: Math.round(duration),
        success
      });
    }
  };

  return { trackAPICall };
};

// Hook to detect memory leaks
export const useMemoryMonitor = (componentName) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize / 1048576; // Convert to MB
        const total = memory.totalJSHeapSize / 1048576;

        console.log(`[${componentName}] Memory: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB`);

        if (used > 100) { // Warn if using more than 100MB
          console.warn(`[${componentName}] High memory usage detected: ${used.toFixed(2)}MB`);
        }
      };

      const interval = setInterval(checkMemory, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [componentName]);
};

// Hook to measure web vitals
export const useWebVitals = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Measure Cumulative Layout Shift (CLS)
      let clsValue = 0;
      let clsEntries = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;

          const firstSessionEntry = clsEntries[0];
          const lastSessionEntry = clsEntries[clsEntries.length - 1];

          if (clsEntries.length === 0 ||
              entry.startTime - lastSessionEntry.startTime < 1000 ||
              entry.startTime - firstSessionEntry.startTime < 5000) {
            clsEntries.push(entry);
            clsValue += entry.value;
          } else {
            clsEntries = [entry];
            clsValue = entry.value;
          }
        }

        console.log('CLS:', clsValue);
      });

      observer.observe({ entryTypes: ['layout-shift'] });

      return () => observer.disconnect();
    }
  }, []);
};
