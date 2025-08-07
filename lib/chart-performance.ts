/**
 * Chart Performance Utilities
 * 
 * This module provides utilities for performance monitoring and optimization
 * of chart rendering operations, including debounced resize handling and
 * rendering time measurement.
 */

export interface PerformanceMetrics {
  renderTime: number;
  timestamp: number;
  operation: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  canvasSize: { width: number; height: number };
}

export interface ResizeHandlerOptions {
  debounceMs?: number;
  maxRenderTime?: number;
  enableMetrics?: boolean;
}

/**
 * Performance monitoring class for chart operations
 */
export class ChartPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100;

  /**
   * Start measuring a chart operation
   */
  startMeasure(operation: string): (
    deviceType: 'mobile' | 'tablet' | 'desktop',
    canvasSize: { width: number; height: number }
  ) => PerformanceMetrics {
    const startTime = performance.now();
    
    return (deviceType: 'mobile' | 'tablet' | 'desktop', canvasSize: { width: number; height: number }): PerformanceMetrics => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      const metric: PerformanceMetrics = {
        renderTime,
        timestamp: Date.now(),
        operation,
        deviceType,
        canvasSize
      };
      
      this.addMetric(metric);
      return metric;
    };
  }

  /**
   * Add a performance metric to the history
   */
  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Get average render time for a specific operation
   */
  getAverageRenderTime(operation?: string): number {
    const relevantMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;
    
    if (relevantMetrics.length === 0) return 0;
    
    const totalTime = relevantMetrics.reduce((sum, metric) => sum + metric.renderTime, 0);
    return totalTime / relevantMetrics.length;
  }

  /**
   * Get the latest performance metrics
   */
  getLatestMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Check if recent render times exceed the threshold
   */
  isPerformanceDegraded(thresholdMs: number = 500, sampleSize: number = 5): boolean {
    const recentMetrics = this.getLatestMetrics(sampleSize);
    if (recentMetrics.length === 0) return false;
    
    const averageTime = recentMetrics.reduce((sum, metric) => sum + metric.renderTime, 0) / recentMetrics.length;
    return averageTime > thresholdMs;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Debounced resize handler for chart components
 */
export class DebouncedResizeHandler {
  private timeoutId: number | null = null;
  private lastResizeTime = 0;
  private performanceMonitor: ChartPerformanceMonitor;
  private options: Required<ResizeHandlerOptions>;

  constructor(
    private callback: (entry: ResizeObserverEntry) => void,
    options: ResizeHandlerOptions = {}
  ) {
    this.options = {
      debounceMs: 150,
      maxRenderTime: 500,
      enableMetrics: true,
      ...options
    };
    
    this.performanceMonitor = new ChartPerformanceMonitor();
  }

  /**
   * Handle resize event with debouncing
   */
  handleResize = (entries: ResizeObserverEntry[]): void => {
    const entry = entries[0];
    if (!entry) return;

    const now = performance.now();
    this.lastResizeTime = now;

    // Clear existing timeout
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    // Set new timeout
    this.timeoutId = window.setTimeout(() => {
      // Only execute if this is still the latest resize event
      if (now === this.lastResizeTime) {
        this.executeCallback(entry);
      }
    }, this.options.debounceMs);
  };

  /**
   * Execute the callback with performance monitoring
   */
  private executeCallback(entry: ResizeObserverEntry): void {
    if (!this.options.enableMetrics) {
      this.callback(entry);
      return;
    }

    const finishMeasure = this.performanceMonitor.startMeasure('resize-redraw');
    
    try {
      this.callback(entry);
      
      // Determine device type based on width
      const width = entry.contentRect.width;
      const deviceType = width <= 767 ? 'mobile' : width <= 1023 ? 'tablet' : 'desktop';
      
      const metric = finishMeasure(deviceType, {
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });

      // Log warning if render time exceeds threshold
      if (metric.renderTime > this.options.maxRenderTime) {
        console.warn(`Chart resize render time exceeded threshold: ${metric.renderTime.toFixed(2)}ms (max: ${this.options.maxRenderTime}ms)`);
      }
    } catch (error) {
      console.error('Error during resize callback execution:', error);
      finishMeasure('mobile', { width: 0, height: 0 }); // Fallback measurement
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): ChartPerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * Hook for using debounced resize handling in React components
 */
export function useResizeObserver(
  elementRef: React.RefObject<HTMLElement>,
  callback: (entry: ResizeObserverEntry) => void,
  options: ResizeHandlerOptions = {}
): ChartPerformanceMonitor | null {
  const [performanceMonitor, setPerformanceMonitor] = React.useState<ChartPerformanceMonitor | null>(null);
  const handlerRef = React.useRef<DebouncedResizeHandler | null>(null);
  const observerRef = React.useRef<ResizeObserver | null>(null);
  
  // Memoize the callback to prevent infinite re-renders
  const stableCallback = React.useCallback(callback, [callback]);
  
  // Memoize the options to prevent infinite re-renders
  const stableOptions = React.useMemo(() => options, [
    options.debounceMs,
    options.maxRenderTime,
    options.enableMetrics
  ]);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Create debounced handler
    handlerRef.current = new DebouncedResizeHandler(stableCallback, stableOptions);
    setPerformanceMonitor(handlerRef.current.getPerformanceMetrics());

    // Create ResizeObserver
    observerRef.current = new ResizeObserver(handlerRef.current.handleResize);
    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      
      if (handlerRef.current) {
        handlerRef.current.cleanup();
        handlerRef.current = null;
      }
    };
  }, [elementRef, stableCallback, stableOptions]);

  return performanceMonitor;
}

/**
 * Utility function to create a debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}

/**
 * Efficient canvas redraw strategy that only updates when necessary
 */
export class CanvasRedrawManager {
  private lastDrawParams: string | null = null;
  private performanceMonitor: ChartPerformanceMonitor;

  constructor() {
    this.performanceMonitor = new ChartPerformanceMonitor();
  }

  /**
   * Check if a redraw is necessary based on parameters
   */
  shouldRedraw(drawParams: unknown): boolean {
    const currentParamsHash = JSON.stringify(drawParams);
    
    if (this.lastDrawParams === currentParamsHash) {
      return false; // No changes, skip redraw
    }
    
    this.lastDrawParams = currentParamsHash;
    return true;
  }

  /**
   * Execute a canvas draw operation with performance monitoring
   */
  executeDraw(
    operation: string,
    drawFunction: () => void,
    deviceType: 'mobile' | 'tablet' | 'desktop',
    canvasSize: { width: number; height: number }
  ): PerformanceMetrics {
    const finishMeasure = this.performanceMonitor.startMeasure(operation);
    
    try {
      drawFunction();
    } catch (error) {
      console.error(`Error during canvas draw operation '${operation}':`, error);
    }
    
    return finishMeasure(deviceType, canvasSize);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): ChartPerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * Reset the redraw manager state
   */
  reset(): void {
    this.lastDrawParams = null;
  }
}

// Import React for the hook
import React from 'react';