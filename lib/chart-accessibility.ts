/**
 * Chart Accessibility Utilities
 * Provides screen reader support, keyboard navigation, and alternative text generation
 */

export interface ChartAccessibilityData {
  currentPrice: number;
  targetPrice: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  timeFrame: string;
  currency: string;
  historicalDataPoints: number;
  priceChange: number;
  priceChangePercent: number;
  reasons: string[];
}

export interface AccessibilityOptions {
  includeDataPoints?: boolean;
  includeAnalysis?: boolean;
  verboseDescription?: boolean;
  includeNavigation?: boolean;
}

/**
 * Generates comprehensive alternative text for the price prediction chart
 */
export function generateChartAltText(
  data: ChartAccessibilityData,
  options: AccessibilityOptions = {}
): string {
  const {
    includeDataPoints = true,
    includeAnalysis = true,
    verboseDescription = false,
    includeNavigation = true
  } = options;

  const parts: string[] = [];

  // Basic chart description
  const trendText = data.trend === 'up' ? 'upward' : data.trend === 'down' ? 'downward' : 'stable';
  const confidenceText = data.confidence >= 80 ? 'high' : data.confidence >= 60 ? 'moderate' : 'low';
  
  parts.push(
    `Price prediction chart showing ${trendText} trend with ${confidenceText} confidence (${data.confidence}%) over ${data.timeFrame}.`
  );

  // Current state
  if (includeDataPoints) {
    const changeDirection = data.priceChange >= 0 ? 'increase' : 'decrease';
    const changeText = Math.abs(data.priceChangePercent) >= 0.01 
      ? `${Math.abs(data.priceChangePercent).toFixed(2)}% ${changeDirection}`
      : 'minimal change';

    parts.push(
      `Current price: ${formatPriceForAccessibility(data.currentPrice, data.currency)}. ` +
      `Target price: ${formatPriceForAccessibility(data.targetPrice, data.currency)}. ` +
      `Predicted ${changeText}.`
    );

    if (data.historicalDataPoints > 0) {
      parts.push(`Chart includes ${data.historicalDataPoints} historical data points.`);
    }
  }

  // Analysis reasons
  if (includeAnalysis && data.reasons.length > 0) {
    parts.push(`Analysis factors: ${data.reasons.join('; ')}.`);
  }

  // Navigation instructions
  if (includeNavigation) {
    parts.push(
      'Use Tab to navigate chart controls. Press Enter or Space to interact with timeframe buttons. ' +
      'Use arrow keys to explore data points when chart is focused.'
    );
  }

  // Verbose description for screen readers
  if (verboseDescription) {
    parts.push(
      'This interactive chart displays price prediction data with historical context. ' +
      'The chart uses visual elements including lines, points, and grid markers to represent price movements over time.'
    );
  }

  return parts.join(' ');
}

/**
 * Formats price values for screen reader accessibility
 */
export function formatPriceForAccessibility(price: number, currency: string): string {
  const currencyNames: Record<string, string> = {
    'usd': 'US dollars',
    'eur': 'euros',
    'gbp': 'British pounds',
    'jpy': 'Japanese yen',
    'cad': 'Canadian dollars',
    'aud': 'Australian dollars',
    'chf': 'Swiss francs',
    'cny': 'Chinese yuan',
    'inr': 'Indian rupees',
    'krw': 'South Korean won'
  };

  const currencyName = currencyNames[currency.toLowerCase()] || currency.toUpperCase();
  
  // Format number for speech
  if (price >= 1) {
    return `${price.toFixed(6)} ${currencyName}`;
  } else {
    // For very small numbers, use consistent 6 decimal places for accessibility
    const formatted = price.toFixed(6);
    return `${formatted} ${currencyName}`;
  }
}

/**
 * Generates live region announcements for chart updates
 */
export function generateLiveAnnouncement(
  type: 'timeframe-change' | 'data-update' | 'trend-change',
  data: Partial<ChartAccessibilityData>
): string {
  switch (type) {
    case 'timeframe-change':
      return `Chart updated to ${data.timeFrame} timeframe. ${data.trend ? `Showing ${data.trend} trend.` : ''}`;
    
    case 'data-update':
      return `Price data updated. Current price: ${data.currentPrice ? formatPriceForAccessibility(data.currentPrice, data.currency || 'USD') : 'loading'}.`;
    
    case 'trend-change': {
      const trendText = data.trend === 'up' ? 'upward' : data.trend === 'down' ? 'downward' : 'stable';
      return `Trend changed to ${trendText}. Confidence: ${data.confidence}%.`;
    }
    
    default:
      return 'Chart updated.';
  }
}

/**
 * Keyboard navigation handler for chart interaction
 */
export class ChartKeyboardNavigator {
  private currentDataPointIndex = 0;
  private dataPoints: Array<{ timestamp: number; price: number; type: 'historical' | 'prediction' }> = [];
  private onDataPointFocus: ((index: number, dataPoint: any) => void) | undefined;
  private onAnnouncement: ((message: string) => void) | undefined;

  constructor(
    dataPoints: Array<{ timestamp: number; price: number; type: 'historical' | 'prediction' }>,
    options: {
      onDataPointFocus?: (index: number, dataPoint: any) => void;
      onAnnouncement?: (message: string) => void;
    } = {}
  ) {
    this.dataPoints = dataPoints;
    this.onDataPointFocus = options.onDataPointFocus;
    this.onAnnouncement = options.onAnnouncement;
  }

  /**
   * Handle keyboard events for chart navigation
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.moveToPreviousDataPoint();
        return true;

      case 'ArrowRight':
        event.preventDefault();
        this.moveToNextDataPoint();
        return true;

      case 'Home':
        event.preventDefault();
        this.moveToFirstDataPoint();
        return true;

      case 'End':
        event.preventDefault();
        this.moveToLastDataPoint();
        return true;

      case 'Enter':
      case ' ':
        event.preventDefault();
        this.announceCurrentDataPoint();
        return true;

      default:
        return false;
    }
  }

  private moveToPreviousDataPoint(): void {
    if (this.currentDataPointIndex > 0) {
      this.currentDataPointIndex--;
      this.focusCurrentDataPoint();
    }
  }

  private moveToNextDataPoint(): void {
    if (this.currentDataPointIndex < this.dataPoints.length - 1) {
      this.currentDataPointIndex++;
      this.focusCurrentDataPoint();
    }
  }

  private moveToFirstDataPoint(): void {
    this.currentDataPointIndex = 0;
    this.focusCurrentDataPoint();
  }

  private moveToLastDataPoint(): void {
    this.currentDataPointIndex = this.dataPoints.length - 1;
    this.focusCurrentDataPoint();
  }

  private focusCurrentDataPoint(): void {
    const dataPoint = this.dataPoints[this.currentDataPointIndex];
    if (dataPoint && this.onDataPointFocus) {
      this.onDataPointFocus(this.currentDataPointIndex, dataPoint);
    }
  }

  private announceCurrentDataPoint(): void {
    const dataPoint = this.dataPoints[this.currentDataPointIndex];
    if (dataPoint && this.onAnnouncement) {
      const date = new Date(dataPoint.timestamp);
      const timeString = date.toLocaleTimeString();
      const dateString = date.toLocaleDateString();
      const typeText = dataPoint.type === 'historical' ? 'Historical' : 'Predicted';
      
      const announcement = `${typeText} data point ${this.currentDataPointIndex + 1} of ${this.dataPoints.length}. ` +
        `Time: ${timeString} on ${dateString}. Price: ${dataPoint.price.toFixed(6)}.`;
      
      this.onAnnouncement(announcement);
    }
  }

  /**
   * Update data points when chart data changes
   */
  updateDataPoints(newDataPoints: Array<{ timestamp: number; price: number; type: 'historical' | 'prediction' }>): void {
    this.dataPoints = newDataPoints;
    // Reset to first point if current index is out of bounds
    if (this.currentDataPointIndex >= this.dataPoints.length) {
      this.currentDataPointIndex = Math.max(0, this.dataPoints.length - 1);
    }
  }

  /**
   * Get current data point index
   */
  getCurrentIndex(): number {
    return this.currentDataPointIndex;
  }

  /**
   * Set current data point index
   */
  setCurrentIndex(index: number): void {
    if (index >= 0 && index < this.dataPoints.length) {
      this.currentDataPointIndex = index;
      this.focusCurrentDataPoint();
    }
  }
}

/**
 * High contrast mode detection and styling utilities
 */
export class HighContrastManager {
  private mediaQuery: MediaQueryList;
  private callbacks: Array<(isHighContrast: boolean) => void> = [];

  constructor() {
    // Check for Windows high contrast mode
    this.mediaQuery = window.matchMedia('(prefers-contrast: high), (-ms-high-contrast: active)');
    this.mediaQuery.addEventListener('change', this.handleContrastChange.bind(this));
  }

  /**
   * Check if high contrast mode is currently active
   */
  isHighContrastMode(): boolean {
    return this.mediaQuery.matches || 
           window.matchMedia('(prefers-contrast: high)').matches ||
           window.matchMedia('(-ms-high-contrast: active)').matches;
  }

  /**
   * Get high contrast color scheme for chart elements
   */
  getHighContrastColors(): {
    background: string;
    foreground: string;
    grid: string;
    historical: string;
    prediction: string;
    upTrend: string;
    downTrend: string;
    stable: string;
    text: string;
    focus: string;
  } {
    if (this.isHighContrastMode()) {
      return {
        background: '#000000',
        foreground: '#ffffff',
        grid: '#808080',
        historical: '#ffffff',
        prediction: '#ffff00',
        upTrend: '#00ff00',
        downTrend: '#ff0000',
        stable: '#00ffff',
        text: '#ffffff',
        focus: '#ffff00'
      };
    }

    // Return default colors for normal mode
    return {
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
  }

  /**
   * Subscribe to high contrast mode changes
   */
  subscribe(callback: (isHighContrast: boolean) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private handleContrastChange(): void {
    const isHighContrast = this.isHighContrastMode();
    this.callbacks.forEach(callback => callback(isHighContrast));
  }

  /**
   * Apply high contrast styles to canvas context
   */
  applyHighContrastStyles(ctx: CanvasRenderingContext2D): void {
    if (this.isHighContrastMode()) {
      // Increase line widths for better visibility
      const currentLineWidth = ctx.lineWidth;
      ctx.lineWidth = Math.max(currentLineWidth, 2);
      
      // Ensure text is readable
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }
}

/**
 * ARIA live region manager for dynamic announcements
 */
export class LiveRegionManager {
  private politeRegion: HTMLElement;
  private assertiveRegion: HTMLElement;

  constructor() {
    this.politeRegion = this.createLiveRegion('polite');
    this.assertiveRegion = this.createLiveRegion('assertive');
  }

  private createLiveRegion(level: 'polite' | 'assertive'): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', level);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(region);
    return region;
  }

  /**
   * Announce message with polite priority (won't interrupt current speech)
   */
  announcePolite(message: string): void {
    this.politeRegion.textContent = message;
  }

  /**
   * Announce message with assertive priority (will interrupt current speech)
   */
  announceAssertive(message: string): void {
    this.assertiveRegion.textContent = message;
  }

  /**
   * Clear all announcements
   */
  clear(): void {
    this.politeRegion.textContent = '';
    this.assertiveRegion.textContent = '';
  }

  /**
   * Clean up live regions
   */
  destroy(): void {
    if (this.politeRegion.parentNode) {
      this.politeRegion.parentNode.removeChild(this.politeRegion);
    }
    if (this.assertiveRegion.parentNode) {
      this.assertiveRegion.parentNode.removeChild(this.assertiveRegion);
    }
  }
}