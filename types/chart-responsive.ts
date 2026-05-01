/**
 * Types and interfaces for responsive chart configuration
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type TimeFrame = '30min' | '1hour' | '2hours' | '6hours' | '12hours';

export interface PaddingConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TimeframeConfig {
  interval: number; // Interval in milliseconds
  maxLabels: number; // Maximum number of labels to show
}

export interface DeviceConfig {
  mobile: TimeframeConfig;
  tablet: TimeframeConfig;
  desktop: TimeframeConfig;
}

export interface ChartConfig {
  padding: {
    mobile: PaddingConfig;
    tablet: PaddingConfig;
    desktop: PaddingConfig;
  };
  fontSize: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  labelSpacing: {
    minDistance: number; // Minimum pixels between labels
    maxLabels: number; // Maximum number of labels to show
  };
  timeIntervals: Record<TimeFrame, DeviceConfig>;
}

export interface ResponsiveChartMetrics {
  width: number;
  height: number;
  deviceType: DeviceType;
  padding: PaddingConfig;
  fontSize: number;
  timeConfig: TimeframeConfig;
}

export interface Breakpoints {
  mobile: { max: number };
  tablet: { min: number; max: number };
  desktop: { min: number };
}

export interface PaddingOptions {
  hasLongPriceLabels?: boolean;
  hasFrequentTimeLabels?: boolean;
  needsTouchTargets?: boolean;
  maxPrice?: number;
  minPrice?: number;
  currency?: string;
}

export type ContentType = 'price-labels' | 'time-labels' | 'chart-area' | 'touch-targets';

export type FontContentType = 'labels' | 'values' | 'titles';
export type ChartElementType = 'time-labels' | 'price-labels' | 'grid-labels' | 'legend';

export interface FontSizeConstraints {
  minimum: number;
  maximum: number;
  scaleFactor: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export interface FontSizeOptions {
  devicePixelRatio?: number;
  contentType?: FontContentType;
  elementType?: ChartElementType;
  baseSize?: number;
}
