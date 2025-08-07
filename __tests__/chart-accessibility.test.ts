/**
 * Tests for chart accessibility features
 */

import {
  generateChartAltText,
  formatPriceForAccessibility,
  generateLiveAnnouncement,
  ChartKeyboardNavigator,
  HighContrastManager,
  LiveRegionManager,
  type ChartAccessibilityData
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

describe('Chart Accessibility', () => {
  describe('generateChartAltText', () => {
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

    it('should generate basic alt text', () => {
      const altText = generateChartAltText(mockData);
      
      expect(altText).toContain('Price prediction chart showing upward trend');
      expect(altText).toContain('moderate confidence (75%)');
      expect(altText).toContain('over 2 hours');
    });

    it('should include data points when requested', () => {
      const altText = generateChartAltText(mockData, { includeDataPoints: true });
      
      expect(altText).toContain('Current price: 0.314159 US dollars');
      expect(altText).toContain('Target price: 0.325000 US dollars');
      expect(altText).toContain('3.45% increase');
      expect(altText).toContain('48 historical data points');
    });

    it('should include analysis when requested', () => {
      const altText = generateChartAltText(mockData, { includeAnalysis: true });
      
      expect(altText).toContain('Analysis factors:');
      expect(altText).toContain('Recent price movement shows bullish momentum');
      expect(altText).toContain('Technical indicators suggest short-term uptrend');
    });

    it('should include navigation instructions', () => {
      const altText = generateChartAltText(mockData, { includeNavigation: true });
      
      expect(altText).toContain('Use Tab to navigate chart controls');
      expect(altText).toContain('Press Enter or Space to interact');
      expect(altText).toContain('Use arrow keys to explore data points');
    });

    it('should handle different trends correctly', () => {
      const downTrendData = { 
        ...mockData, 
        trend: 'down' as const, 
        priceChange: -0.006841,
        priceChangePercent: -2.1 
      };
      const altText = generateChartAltText(downTrendData);
      
      expect(altText).toContain('downward trend');
      expect(altText).toContain('2.10% decrease');
    });

    it('should handle stable trend', () => {
      const stableData = { 
        ...mockData, 
        trend: 'stable' as const, 
        priceChange: 0.000031,
        priceChangePercent: 0.009 // Less than 0.01% threshold
      };
      const altText = generateChartAltText(stableData);
      
      expect(altText).toContain('stable trend');
      expect(altText).toContain('minimal change');
    });
  });

  describe('formatPriceForAccessibility', () => {
    it('should format USD prices correctly', () => {
      expect(formatPriceForAccessibility(0.314159, 'usd')).toBe('0.314159 US dollars');
      expect(formatPriceForAccessibility(1.5, 'usd')).toBe('1.500000 US dollars');
    });

    it('should format different currencies', () => {
      expect(formatPriceForAccessibility(0.25, 'eur')).toBe('0.250000 euros');
      expect(formatPriceForAccessibility(0.18, 'gbp')).toBe('0.180000 British pounds');
    });

    it('should handle very small numbers', () => {
      const result = formatPriceForAccessibility(0.000001, 'usd');
      expect(result).toContain('0.000001 US dollars');
    });

    it('should handle unknown currencies', () => {
      const result = formatPriceForAccessibility(0.5, 'xyz');
      expect(result).toContain('XYZ');
    });
  });

  describe('generateLiveAnnouncement', () => {
    it('should generate timeframe change announcements', () => {
      const announcement = generateLiveAnnouncement('timeframe-change', {
        timeFrame: '6 hours',
        trend: 'up'
      });
      
      expect(announcement).toContain('Chart updated to 6 hours timeframe');
      expect(announcement).toContain('Showing up trend');
    });

    it('should generate data update announcements', () => {
      const announcement = generateLiveAnnouncement('data-update', {
        currentPrice: 0.314159,
        currency: 'usd'
      });
      
      expect(announcement).toContain('Price data updated');
      expect(announcement).toContain('0.314159 US dollars');
    });

    it('should generate trend change announcements', () => {
      const announcement = generateLiveAnnouncement('trend-change', {
        trend: 'down',
        confidence: 68
      });
      
      expect(announcement).toContain('Trend changed to downward');
      expect(announcement).toContain('Confidence: 68%');
    });
  });

  describe('ChartKeyboardNavigator', () => {
    const mockDataPoints = [
      { timestamp: 1000, price: 0.31, type: 'historical' as const },
      { timestamp: 2000, price: 0.32, type: 'historical' as const },
      { timestamp: 3000, price: 0.33, type: 'prediction' as const }
    ];

    let navigator: ChartKeyboardNavigator;
    let mockOnDataPointFocus: jest.Mock;
    let mockOnAnnouncement: jest.Mock;

    beforeEach(() => {
      mockOnDataPointFocus = jest.fn();
      mockOnAnnouncement = jest.fn();
      
      navigator = new ChartKeyboardNavigator(mockDataPoints, {
        onDataPointFocus: mockOnDataPointFocus,
        onAnnouncement: mockOnAnnouncement
      });
    });

    it('should handle arrow key navigation', () => {
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

      // Move right
      const handled1 = navigator.handleKeyDown(rightEvent);
      expect(handled1).toBe(true);
      expect(navigator.getCurrentIndex()).toBe(1);
      expect(mockOnDataPointFocus).toHaveBeenCalledWith(1, mockDataPoints[1]);

      // Move left
      const handled2 = navigator.handleKeyDown(leftEvent);
      expect(handled2).toBe(true);
      expect(navigator.getCurrentIndex()).toBe(0);
      expect(mockOnDataPointFocus).toHaveBeenCalledWith(0, mockDataPoints[0]);
    });

    it('should handle Home and End keys', () => {
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
      const endEvent = new KeyboardEvent('keydown', { key: 'End' });

      // Move to end
      navigator.handleKeyDown(endEvent);
      expect(navigator.getCurrentIndex()).toBe(2);

      // Move to home
      navigator.handleKeyDown(homeEvent);
      expect(navigator.getCurrentIndex()).toBe(0);
    });

    it('should handle Enter and Space for announcements', () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      
      navigator.handleKeyDown(enterEvent);
      
      expect(mockOnAnnouncement).toHaveBeenCalledWith(
        expect.stringContaining('Historical data point 1 of 3')
      );
      expect(mockOnAnnouncement).toHaveBeenCalledWith(
        expect.stringContaining('Price: 0.310000')
      );
    });

    it('should not move beyond boundaries', () => {
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });

      // Try to move left from first position
      navigator.handleKeyDown(leftEvent);
      expect(navigator.getCurrentIndex()).toBe(0);

      // Move to last position
      navigator.setCurrentIndex(2);
      
      // Try to move right from last position
      navigator.handleKeyDown(rightEvent);
      expect(navigator.getCurrentIndex()).toBe(2);
    });

    it('should update data points correctly', () => {
      const newDataPoints = [
        { timestamp: 4000, price: 0.34, type: 'historical' as const }
      ];

      navigator.updateDataPoints(newDataPoints);
      expect(navigator.getCurrentIndex()).toBe(0); // Should reset to valid index
    });
  });

  describe('HighContrastManager', () => {
    let manager: HighContrastManager;

    beforeEach(() => {
      // Reset matchMedia mock
      (window.matchMedia as jest.Mock).mockClear();
      manager = new HighContrastManager();
    });

    it('should detect high contrast mode', () => {
      // Mock high contrast mode active
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('prefers-contrast: high'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      const newManager = new HighContrastManager();
      expect(newManager.isHighContrastMode()).toBe(true);
    });

    it('should return appropriate colors for high contrast mode', () => {
      // Mock high contrast mode
      manager.isHighContrastMode = jest.fn().mockReturnValue(true);
      
      const colors = manager.getHighContrastColors();
      
      expect(colors.background).toBe('#000000');
      expect(colors.foreground).toBe('#ffffff');
      expect(colors.upTrend).toBe('#00ff00');
      expect(colors.downTrend).toBe('#ff0000');
    });

    it('should return default colors for normal mode', () => {
      manager.isHighContrastMode = jest.fn().mockReturnValue(false);
      
      const colors = manager.getHighContrastColors();
      
      expect(colors.background).toBe('#ffffff');
      expect(colors.foreground).toBe('#000000');
      expect(colors.grid).toBe('#e2e8f0');
    });

    it('should apply high contrast styles to canvas context', () => {
      const mockCtx = {
        lineWidth: 1,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 5
      } as any;

      manager.isHighContrastMode = jest.fn().mockReturnValue(true);
      manager.applyHighContrastStyles(mockCtx);

      expect(mockCtx.lineWidth).toBeGreaterThanOrEqual(2);
      expect(mockCtx.shadowColor).toBe('transparent');
      expect(mockCtx.shadowBlur).toBe(0);
    });
  });

  describe('LiveRegionManager', () => {
    let manager: LiveRegionManager;
    let mockPoliteElement: HTMLElement;
    let mockAssertiveElement: HTMLElement;

    beforeEach(() => {
      mockPoliteElement = {
        setAttribute: jest.fn(),
        style: {} as any,
        textContent: '',
        parentNode: document.body
      } as any;

      mockAssertiveElement = {
        setAttribute: jest.fn(),
        style: {} as any,
        textContent: '',
        parentNode: document.body
      } as any;

      // Mock createElement to return our mock elements
      jest.spyOn(document, 'createElement')
        .mockReturnValueOnce(mockPoliteElement)
        .mockReturnValueOnce(mockAssertiveElement);

      manager = new LiveRegionManager();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create live regions with correct attributes', () => {
      expect(mockPoliteElement.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      expect(mockPoliteElement.setAttribute).toHaveBeenCalledWith('aria-atomic', 'true');
      expect(mockAssertiveElement.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive');
      expect(mockAssertiveElement.setAttribute).toHaveBeenCalledWith('aria-atomic', 'true');
    });

    it('should announce polite messages', () => {
      manager.announcePolite('Test polite message');
      expect(mockPoliteElement.textContent).toBe('Test polite message');
    });

    it('should announce assertive messages', () => {
      manager.announceAssertive('Test assertive message');
      expect(mockAssertiveElement.textContent).toBe('Test assertive message');
    });

    it('should clear announcements', () => {
      manager.announcePolite('Test message');
      manager.clear();
      expect(mockPoliteElement.textContent).toBe('');
      expect(mockAssertiveElement.textContent).toBe('');
    });

    it('should clean up on destroy', () => {
      manager.destroy();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockPoliteElement);
      expect(document.body.removeChild).toHaveBeenCalledWith(mockAssertiveElement);
    });
  });
});

describe('Accessibility Integration', () => {
  it('should handle complete accessibility workflow', () => {
    const data: ChartAccessibilityData = {
      currentPrice: 0.314159,
      targetPrice: 0.325000,
      trend: 'up',
      confidence: 75,
      timeFrame: '2 hours',
      currency: 'usd',
      historicalDataPoints: 48,
      priceChange: 0.010841,
      priceChangePercent: 3.45,
      reasons: ['Bullish momentum', 'Technical indicators positive']
    };

    // Generate alt text
    const altText = generateChartAltText(data, {
      includeDataPoints: true,
      includeAnalysis: true,
      includeNavigation: true
    });

    expect(altText).toContain('Price prediction chart');
    expect(altText).toContain('upward trend');
    expect(altText).toContain('Current price: 0.314159 US dollars');
    expect(altText).toContain('Use Tab to navigate');

    // Test live announcements
    const timeframeAnnouncement = generateLiveAnnouncement('timeframe-change', {
      timeFrame: '6 hours',
      trend: 'up'
    });
    expect(timeframeAnnouncement).toContain('Chart updated to 6 hours timeframe');

    // Test keyboard navigation
    const dataPoints = [
      { timestamp: 1000, price: 0.31, type: 'historical' as const },
      { timestamp: 2000, price: 0.32, type: 'prediction' as const }
    ];

    const navigator = new ChartKeyboardNavigator(dataPoints);
    const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    
    expect(navigator.handleKeyDown(rightEvent)).toBe(true);
    expect(navigator.getCurrentIndex()).toBe(1);
  });
});