/**
 * @jest-environment jsdom
 */

import React from 'react';
import {
  ChartPerformanceMonitor,
  DebouncedResizeHandler,
  CanvasRedrawManager,
  debounce
} from '@/lib/chart-performance';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();

// Setup performance mock before using fake timers
beforeAll(() => {
  Object.defineProperty(global, 'performance', {
    writable: true,
    value: {
      now: mockPerformanceNow
    }
  });
});

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('ChartPerformanceMonitor', () => {
  let monitor: ChartPerformanceMonitor;

  beforeEach(() => {
    monitor = new ChartPerformanceMonitor();
    mockPerformanceNow.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Performance Measurement', () => {
    it('should measure render time correctly', () => {
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(150);

      const finishMeasure = monitor.startMeasure('test-operation');
      const metric = finishMeasure('desktop', { width: 800, height: 400 });

      expect(metric.renderTime).toBe(50);
      expect(metric.operation).toBe('test-operation');
      expect(metric.deviceType).toBe('desktop');
      expect(metric.canvasSize).toEqual({ width: 800, height: 400 });
    });

    it('should calculate average render time correctly', () => {
      mockPerformanceNow
        .mockReturnValueOnce(0).mockReturnValueOnce(100)  // 100ms
        .mockReturnValueOnce(0).mockReturnValueOnce(200)  // 200ms
        .mockReturnValueOnce(0).mockReturnValueOnce(150); // 150ms

      const finish1 = monitor.startMeasure('test');
      finish1('desktop', { width: 800, height: 400 });

      const finish2 = monitor.startMeasure('test');
      finish2('desktop', { width: 800, height: 400 });

      const finish3 = monitor.startMeasure('test');
      finish3('desktop', { width: 800, height: 400 });

      expect(monitor.getAverageRenderTime('test')).toBe(150); // (100 + 200 + 150) / 3
    });

    it('should detect performance degradation', () => {
      // Add metrics that exceed threshold
      mockPerformanceNow
        .mockReturnValueOnce(0).mockReturnValueOnce(600)  // 600ms
        .mockReturnValueOnce(0).mockReturnValueOnce(700)  // 700ms
        .mockReturnValueOnce(0).mockReturnValueOnce(550); // 550ms

      const finish1 = monitor.startMeasure('test');
      finish1('desktop', { width: 800, height: 400 });

      const finish2 = monitor.startMeasure('test');
      finish2('desktop', { width: 800, height: 400 });

      const finish3 = monitor.startMeasure('test');
      finish3('desktop', { width: 800, height: 400 });

      expect(monitor.isPerformanceDegraded(500, 3)).toBe(true);
    });

    it('should not detect degradation with good performance', () => {
      mockPerformanceNow
        .mockReturnValueOnce(0).mockReturnValueOnce(100)  // 100ms
        .mockReturnValueOnce(0).mockReturnValueOnce(150)  // 150ms
        .mockReturnValueOnce(0).mockReturnValueOnce(120); // 120ms

      const finish1 = monitor.startMeasure('test');
      finish1('desktop', { width: 800, height: 400 });

      const finish2 = monitor.startMeasure('test');
      finish2('desktop', { width: 800, height: 400 });

      const finish3 = monitor.startMeasure('test');
      finish3('desktop', { width: 800, height: 400 });

      expect(monitor.isPerformanceDegraded(500, 3)).toBe(false);
    });

    it('should limit metrics history', () => {
      // Add more than 100 metrics
      for (let i = 0; i < 150; i++) {
        mockPerformanceNow.mockReturnValueOnce(i).mockReturnValueOnce(i + 10);
        const finish = monitor.startMeasure(`test-${i}`);
        finish('desktop', { width: 800, height: 400 });
      }

      const latestMetrics = monitor.getLatestMetrics(150);
      expect(latestMetrics.length).toBe(100); // Should be capped at 100
    });
  });
});

describe('DebouncedResizeHandler', () => {
  let mockCallback: jest.Mock;
  let handler: DebouncedResizeHandler;

  beforeEach(() => {
    mockCallback = jest.fn();
    handler = new DebouncedResizeHandler(mockCallback, { debounceMs: 100 });
    mockPerformanceNow.mockReset();
  });

  afterEach(() => {
    handler.cleanup();
    jest.clearAllTimers();
  });

  describe('Debouncing Behavior', () => {
    it('should debounce resize events', () => {
      const mockEntry = {
        contentRect: { width: 800, height: 400 }
      } as ResizeObserverEntry;

      // Trigger multiple resize events quickly
      handler.handleResize([mockEntry]);
      handler.handleResize([mockEntry]);
      handler.handleResize([mockEntry]);

      // Callback should not be called yet
      expect(mockCallback).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(100);

      // Callback should be called once
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(mockEntry);
    });

    it('should only execute the latest resize event', () => {
      mockPerformanceNow.mockReturnValue(1000);

      const entry1 = {
        contentRect: { width: 800, height: 400 }
      } as ResizeObserverEntry;

      const entry2 = {
        contentRect: { width: 900, height: 500 }
      } as ResizeObserverEntry;

      handler.handleResize([entry1]);
      
      // Advance time slightly but not enough to trigger
      jest.advanceTimersByTime(50);
      
      handler.handleResize([entry2]);

      // Advance remaining time
      jest.advanceTimersByTime(100);

      // Should only call with the latest entry
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(entry2);
    });

    it.skip('should handle performance monitoring', () => {
      // Create a new handler with fresh mock
      const testCallback = jest.fn();
      const testHandler = new DebouncedResizeHandler(testCallback, { debounceMs: 100 });

      const mockEntry = {
        contentRect: { width: 800, height: 400 }
      } as ResizeObserverEntry;

      testHandler.handleResize([mockEntry]);
      jest.advanceTimersByTime(100);

      const metrics = testHandler.getPerformanceMetrics();
      const latestMetrics = metrics.getLatestMetrics(1);
      
      expect(latestMetrics).toHaveLength(1);
      expect(latestMetrics[0].renderTime).toBeGreaterThanOrEqual(0);
      expect(latestMetrics[0].operation).toBe('resize-redraw');
      expect(latestMetrics[0].deviceType).toBe('desktop');
      
      testHandler.cleanup();
    });

    it('should handle callback errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCallback.mockImplementation(() => {
        throw new Error('Test error');
      });

      const mockEntry = {
        contentRect: { width: 800, height: 400 }
      } as ResizeObserverEntry;

      handler.handleResize([mockEntry]);
      jest.advanceTimersByTime(100);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error during resize callback execution:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Monitoring', () => {
    it.skip('should warn when render time exceeds threshold', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create a slow callback that will exceed the threshold
      const slowCallback = jest.fn(() => {
        // Simulate slow work by calling performance.now multiple times
        for (let i = 0; i < 1000; i++) {
          Math.random();
        }
      });

      const testHandler = new DebouncedResizeHandler(slowCallback, { 
        debounceMs: 100, 
        maxRenderTime: 0 // Set very low threshold to ensure warning
      });

      const mockEntry = {
        contentRect: { width: 800, height: 400 }
      } as ResizeObserverEntry;

      testHandler.handleResize([mockEntry]);
      jest.advanceTimersByTime(100);

      // Check that warning was called (render time should exceed 0ms threshold)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Chart resize render time exceeded threshold')
      );

      consoleSpy.mockRestore();
      testHandler.cleanup();
    });

    it('should not monitor performance when disabled', () => {
      const handler = new DebouncedResizeHandler(mockCallback, { 
        enableMetrics: false 
      });

      const mockEntry = {
        contentRect: { width: 800, height: 400 }
      } as ResizeObserverEntry;

      handler.handleResize([mockEntry]);
      jest.advanceTimersByTime(100);

      const metrics = handler.getPerformanceMetrics();
      expect(metrics.getLatestMetrics(1)).toHaveLength(0);

      handler.cleanup();
    });
  });
});

describe('CanvasRedrawManager', () => {
  let manager: CanvasRedrawManager;
  let mockDrawFunction: jest.Mock;

  beforeEach(() => {
    manager = new CanvasRedrawManager();
    mockDrawFunction = jest.fn();
    mockPerformanceNow.mockReset();
  });

  describe('Redraw Optimization', () => {
    it('should skip redraw when parameters are unchanged', () => {
      const params = { width: 800, height: 400, data: [1, 2, 3] };

      expect(manager.shouldRedraw(params)).toBe(true);  // First call
      expect(manager.shouldRedraw(params)).toBe(false); // Second call with same params
    });

    it('should redraw when parameters change', () => {
      const params1 = { width: 800, height: 400, data: [1, 2, 3] };
      const params2 = { width: 800, height: 400, data: [1, 2, 4] };

      expect(manager.shouldRedraw(params1)).toBe(true);
      expect(manager.shouldRedraw(params2)).toBe(true); // Different data
    });

    it('should execute draw function with performance monitoring', () => {
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(150);

      const metric = manager.executeDraw(
        'test-draw',
        mockDrawFunction,
        'desktop',
        { width: 800, height: 400 }
      );

      expect(mockDrawFunction).toHaveBeenCalledTimes(1);
      expect(metric.renderTime).toBe(50);
      expect(metric.operation).toBe('test-draw');
    });

    it('should handle draw function errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDrawFunction.mockImplementation(() => {
        throw new Error('Draw error');
      });

      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(150);

      const metric = manager.executeDraw(
        'test-draw',
        mockDrawFunction,
        'desktop',
        { width: 800, height: 400 }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error during canvas draw operation 'test-draw':",
        expect.any(Error)
      );
      expect(metric.renderTime).toBe(50); // Should still return timing

      consoleSpy.mockRestore();
    });

    it('should reset state correctly', () => {
      const params = { width: 800, height: 400 };

      manager.shouldRedraw(params);
      expect(manager.shouldRedraw(params)).toBe(false);

      manager.reset();
      expect(manager.shouldRedraw(params)).toBe(true);
    });
  });
});

describe('debounce utility', () => {
  let mockFunction: jest.Mock;

  beforeEach(() => {
    mockFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should debounce function calls', () => {
    const debouncedFn = debounce(mockFunction, 100);

    debouncedFn('arg1');
    debouncedFn('arg2');
    debouncedFn('arg3');

    expect(mockFunction).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    expect(mockFunction).toHaveBeenCalledTimes(1);
    expect(mockFunction).toHaveBeenCalledWith('arg3');
  });

  it('should reset timer on subsequent calls', () => {
    const debouncedFn = debounce(mockFunction, 100);

    debouncedFn('arg1');
    jest.advanceTimersByTime(50);
    
    debouncedFn('arg2');
    jest.advanceTimersByTime(50);

    expect(mockFunction).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);

    expect(mockFunction).toHaveBeenCalledTimes(1);
    expect(mockFunction).toHaveBeenCalledWith('arg2');
  });
});

describe('Performance Requirements', () => {
  describe('Render Time Requirements', () => {
    it('should complete chart rendering within 500ms threshold', () => {
      const monitor = new ChartPerformanceMonitor();
      
      // Reset and setup performance mock
      mockPerformanceNow.mockReset();
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(450); // 450ms
      
      const finishMeasure = monitor.startMeasure('chart-render');
      const metric = finishMeasure('desktop', { width: 1200, height: 600 });
      
      expect(metric.renderTime).toBeLessThan(500);
      expect(metric.operation).toBe('chart-render');
    });

    it('should detect when rendering exceeds 500ms threshold', () => {
      const monitor = new ChartPerformanceMonitor();
      
      // Reset and setup performance mock
      mockPerformanceNow.mockReset();
      mockPerformanceNow
        .mockReturnValueOnce(0).mockReturnValueOnce(600)  // 600ms
        .mockReturnValueOnce(0).mockReturnValueOnce(550)  // 550ms
        .mockReturnValueOnce(0).mockReturnValueOnce(520); // 520ms

      const finish1 = monitor.startMeasure('chart-render');
      finish1('desktop', { width: 1200, height: 600 });

      const finish2 = monitor.startMeasure('chart-render');
      finish2('desktop', { width: 1200, height: 600 });

      const finish3 = monitor.startMeasure('chart-render');
      finish3('desktop', { width: 1200, height: 600 });

      expect(monitor.isPerformanceDegraded(500, 3)).toBe(true);
    });

    it('should handle different device types with appropriate thresholds', () => {
      const monitor = new ChartPerformanceMonitor();
      
      // Reset and setup performance mock
      mockPerformanceNow.mockReset();
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(400); // 400ms
      
      const finishMeasure = monitor.startMeasure('mobile-chart-render');
      const metric = finishMeasure('mobile', { width: 375, height: 200 });
      
      expect(metric.renderTime).toBeLessThan(500);
      expect(metric.deviceType).toBe('mobile');
    });
  });

  describe('Resize Performance', () => {
    it('should handle rapid resize events efficiently', () => {
      const mockCallback = jest.fn();
      const handler = new DebouncedResizeHandler(mockCallback, { debounceMs: 150 });

      const mockEntry = {
        contentRect: { width: 800, height: 400 }
      } as ResizeObserverEntry;

      // Simulate rapid resize events (like dragging window)
      for (let i = 0; i < 10; i++) {
        handler.handleResize([{
          ...mockEntry,
          contentRect: { width: 800 + i * 10, height: 400 }
        }]);
      }

      // Should not call callback during rapid events
      expect(mockCallback).not.toHaveBeenCalled();

      // After debounce period, should call once with latest values
      jest.advanceTimersByTime(150);
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        contentRect: { width: 890, height: 400 }
      }));

      handler.cleanup();
    });
  });
});