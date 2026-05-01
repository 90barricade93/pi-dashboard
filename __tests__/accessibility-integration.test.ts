/**
 * Integration tests for accessibility features
 */

import {
  generateChartAltText,
  formatPriceForAccessibility,
  generateLiveAnnouncement,
  ChartKeyboardNavigator,
  HighContrastManager,
  LiveRegionManager,
  type ChartAccessibilityData,
} from '@/lib/chart-accessibility';

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

describe('Accessibility Integration Tests', () => {
  const mockData: ChartAccessibilityData = {
    currentPrice: 0.314159,
    targetPrice: 0.325,
    trend: 'up',
    confidence: 75,
    timeFrame: '2 hours',
    currency: 'usd',
    historicalDataPoints: 48,
    priceChange: 0.010841,
    priceChangePercent: 3.45,
    reasons: [
      'Recent price movement shows bullish momentum',
      'Technical indicators suggest short-term uptrend',
    ],
  };

  describe('Complete accessibility workflow', () => {
    it('should provide comprehensive accessibility support', () => {
      // 1. Generate alt text for screen readers
      const altText = generateChartAltText(mockData, {
        includeDataPoints: true,
        includeAnalysis: true,
        includeNavigation: true,
        verboseDescription: true,
      });

      expect(altText).toContain('Price prediction chart showing upward trend');
      expect(altText).toContain('moderate confidence (75%)');
      expect(altText).toContain('Current price: 0.314159 US dollars');
      expect(altText).toContain('Target price: 0.325000 US dollars');
      expect(altText).toContain('Use Tab to navigate chart controls');
      expect(altText).toContain('interactive chart displays price prediction data');

      // 2. Test live announcements for dynamic updates
      const timeframeAnnouncement = generateLiveAnnouncement('timeframe-change', {
        timeFrame: '6 hours',
        trend: 'up',
      });
      expect(timeframeAnnouncement).toContain('Chart updated to 6 hours timeframe');

      const dataUpdateAnnouncement = generateLiveAnnouncement('data-update', {
        currentPrice: 0.314159,
        currency: 'usd',
      });
      expect(dataUpdateAnnouncement).toContain('Price data updated');

      const trendChangeAnnouncement = generateLiveAnnouncement('trend-change', {
        trend: 'down',
        confidence: 68,
      });
      expect(trendChangeAnnouncement).toContain('Trend changed to downward');

      // 3. Test keyboard navigation
      const dataPoints = [
        { timestamp: 1000, price: 0.31, type: 'historical' as const },
        { timestamp: 2000, price: 0.32, type: 'historical' as const },
        { timestamp: 3000, price: 0.33, type: 'prediction' as const },
      ];

      let currentFocusedPoint: any = null;
      let lastAnnouncement = '';

      const navigator = new ChartKeyboardNavigator(dataPoints, {
        onDataPointFocus: (index, dataPoint) => {
          currentFocusedPoint = { index, dataPoint };
        },
        onAnnouncement: message => {
          lastAnnouncement = message;
        },
      });

      // Test navigation
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      navigator.handleKeyDown(rightEvent);
      expect(currentFocusedPoint.index).toBe(1);
      expect(currentFocusedPoint.dataPoint.price).toBe(0.32);

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      navigator.handleKeyDown(enterEvent);
      expect(lastAnnouncement).toContain('Historical data point 2 of 3');
      expect(lastAnnouncement).toContain('Price: 0.320000');

      // 4. Test high contrast support
      const highContrastManager = new HighContrastManager();
      const colors = highContrastManager.getHighContrastColors();

      expect(colors).toHaveProperty('background');
      expect(colors).toHaveProperty('upTrend');
      expect(colors).toHaveProperty('downTrend');
      expect(colors).toHaveProperty('focus');

      // Test canvas context styling
      const mockCtx = {
        lineWidth: 1,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 5,
      } as any;

      highContrastManager.applyHighContrastStyles(mockCtx);
      // Should not throw and may modify context properties

      // 5. Test live region management
      const mockElement = {
        setAttribute: jest.fn(),
        style: {} as any,
        textContent: '',
        parentNode: document.body,
      } as any;

      jest.spyOn(document, 'createElement').mockReturnValue(mockElement);

      const liveRegionManager = new LiveRegionManager();

      liveRegionManager.announcePolite('Test polite message');
      expect(mockElement.textContent).toBe('Test polite message');

      liveRegionManager.announceAssertive('Test assertive message');
      expect(mockElement.textContent).toBe('Test assertive message');

      liveRegionManager.clear();
      expect(mockElement.textContent).toBe('');

      // Cleanup
      liveRegionManager.destroy();
      expect(document.body.removeChild).toHaveBeenCalled();
    });

    it('should handle different currency formats for accessibility', () => {
      const currencies = ['usd', 'eur', 'gbp', 'jpy', 'cad'];
      const price = 0.314159;

      currencies.forEach(currency => {
        const formatted = formatPriceForAccessibility(price, currency);
        expect(formatted).toContain('0.314159');
        expect(formatted.length).toBeGreaterThan(10); // Should include currency name
      });
    });

    it('should provide appropriate confidence level descriptions', () => {
      const testCases = [
        { confidence: 90, expected: 'high' },
        { confidence: 75, expected: 'moderate' },
        { confidence: 50, expected: 'low' },
      ];

      testCases.forEach(({ confidence, expected }) => {
        const data = { ...mockData, confidence };
        const altText = generateChartAltText(data);
        expect(altText).toContain(`${expected} confidence`);
      });
    });

    it('should handle edge cases gracefully', () => {
      // Very small price changes
      const stableData = {
        ...mockData,
        trend: 'stable' as const,
        priceChange: 0.000001,
        priceChangePercent: 0.0003,
      };

      const altText = generateChartAltText(stableData);
      expect(altText).toContain('minimal change');

      // No historical data
      const noHistoryData = {
        ...mockData,
        historicalDataPoints: 0,
      };

      const altTextNoHistory = generateChartAltText(noHistoryData);
      expect(altTextNoHistory).not.toContain('historical data points');

      // Empty reasons array
      const noReasonsData = {
        ...mockData,
        reasons: [],
      };

      const altTextNoReasons = generateChartAltText(noReasonsData, { includeAnalysis: true });
      expect(altTextNoReasons).not.toContain('Analysis factors:');
    });

    it('should support keyboard navigation boundary conditions', () => {
      const singleDataPoint = [{ timestamp: 1000, price: 0.31, type: 'historical' as const }];

      const navigator = new ChartKeyboardNavigator(singleDataPoint);

      // Should not move beyond boundaries
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });

      navigator.handleKeyDown(leftEvent);
      expect(navigator.getCurrentIndex()).toBe(0);

      navigator.handleKeyDown(rightEvent);
      expect(navigator.getCurrentIndex()).toBe(0); // Can't move right from single item
    });

    it('should handle high contrast mode detection', () => {
      // Mock high contrast mode active
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches:
          query.includes('prefers-contrast: high') || query.includes('-ms-high-contrast: active'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      const manager = new HighContrastManager();
      expect(manager.isHighContrastMode()).toBe(true);

      const colors = manager.getHighContrastColors();
      expect(colors.background).toBe('#000000');
      expect(colors.foreground).toBe('#ffffff');
      expect(colors.upTrend).toBe('#00ff00');
      expect(colors.downTrend).toBe('#ff0000');
    });
  });

  describe('Performance considerations', () => {
    it('should generate alt text efficiently for large datasets', () => {
      const largeData = {
        ...mockData,
        historicalDataPoints: 1000,
        reasons: Array(20).fill('Analysis reason'),
      };

      const startTime = performance.now();
      const altText = generateChartAltText(largeData);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10); // Should complete in under 10ms
      expect(altText).toBeDefined();
      expect(altText.length).toBeGreaterThan(100);
    });

    it('should handle keyboard navigation efficiently', () => {
      const manyDataPoints = Array.from({ length: 100 }, (_, i) => ({
        timestamp: 1000 + i * 1000,
        price: 0.31 + i * 0.001,
        type: 'historical' as const,
      }));

      const navigator = new ChartKeyboardNavigator(manyDataPoints);

      const startTime = performance.now();

      // Navigate through all points
      for (let i = 0; i < 99; i++) {
        const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        navigator.handleKeyDown(rightEvent);
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
      expect(navigator.getCurrentIndex()).toBe(99);
    });
  });
});
