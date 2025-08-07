/**
 * React hook for managing chart accessibility features
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  type ChartAccessibilityData,
  generateChartAltText,
  generateLiveAnnouncement,
  ChartKeyboardNavigator,
  HighContrastManager,
  LiveRegionManager,
  type AccessibilityOptions
} from '@/lib/chart-accessibility';

interface UseChartAccessibilityOptions {
  accessibilityOptions?: AccessibilityOptions;
  enableKeyboardNavigation?: boolean;
  enableLiveRegions?: boolean;
  enableHighContrastDetection?: boolean;
}

interface ChartAccessibilityHook {
  // Alt text generation
  altText: string;
  updateAltText: (data: ChartAccessibilityData) => void;
  
  // Keyboard navigation
  keyboardNavigator: ChartKeyboardNavigator | null;
  handleKeyDown: (event: KeyboardEvent) => boolean;
  currentDataPointIndex: number;
  
  // Live announcements
  announcePolite: (message: string) => void;
  announceAssertive: (message: string) => void;
  announceTimeframeChange: (timeframe: string, trend?: string) => void;
  announceDataUpdate: (currentPrice: number, currency: string) => void;
  announceTrendChange: (trend: 'up' | 'down' | 'stable', confidence: number) => void;
  
  // High contrast mode
  isHighContrastMode: boolean;
  highContrastColors: ReturnType<HighContrastManager['getHighContrastColors']>;
  applyHighContrastStyles: (ctx: CanvasRenderingContext2D) => void;
  
  // Focus management
  chartRef: React.RefObject<HTMLElement>;
  focusChart: () => void;
  
  // ARIA attributes
  getChartAriaAttributes: () => {
    role: string;
    'aria-label': string;
    'aria-describedby'?: string;
    tabIndex: number;
  };
  
  // Cleanup
  cleanup: () => void;
  setupKeyboardNavigation: (dataPoints: Array<{ timestamp: number; price: number; type: 'historical' | 'prediction' }>) => void;
}

export function useChartAccessibility(
  options: UseChartAccessibilityOptions = {}
): ChartAccessibilityHook {
  const {
    accessibilityOptions = {},
    enableKeyboardNavigation = true,
    enableLiveRegions = true,
    enableHighContrastDetection = true
  } = options;

  // Refs and state
  const chartRef = useRef<HTMLElement>(null);
  const [altText, setAltText] = useState<string>('');
  const [currentDataPointIndex, setCurrentDataPointIndex] = useState<number>(0);
  const [isHighContrastMode, setIsHighContrastMode] = useState<boolean>(false);
  const [keyboardNavigator, setKeyboardNavigator] = useState<ChartKeyboardNavigator | null>(null);
  
  // Managers
  const liveRegionManagerRef = useRef<LiveRegionManager | null>(null);
  const highContrastManagerRef = useRef<HighContrastManager | null>(null);
  const descriptionElementIdRef = useRef<string>(`chart-description-${Math.random().toString(36).substr(2, 9)}`);

  // Initialize managers
  useEffect(() => {
    if (enableLiveRegions && !liveRegionManagerRef.current) {
      liveRegionManagerRef.current = new LiveRegionManager();
    }

    let unsubscribe: (() => void) | undefined;
    if (enableHighContrastDetection && !highContrastManagerRef.current) {
      highContrastManagerRef.current = new HighContrastManager();
      setIsHighContrastMode(highContrastManagerRef.current.isHighContrastMode());
      
      // Subscribe to high contrast changes
      unsubscribe = highContrastManagerRef.current.subscribe((isHighContrast) => {
        setIsHighContrastMode(isHighContrast);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [enableLiveRegions, enableHighContrastDetection]);

  // Update alt text
  const updateAltText = useCallback((data: ChartAccessibilityData) => {
    const newAltText = generateChartAltText(data, accessibilityOptions);
    setAltText(newAltText);
  }, [accessibilityOptions]);

  // Keyboard navigation setup
  const setupKeyboardNavigation = useCallback((
    dataPoints: Array<{ timestamp: number; price: number; type: 'historical' | 'prediction' }>
  ) => {
    if (!enableKeyboardNavigation) return;

    const navigator = new ChartKeyboardNavigator(dataPoints, {
      onDataPointFocus: (index, _dataPoint) => {
        setCurrentDataPointIndex(index);
      },
      onAnnouncement: (message) => {
        if (liveRegionManagerRef.current) {
          liveRegionManagerRef.current.announcePolite(message);
        }
      }
    });

    setKeyboardNavigator(navigator);
  }, [enableKeyboardNavigation]);

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent): boolean => {
    if (!keyboardNavigator) return false;
    return keyboardNavigator.handleKeyDown(event);
  }, [keyboardNavigator]);

  // Live announcement functions
  const announcePolite = useCallback((message: string) => {
    if (liveRegionManagerRef.current) {
      liveRegionManagerRef.current.announcePolite(message);
    }
  }, []);

  const announceAssertive = useCallback((message: string) => {
    if (liveRegionManagerRef.current) {
      liveRegionManagerRef.current.announceAssertive(message);
    }
  }, []);

  const announceTimeframeChange = useCallback((timeframe: string, trend?: string) => {
    const announcement = generateLiveAnnouncement('timeframe-change', { timeFrame: timeframe, trend: trend as any });
    announcePolite(announcement);
  }, [announcePolite]);

  const announceDataUpdate = useCallback((currentPrice: number, currency: string) => {
    const announcement = generateLiveAnnouncement('data-update', { currentPrice, currency });
    announcePolite(announcement);
  }, [announcePolite]);

  const announceTrendChange = useCallback((trend: 'up' | 'down' | 'stable', confidence: number) => {
    const announcement = generateLiveAnnouncement('trend-change', { trend, confidence });
    announceAssertive(announcement);
  }, [announceAssertive]);

  // High contrast utilities
  const highContrastColors = highContrastManagerRef.current?.getHighContrastColors() || {
    background: '#ffffff',
    foreground: '#000000',
    grid: '#e2e8f0',
    historical: '#94a3b8',
    prediction: '#3b82f6',
    upTrend: '#22c55e',
    downTrend: '#ef4444',
    stable: '#3b82f6',
    text: '#64748b',
    focus: '#3b82f6'
  };

  const applyHighContrastStyles = useCallback((ctx: CanvasRenderingContext2D) => {
    if (highContrastManagerRef.current) {
      highContrastManagerRef.current.applyHighContrastStyles(ctx);
    }
  }, []);

  // Focus management
  const focusChart = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.focus();
    }
  }, []);

  // ARIA attributes
  const getChartAriaAttributes = useCallback(() => {
    return {
      role: 'img',
      'aria-label': altText || 'Price prediction chart',
      ...(altText ? { 'aria-describedby': descriptionElementIdRef.current } : {}),
      tabIndex: 0
    } as { role: string; 'aria-label': string; 'aria-describedby'?: string; tabIndex: number };
  }, [altText]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (liveRegionManagerRef.current) {
      liveRegionManagerRef.current.destroy();
      liveRegionManagerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    altText,
    updateAltText,
    keyboardNavigator,
    handleKeyDown,
    currentDataPointIndex,
    announcePolite,
    announceAssertive,
    announceTimeframeChange,
    announceDataUpdate,
    announceTrendChange,
    isHighContrastMode,
    highContrastColors,
    applyHighContrastStyles,
    chartRef,
    focusChart,
    getChartAriaAttributes,
    setupKeyboardNavigation,
    cleanup
  };
}

/**
 * Hook for managing screen reader descriptions
 */
export function useScreenReaderDescription(
  elementId: string,
  description: string
): { descriptionElementId: string; DescriptionElement: React.FC } {
  const descriptionElementId = `${elementId}-description`;

  const DescriptionElement: React.FC = () => (
    <div
      id={descriptionElementId}
      className="sr-only"
      aria-hidden="true"
    >
      {description}
    </div>
  );

  return { descriptionElementId, DescriptionElement };
}

/**
 * Hook for managing focus indicators on canvas elements
 */
export function useFocusIndicator(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isHighContrastMode: boolean
) {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);

    return () => {
      canvas.removeEventListener('focus', handleFocus);
      canvas.removeEventListener('blur', handleBlur);
    };
  }, [canvasRef]);

  // Apply focus styles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isFocused) {
      const focusColor = isHighContrastMode ? '#ffff00' : '#3b82f6';
      canvas.style.outline = `3px solid ${focusColor}`;
      canvas.style.outlineOffset = '2px';
    } else {
      canvas.style.outline = 'none';
      canvas.style.outlineOffset = '0';
    }
  }, [isFocused, isHighContrastMode, canvasRef]);

  return { isFocused };
}