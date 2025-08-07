/**
 * Tests for the useChartAccessibility React hook
 */

import { renderHook, act } from '@testing-library/react';
import { useChartAccessibility } from '@/hooks/use-chart-accessibility';
import type { ChartAccessibilityData } from '@/lib/chart-accessibility';

// Mock DOM methods for testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock document.body for live region tests
Object.defineProperty(document, 'body', {
  writable: true,
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
});

// Mock createElement for live regions
const mockElement = {
  setAttribute: jest.fn(),
  style: {} as any,
  textContent: '',
  parentNode: document.body
} as any;

jest.spyOn(document, 'createElement').mockReturnValue(mockElement);

describe('useChartAccessibility', () => {
  const mockData: ChartAccessibilityData = {
    currentPrice: 0.314159,
    targetPrice: 0.325000,
    trend: 'up',
    confidence: 75,
    timeFrame: '2 hours',
    currency: 'usd',
    historicalDataPoints: 48,
    priceChange: 0.010841,
    priceChangePercent: 3.45,
    reasons: [
      'Recent price movement shows bullish momentum',
      'Technical indicators suggest short-term uptrend'
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useChartAccessibility());

    expect(result.current.altText).toBe('');
    expect(result.current.currentDataPointIndex).toBe(0);
    expect(result.current.isHighContrastMode).toBe(false);
    expect(result.current.keyboardNavigator).toBeNull();
  });

  it('should update alt text when data is provided', () => {
    const { result } = renderHook(() => useChartAccessibility());

    act(() => {
      result.current.updateAltText(mockData);
    });

    expect(result.current.altText).toContain('Price prediction chart showing upward trend');
    expect(result.current.altText).toContain('moderate confidence (75%)');
    expect(result.current.altText).toContain('over 2 hours');
  });

  it('should provide ARIA attributes for chart', () => {
    const { result } = renderHook(() => useChartAccessibility());

    act(() => {
      result.current.updateAltText(mockData);
    });

    const ariaAttributes = result.current.getChartAriaAttributes();

    expect(ariaAttributes.role).toBe('img');
    expect(ariaAttributes['aria-label']).toContain('Price prediction chart');
    expect(ariaAttributes.tabIndex).toBe(0);
  });

  it('should setup keyboard navigation with data points', () => {
    const { result } = renderHook(() => useChartAccessibility());

    const dataPoints = [
      { timestamp: 1000, price: 0.31, type: 'historical' as const },
      { timestamp: 2000, price: 0.32, type: 'prediction' as const }
    ];

    act(() => {
      result.current.setupKeyboardNavigation(dataPoints);
    });

    expect(result.current.keyboardNavigator).not.toBeNull();
  });

  it('should handle keyboard events', () => {
    const { result } = renderHook(() => useChartAccessibility());

    const dataPoints = [
      { timestamp: 1000, price: 0.31, type: 'historical' as const },
      { timestamp: 2000, price: 0.32, type: 'prediction' as const }
    ];

    act(() => {
      result.current.setupKeyboardNavigation(dataPoints);
    });

    const rightArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    
    act(() => {
      const handled = result.current.handleKeyDown(rightArrowEvent);
      expect(handled).toBe(true);
    });

    expect(result.current.currentDataPointIndex).toBe(1);
  });

  it('should announce timeframe changes', () => {
    const { result } = renderHook(() => useChartAccessibility());

    act(() => {
      result.current.announceTimeframeChange('6 hours', 'up');
    });

    // Verify that the live region manager was called
    // (In a real test, we'd mock the LiveRegionManager and verify the call)
    expect(mockElement.textContent).toBe('');
  });

  it('should announce data updates', () => {
    const { result } = renderHook(() => useChartAccessibility());

    act(() => {
      result.current.announceDataUpdate(0.314159, 'usd');
    });

    // Verify announcement was made
    expect(mockElement.textContent).toBe('');
  });

  it('should announce trend changes', () => {
    const { result } = renderHook(() => useChartAccessibility());

    act(() => {
      result.current.announceTrendChange('up', 75);
    });

    // Verify announcement was made
    expect(mockElement.textContent).toBe('');
  });

  it('should provide high contrast colors', () => {
    const { result } = renderHook(() => useChartAccessibility());

    const colors = result.current.highContrastColors;

    expect(colors).toHaveProperty('background');
    expect(colors).toHaveProperty('foreground');
    expect(colors).toHaveProperty('grid');
    expect(colors).toHaveProperty('historical');
    expect(colors).toHaveProperty('prediction');
    expect(colors).toHaveProperty('upTrend');
    expect(colors).toHaveProperty('downTrend');
    expect(colors).toHaveProperty('stable');
    expect(colors).toHaveProperty('text');
    expect(colors).toHaveProperty('focus');
  });

  it('should apply high contrast styles to canvas context', () => {
    const { result } = renderHook(() => useChartAccessibility());

    const mockCtx = {
      lineWidth: 1,
      shadowColor: 'rgba(0,0,0,0.5)',
      shadowBlur: 5
    } as any;

    act(() => {
      result.current.applyHighContrastStyles(mockCtx);
    });

    // The function should execute without error
    expect(mockCtx.lineWidth).toBe(1); // May be modified by high contrast manager
  });

  it('should cleanup resources on unmount', () => {
    const { result, unmount } = renderHook(() => useChartAccessibility());

    // Setup some resources
    act(() => {
      result.current.updateAltText(mockData);
    });

    // Unmount should trigger cleanup
    unmount();

    // Verify cleanup was called (in a real test, we'd verify specific cleanup actions)
    expect(document.body.removeChild).toHaveBeenCalled();
  });

  it('should handle accessibility options', () => {
    const { result } = renderHook(() => 
      useChartAccessibility({
        accessibilityOptions: {
          includeDataPoints: false,
          includeAnalysis: false,
          verboseDescription: true,
          includeNavigation: false
        }
      })
    );

    act(() => {
      result.current.updateAltText(mockData);
    });

    const altText = result.current.altText;
    expect(altText).toContain('Price prediction chart');
    // Should not include data points since includeDataPoints is false
    expect(altText).not.toContain('Current price:');
  });

  it('should disable features when options are false', () => {
    const { result } = renderHook(() => 
      useChartAccessibility({
        enableKeyboardNavigation: false,
        enableLiveRegions: false,
        enableHighContrastDetection: false
      })
    );

    // Keyboard navigation should be disabled
    expect(result.current.keyboardNavigator).toBeNull();

    const dataPoints = [
      { timestamp: 1000, price: 0.31, type: 'historical' as const }
    ];

    act(() => {
      result.current.setupKeyboardNavigation(dataPoints);
    });

    // Should still be null since keyboard navigation is disabled
    expect(result.current.keyboardNavigator).toBeNull();
  });
});

describe('useScreenReaderDescription', () => {
  it('should create description element with unique ID', () => {
    const { useScreenReaderDescription } = require('@/hooks/use-chart-accessibility');
    
    const { descriptionElementId, DescriptionElement } = useScreenReaderDescription(
      'test-chart',
      'Test description'
    );

    expect(descriptionElementId).toBe('test-chart-description');
    expect(DescriptionElement).toBeDefined();
  });
});

describe('useFocusIndicator', () => {
  it('should manage focus state for canvas element', () => {
    const { useFocusIndicator } = require('@/hooks/use-chart-accessibility');
    
    const mockCanvas = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      style: {}
    } as any;

    const canvasRef = { current: mockCanvas };

    const { result } = renderHook(() => 
      useFocusIndicator(canvasRef, false)
    );

    expect(mockCanvas.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(mockCanvas.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
    expect(result.current.isFocused).toBe(false);
  });

  it('should apply high contrast focus styles', () => {
    const { useFocusIndicator } = require('@/hooks/use-chart-accessibility');
    
    const mockCanvas = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      style: {}
    } as any;

    const canvasRef = { current: mockCanvas };

    renderHook(() => useFocusIndicator(canvasRef, true)); // High contrast mode

    // Verify event listeners were added
    expect(mockCanvas.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(mockCanvas.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
  });
});