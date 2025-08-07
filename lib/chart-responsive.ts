/**
 * Responsive chart configuration system and device detection utilities
 */

import type {
  DeviceType,
  TimeFrame,
  PaddingConfig,
  ChartConfig,
  ResponsiveChartMetrics,
  Breakpoints,
  TimeframeConfig
} from '@/types/chart-responsive';

// Device breakpoints based on common responsive design patterns
export const BREAKPOINTS: Breakpoints = {
  mobile: { max: 767 },
  tablet: { min: 768, max: 1023 },
  desktop: { min: 1024 }
} as const;

// Responsive chart configuration
export const CHART_CONFIG: ChartConfig = {
  padding: {
    mobile: { top: 20, right: 15, bottom: 40, left: 50 },
    tablet: { top: 30, right: 20, bottom: 50, left: 60 },
    desktop: { top: 40, right: 25, bottom: 60, left: 70 }
  },
  fontSize: {
    mobile: 10,
    tablet: 12,
    desktop: 14
  },
  labelSpacing: {
    minDistance: 40, // Minimum pixels between labels
    maxLabels: 8     // Maximum number of labels to show
  },
  timeIntervals: {
    '30min': {
      mobile: { interval: 10 * 60 * 1000, maxLabels: 4 },    // 10min intervals, max 4 labels
      tablet: { interval: 5 * 60 * 1000, maxLabels: 6 },     // 5min intervals, max 6 labels  
      desktop: { interval: 5 * 60 * 1000, maxLabels: 8 }     // 5min intervals, max 8 labels
    },
    '1hour': {
      mobile: { interval: 20 * 60 * 1000, maxLabels: 4 },    // 20min intervals
      tablet: { interval: 15 * 60 * 1000, maxLabels: 6 },    // 15min intervals
      desktop: { interval: 10 * 60 * 1000, maxLabels: 8 }    // 10min intervals
    },
    '2hours': {
      mobile: { interval: 60 * 60 * 1000, maxLabels: 3 },    // 1hr intervals
      tablet: { interval: 30 * 60 * 1000, maxLabels: 5 },    // 30min intervals
      desktop: { interval: 30 * 60 * 1000, maxLabels: 6 }    // 30min intervals
    },
    '6hours': {
      mobile: { interval: 3 * 60 * 60 * 1000, maxLabels: 3 }, // 3hr intervals
      tablet: { interval: 2 * 60 * 60 * 1000, maxLabels: 4 }, // 2hr intervals
      desktop: { interval: 1 * 60 * 60 * 1000, maxLabels: 7 } // 1hr intervals
    },
    '12hours': {
      mobile: { interval: 6 * 60 * 60 * 1000, maxLabels: 3 }, // 6hr intervals
      tablet: { interval: 4 * 60 * 60 * 1000, maxLabels: 4 }, // 4hr intervals
      desktop: { interval: 2 * 60 * 60 * 1000, maxLabels: 7 } // 2hr intervals
    }
  }
};

/**
 * Detects device type based on screen width using responsive breakpoints
 * @param width - Screen width in pixels
 * @returns DeviceType - mobile, tablet, or desktop
 */
export function detectDeviceType(width: number): DeviceType {
  if (width <= BREAKPOINTS.mobile.max) {
    return 'mobile';
  } else if (width >= BREAKPOINTS.tablet.min && width <= BREAKPOINTS.tablet.max) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Calculates dynamic padding based on canvas dimensions and device type
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @returns PaddingConfig - Calculated padding values
 */
export function calculateDynamicPadding(
  width: number, 
  height: number, 
  deviceType: DeviceType
): PaddingConfig {
  const basePadding = CHART_CONFIG.padding[deviceType];
  
  // Adjust padding based on actual dimensions to ensure labels fit
  return {
    top: Math.max(basePadding.top, height * 0.05),
    right: Math.max(basePadding.right, width * 0.03),
    bottom: Math.max(basePadding.bottom, height * 0.12),
    left: Math.max(basePadding.left, width * 0.08)
  };
}

/**
 * Calculates responsive padding that prevents price label cutoff
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @param maxPrice - Maximum price value to be displayed
 * @param minPrice - Minimum price value to be displayed
 * @param currency - Currency symbol for price formatting
 * @returns PaddingConfig - Calculated padding values that prevent label cutoff
 */
export function calculatePaddingWithLabelProtection(
  width: number,
  height: number,
  deviceType: DeviceType,
  maxPrice: number,
  minPrice: number,
  currency: string = '$'
): PaddingConfig {
  const basePadding = calculateDynamicPadding(width, height, deviceType);
  const fontSize = getOptimalFontSize(deviceType);
  
  // Estimate text width for price labels
  const maxPriceText = `${currency}${maxPrice.toFixed(6)}`;
  const minPriceText = `${currency}${minPrice.toFixed(6)}`;
  const longestPriceText = maxPriceText.length > minPriceText.length ? maxPriceText : minPriceText;
  
  // Approximate character width based on font size (monospace assumption)
  const charWidth = fontSize * 0.6;
  const estimatedTextWidth = longestPriceText.length * charWidth;
  
  // Add buffer for text spacing and potential currency symbol variations
  const textBuffer = fontSize * 0.5;
  const requiredLeftPadding = estimatedTextWidth + textBuffer;
  
  // Calculate minimum padding needed for time labels at bottom
  const timeTextHeight = fontSize * 1.5; // Account for line height
  const requiredBottomPadding = timeTextHeight + (fontSize * 0.5);
  
  // Ensure adequate padding for different screen sizes
  const dimensionBasedPadding = {
    top: Math.max(basePadding.top, height * 0.08),
    right: Math.max(basePadding.right, width * 0.04),
    bottom: Math.max(basePadding.bottom, requiredBottomPadding, height * 0.15),
    left: Math.max(basePadding.left, requiredLeftPadding, width * 0.12)
  };
  
  return dimensionBasedPadding;
}

/**
 * Calculates minimum padding requirements for different content types
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @param contentType - Type of content that needs padding
 * @returns number - Minimum padding in pixels
 */
export function getMinimumPadding(
  deviceType: DeviceType,
  contentType: 'price-labels' | 'time-labels' | 'chart-area' | 'touch-targets'
): number {
  const fontSize = getOptimalFontSize(deviceType);
  
  switch (contentType) {
    case 'price-labels':
      // Minimum space needed for price labels (longest expected price text)
      return deviceType === 'mobile' ? fontSize * 8 : fontSize * 10;
    
    case 'time-labels':
      // Minimum space needed for time labels
      return deviceType === 'mobile' ? fontSize * 2.5 : fontSize * 3;
    
    case 'chart-area':
      // Minimum padding to ensure chart area is usable
      return deviceType === 'mobile' ? 20 : deviceType === 'tablet' ? 30 : 40;
    
    case 'touch-targets':
      // Minimum padding for touch interaction (mobile only)
      return deviceType === 'mobile' ? 44 : 0; // 44px is iOS recommended touch target
    
    default:
      return 0;
  }
}

/**
 * Validates and adjusts padding to ensure it doesn't exceed reasonable bounds
 * @param padding - Padding configuration to validate
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @returns PaddingConfig - Validated and adjusted padding
 */
export function validatePadding(
  padding: PaddingConfig,
  width: number,
  height: number
): PaddingConfig {
  // Ensure padding doesn't consume more than 60% of available space
  const maxHorizontalPadding = width * 0.3; // 30% on each side
  const maxVerticalPadding = height * 0.3;   // 30% on each side
  
  return {
    top: Math.min(padding.top, maxVerticalPadding),
    right: Math.min(padding.right, maxHorizontalPadding),
    bottom: Math.min(padding.bottom, maxVerticalPadding),
    left: Math.min(padding.left, maxHorizontalPadding)
  };
}

/**
 * Calculates adaptive padding that adjusts based on content density
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @param options - Additional options for padding calculation
 * @returns PaddingConfig - Adaptive padding configuration
 */
export function calculateAdaptivePadding(
  width: number,
  height: number,
  deviceType: DeviceType,
  options: {
    hasLongPriceLabels?: boolean;
    hasFrequentTimeLabels?: boolean;
    needsTouchTargets?: boolean;
    maxPrice?: number;
    minPrice?: number;
    currency?: string;
  } = {}
): PaddingConfig {
  let padding: PaddingConfig;
  
  // Start with label-protected padding if price data is available
  if (options.maxPrice !== undefined && options.minPrice !== undefined) {
    padding = calculatePaddingWithLabelProtection(
      width,
      height,
      deviceType,
      options.maxPrice,
      options.minPrice,
      options.currency
    );
  } else {
    padding = calculateDynamicPadding(width, height, deviceType);
  }
  
  // Adjust for long price labels
  if (options.hasLongPriceLabels) {
    const extraLeftPadding = deviceType === 'mobile' ? 15 : 20;
    padding.left += extraLeftPadding;
  }
  
  // Adjust for frequent time labels
  if (options.hasFrequentTimeLabels) {
    const extraBottomPadding = deviceType === 'mobile' ? 10 : 15;
    padding.bottom += extraBottomPadding;
  }
  
  // Adjust for touch targets on mobile
  if (options.needsTouchTargets && deviceType === 'mobile') {
    const touchPadding = getMinimumPadding(deviceType, 'touch-targets');
    padding.top = Math.max(padding.top, touchPadding);
    padding.bottom = Math.max(padding.bottom, touchPadding);
  }
  
  // Validate final padding
  return validatePadding(padding, width, height);
}

/**
 * Font size constraints for responsive design
 */
export const FONT_SIZE_CONSTRAINTS = {
  minimum: 8,   // Minimum readable font size
  maximum: 24,  // Maximum font size to prevent oversized text
  scaleFactor: {
    mobile: 0.8,
    tablet: 1.0,
    desktop: 1.2
  }
} as const;

/**
 * Gets optimal font size for the given device type
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @param baseSize - Optional base font size to scale from
 * @returns number - Optimal font size in pixels
 */
export function getOptimalFontSize(deviceType: DeviceType, baseSize?: number): number {
  if (baseSize) {
    const scaleFactor = FONT_SIZE_CONSTRAINTS.scaleFactor[deviceType];
    const scaledSize = Math.round(baseSize * scaleFactor);
    return constrainFontSize(scaledSize);
  }
  
  return CHART_CONFIG.fontSize[deviceType];
}

/**
 * Calculates responsive font size based on screen dimensions and device type
 * @param width - Screen width in pixels
 * @param height - Screen height in pixels
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @param contentType - Type of content the font will be used for
 * @returns number - Calculated font size in pixels
 */
export function calculateResponsiveFontSize(
  width: number,
  height: number,
  deviceType: DeviceType,
  contentType: 'labels' | 'values' | 'titles' = 'labels'
): number {
  // Base font sizes for different content types
  const baseSizes = {
    labels: CHART_CONFIG.fontSize[deviceType],
    values: CHART_CONFIG.fontSize[deviceType] + 1,
    titles: CHART_CONFIG.fontSize[deviceType] + 2
  };
  
  let fontSize = baseSizes[contentType];
  
  // Adjust font size based on available space
  const minDimension = Math.min(width, height);
  
  // Scale font size based on screen size for better readability
  if (deviceType === 'mobile') {
    // On mobile, ensure text is readable but not too large
    if (minDimension < 320) {
      fontSize = Math.max(fontSize - 2, FONT_SIZE_CONSTRAINTS.minimum);
    } else if (minDimension > 480) {
      fontSize = Math.min(fontSize + 1, FONT_SIZE_CONSTRAINTS.maximum);
    }
  } else if (deviceType === 'tablet') {
    // On tablet, scale based on available space
    if (minDimension < 600) {
      fontSize = Math.max(fontSize - 1, FONT_SIZE_CONSTRAINTS.minimum);
    } else if (minDimension > 1000) {
      fontSize = Math.min(fontSize + 2, FONT_SIZE_CONSTRAINTS.maximum);
    }
  } else {
    // On desktop, allow larger fonts for better readability
    if (width > 1920) {
      fontSize = Math.min(fontSize + 3, FONT_SIZE_CONSTRAINTS.maximum);
    } else if (width > 1440) {
      fontSize = Math.min(fontSize + 1, FONT_SIZE_CONSTRAINTS.maximum);
    }
  }
  
  return constrainFontSize(fontSize);
}

/**
 * Constrains font size within minimum and maximum bounds
 * @param fontSize - Font size to constrain
 * @returns number - Constrained font size
 */
export function constrainFontSize(fontSize: number): number {
  return Math.max(
    FONT_SIZE_CONSTRAINTS.minimum,
    Math.min(fontSize, FONT_SIZE_CONSTRAINTS.maximum)
  );
}

/**
 * Calculates font size scaling factor based on device pixel ratio
 * @param devicePixelRatio - Device pixel ratio (window.devicePixelRatio)
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @returns number - Scaling factor for font size
 */
export function calculateFontScalingFactor(
  devicePixelRatio: number,
  deviceType: DeviceType
): number {
  // Base scaling factors for different device types
  const baseScaling = FONT_SIZE_CONSTRAINTS.scaleFactor[deviceType];
  
  // Adjust for high-DPI displays
  if (devicePixelRatio > 2) {
    // High-DPI displays can handle slightly larger fonts
    return baseScaling * 1.1;
  } else if (devicePixelRatio < 1.5) {
    // Low-DPI displays might need slightly smaller fonts
    return baseScaling * 0.95;
  }
  
  return baseScaling;
}

/**
 * Gets font size for specific chart elements
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @param elementType - Type of chart element
 * @param screenWidth - Screen width in pixels
 * @param screenHeight - Screen height in pixels
 * @returns number - Font size for the specific element
 */
export function getElementFontSize(
  deviceType: DeviceType,
  elementType: 'time-labels' | 'price-labels' | 'grid-labels' | 'legend',
  screenWidth: number,
  screenHeight: number
): number {
  const baseFontSize = calculateResponsiveFontSize(screenWidth, screenHeight, deviceType);
  
  // Adjust font size based on element type
  switch (elementType) {
    case 'time-labels':
      // Time labels can be slightly smaller to fit more labels
      return constrainFontSize(baseFontSize - 1);
    
    case 'price-labels':
      // Price labels should be easily readable
      return baseFontSize;
    
    case 'grid-labels':
      // Grid labels can be smaller and less prominent
      return constrainFontSize(baseFontSize - 2);
    
    case 'legend':
      // Legend text should be readable but not dominant
      return constrainFontSize(baseFontSize - 1);
    
    default:
      return baseFontSize;
  }
}

/**
 * Validates if a font size is within acceptable bounds for the given device
 * @param fontSize - Font size to validate
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @returns boolean - True if font size is valid
 */
export function isValidFontSize(fontSize: number, deviceType: DeviceType): boolean {
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    return false;
  }
  
  // Check against absolute constraints
  if (fontSize < FONT_SIZE_CONSTRAINTS.minimum || fontSize > FONT_SIZE_CONSTRAINTS.maximum) {
    return false;
  }
  
  // Check against device-specific reasonable ranges
  const deviceRanges = {
    mobile: { min: 8, max: 16 },
    tablet: { min: 10, max: 18 },
    desktop: { min: 12, max: 24 }
  };
  
  const range = deviceRanges[deviceType];
  return fontSize >= range.min && fontSize <= range.max;
}

/**
 * Gets timeframe configuration for specific device type and timeframe
 * @param timeFrame - Selected timeframe
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @returns TimeframeConfig - Configuration for the timeframe and device combination
 */
export function getTimeframeConfig(timeFrame: TimeFrame, deviceType: DeviceType): TimeframeConfig {
  return CHART_CONFIG.timeIntervals[timeFrame][deviceType];
}

/**
 * Calculates complete responsive chart metrics for given dimensions and timeframe
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @param timeFrame - Selected timeframe
 * @returns ResponsiveChartMetrics - Complete metrics for responsive chart rendering
 */
export function calculateResponsiveMetrics(
  width: number,
  height: number,
  timeFrame: TimeFrame
): ResponsiveChartMetrics {
  const deviceType = detectDeviceType(width);
  const padding = calculateDynamicPadding(width, height, deviceType);
  const fontSize = getOptimalFontSize(deviceType);
  const timeConfig = getTimeframeConfig(timeFrame, deviceType);

  return {
    width,
    height,
    deviceType,
    padding,
    fontSize,
    timeConfig
  };
}

/**
 * Validates if a width value represents a valid screen size
 * @param width - Width value to validate
 * @returns boolean - True if width is valid
 */
export function isValidScreenWidth(width: number): boolean {
  return width > 0 && width <= 8192 && Number.isFinite(width);
}