# Design Document

## Overview

This design addresses the user experience issues in the price prediction chart by implementing responsive design patterns, intelligent label management, and adaptive spacing algorithms. The solution focuses on creating a chart that automatically adjusts its display density and formatting based on screen size and selected timeframe, ensuring optimal readability across all devices.

## Architecture

### Current Issues Analysis

The current implementation has several problems:
1. **Fixed hourly intervals** - Always shows hourly grid lines regardless of timeframe
2. **Static padding** - Uses fixed 60px padding that doesn't scale with screen size
3. **No label collision detection** - Time labels overlap when there are too many
4. **Fixed font sizes** - 12px font doesn't adapt to screen size
5. **No responsive breakpoints** - Chart doesn't adapt to different device sizes
6. **Missing visual anchors** - No "Now" marker to help users orient themselves
7. **No uncertainty visualization** - Predictions lack confidence indicators
8. **Limited interactivity** - No hover tooltips for detailed information
9. **Blurry rendering on HiDPI** - Canvas not optimized for high-resolution displays
10. **Sharp line joins** - Chart lines appear jagged at connection points
11. **Excessive axis padding** - Too much empty space around data points

### Proposed Solution Architecture

The solution introduces a **Responsive Chart Engine** with six main components:

1. **Device Detection Layer** - Determines optimal chart parameters based on screen size
2. **Timeframe Adaptation Engine** - Calculates appropriate label density for each timeframe
3. **Dynamic Layout Calculator** - Computes spacing, fonts, and positioning in real-time
4. **Visual Enhancement System** - Handles "Now" markers, confidence bands, and smooth rendering
5. **Interactive Layer** - Manages hover tooltips and user interactions
6. **HiDPI Optimization Engine** - Ensures crisp rendering on high-resolution displays

## Components and Interfaces

### 1. Responsive Configuration System

```typescript
interface ChartConfig {
  padding: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  fontSize: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  labelSpacing: {
    minDistance: number; // Minimum pixels between labels
    maxLabels: number;   // Maximum number of labels to show
  };
  timeIntervals: {
    [key in TimeFrame]: {
      mobile: number;    // Interval in milliseconds
      tablet: number;
      desktop: number;
    };
  };
}
```

### 2. Label Management Engine

```typescript
interface LabelManager {
  calculateOptimalLabels(
    startTime: number,
    endTime: number,
    availableWidth: number,
    fontSize: number,
    timeFrame: TimeFrame,
    deviceType: DeviceType
  ): TimeLabelConfig[];
  
  formatPriceLabel(
    price: number,
    currency: Currency,
    availableWidth: number
  ): string;
  
  checkLabelCollisions(
    labels: LabelConfig[],
    minDistance: number
  ): LabelConfig[];
}

interface TimeLabelConfig {
  timestamp: number;
  x: number;
  text: string;
  priority: 'high' | 'medium' | 'low'; // For intelligent removal
}
```

### 3. Responsive Canvas Manager

```typescript
interface ResponsiveCanvasManager {
  updateCanvasSize(canvas: HTMLCanvasElement): CanvasMetrics;
  getDeviceType(width: number): DeviceType;
  calculateDynamicPadding(width: number, height: number): PaddingConfig;
  getOptimalFontSize(deviceType: DeviceType, baseSize: number): number;
  setupHiDPICanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D;
}

interface CanvasMetrics {
  width: number;
  height: number;
  deviceType: DeviceType;
  padding: PaddingConfig;
  fontSize: number;
  pixelRatio: number;
}
```

### 4. Visual Enhancement System

```typescript
interface VisualEnhancementManager {
  drawNowMarker(
    ctx: CanvasRenderingContext2D,
    currentTime: number,
    chartBounds: ChartBounds
  ): void;
  
  drawConfidenceBand(
    ctx: CanvasRenderingContext2D,
    predictionData: PredictionPoint[],
    confidenceLevel: number
  ): void;
  
  setupSmoothRendering(ctx: CanvasRenderingContext2D): void;
}

interface PredictionPoint {
  timestamp: number;
  price: number;
  confidence: {
    upper: number;
    lower: number;
  };
}

interface ChartBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### 5. Interactive Tooltip System

```typescript
interface TooltipManager {
  showTooltip(
    event: MouseEvent,
    nearestPoint: DataPoint,
    currentPrice: number,
    targetPrice: number
  ): void;
  
  hideTooltip(): void;
  
  findNearestPoint(
    mouseX: number,
    mouseY: number,
    dataPoints: DataPoint[]
  ): DataPoint | null;
}

interface DataPoint {
  timestamp: number;
  price: number;
  x: number;
  y: number;
  type: 'historical' | 'prediction';
}

interface TooltipData {
  timestamp: number;
  price: number;
  currentPrice?: number;
  targetPrice?: number;
  confidence?: number;
}
```

## Data Models

### Device Type Classification

```typescript
type DeviceType = 'mobile' | 'tablet' | 'desktop';

const BREAKPOINTS = {
  mobile: { max: 767 },
  tablet: { min: 768, max: 1023 },
  desktop: { min: 1024 }
} as const;
```

### Timeframe-Specific Configurations

```typescript
const TIMEFRAME_CONFIGS: Record<TimeFrame, TimeframeConfig> = {
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
};
```

### Dynamic Padding System

```typescript
interface PaddingConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const calculateDynamicPadding = (width: number, height: number, deviceType: DeviceType): PaddingConfig => {
  const basePadding = {
    mobile: { top: 20, right: 15, bottom: 40, left: 50 },
    tablet: { top: 30, right: 20, bottom: 50, left: 60 },
    desktop: { top: 40, right: 25, bottom: 60, left: 70 }
  };
  
  // Adjust based on actual dimensions
  const config = basePadding[deviceType];
  return {
    top: Math.max(config.top, height * 0.05),
    right: Math.max(config.right, width * 0.03),
    bottom: Math.max(config.bottom, height * 0.12),
    left: Math.max(config.left, width * 0.08)
  };
};
```

### Axis Range Optimization

```typescript
interface AxisRange {
  min: number;
  max: number;
  padding: number;
}

const calculateOptimalAxisRange = (dataPoints: number[], paddingPercent: number = 0.75): AxisRange => {
  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min;
  const padding = range * (paddingPercent / 100);
  
  return {
    min: min - padding,
    max: max + padding,
    padding: paddingPercent
  };
};
```

### HiDPI Canvas Configuration

```typescript
const setupHiDPICanvas = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const ctx = canvas.getContext('2d')!;
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Scale canvas for crisp rendering
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  
  // Scale context to match device pixel ratio
  ctx.scale(devicePixelRatio, devicePixelRatio);
  
  // Set canvas CSS size to maintain layout
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  
  return ctx;
};
```

### Smooth Rendering Configuration

```typescript
const setupSmoothRendering = (ctx: CanvasRenderingContext2D): void => {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
};
```

## Error Handling

### Label Collision Resolution

```typescript
const resolveLabelCollisions = (labels: TimeLabelConfig[], minDistance: number): TimeLabelConfig[] => {
  // Sort by priority (high priority labels are kept)
  const sortedLabels = [...labels].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
  
  const resolvedLabels: TimeLabelConfig[] = [];
  
  for (const label of sortedLabels) {
    const hasCollision = resolvedLabels.some(existing => 
      Math.abs(existing.x - label.x) < minDistance
    );
    
    if (!hasCollision) {
      resolvedLabels.push(label);
    }
  }
  
  return resolvedLabels.sort((a, b) => a.x - b.x);
};
```

### Tooltip Error Handling

```typescript
const handleTooltipErrors = (error: Error, fallbackData: Partial<TooltipData>): void => {
  console.warn('Tooltip rendering failed:', error);
  
  // Show simplified tooltip with available data
  if (fallbackData.price && fallbackData.timestamp) {
    showSimpleTooltip(fallbackData.price, fallbackData.timestamp);
  }
};
```

### HiDPI Fallback

```typescript
const setupCanvasWithFallback = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  try {
    return setupHiDPICanvas(canvas);
  } catch (error) {
    console.warn('HiDPI setup failed, using standard canvas:', error);
    return canvas.getContext('2d')!;
  }
};
```

### Graceful Degradation

1. **Insufficient Space**: If labels still collide after intelligent removal, fall back to showing only start, middle, and end times
2. **Canvas Resize Failures**: Implement debounced resize handling with fallback dimensions
3. **Font Loading Issues**: Provide system font fallbacks with appropriate size adjustments
4. **HiDPI Failures**: Fall back to standard canvas rendering if HiDPI setup fails
5. **Tooltip Positioning**: Handle edge cases where tooltips would appear outside viewport
6. **Confidence Data Missing**: Gracefully hide confidence bands if uncertainty data unavailable

## Testing Strategy

### Unit Tests

1. **Label Calculation Tests**
   - Test optimal label calculation for each timeframe/device combination
   - Verify collision detection algorithms
   - Test edge cases (very narrow screens, very wide screens)

2. **Responsive Behavior Tests**
   - Test device type detection at various breakpoints
   - Verify padding calculations across different screen sizes
   - Test font size scaling

3. **Timeframe Adaptation Tests**
   - Verify correct interval calculation for each timeframe
   - Test label priority assignment
   - Test maximum label limits

### Integration Tests

1. **Canvas Rendering Tests**
   - Test complete chart rendering on different screen sizes
   - Verify label positioning accuracy
   - Test chart updates when switching timeframes
   - Test HiDPI rendering on high-resolution displays
   - Verify smooth line rendering with rounded caps/joins

2. **Interactive Feature Tests**
   - Test tooltip positioning and content accuracy
   - Verify "Now" marker positioning and visibility
   - Test confidence band rendering with various data sets
   - Test hover interactions across different devices

3. **Performance Tests**
   - Measure rendering time on various devices
   - Test memory usage during frequent timeframe switches
   - Verify smooth resize behavior
   - Test tooltip performance during rapid mouse movement

### Visual Regression Tests

1. **Screenshot Comparisons**
   - Capture charts at different breakpoints
   - Test all timeframe combinations
   - Verify consistent styling across devices

2. **Accessibility Tests**
   - Test screen reader compatibility
   - Verify keyboard navigation
   - Test high contrast mode rendering

### Manual Testing Scenarios

1. **Mobile Device Testing**
   - Test on actual mobile devices (iOS/Android)
   - Verify touch interactions don't interfere with labels
   - Test landscape/portrait orientation changes

2. **Cross-Browser Testing**
   - Test canvas rendering consistency
   - Verify font rendering across browsers
   - Test responsive behavior in different browsers

## Implementation Phases

### Phase 1: Responsive Foundation
- Implement device detection and breakpoint system
- Create dynamic padding calculation
- Add responsive font sizing

### Phase 2: Intelligent Label Management  
- Implement timeframe-specific interval calculation
- Add label collision detection and resolution
- Create priority-based label removal system

### Phase 3: Enhanced Formatting
- Improve price label formatting for different currencies
- Add adaptive decimal place handling
- Implement smart label truncation

### Phase 4: Performance Optimization
- Add debounced resize handling
- Implement efficient canvas redraw strategies
- Optimize label calculation algorithms

### Phase 5: Visual Enhancements
- Implement "Now" marker with timestamp label
- Add confidence band rendering for predictions
- Setup HiDPI canvas optimization
- Configure smooth line rendering (rounded caps/joins)
- Optimize axis range padding (0.5-1.0% based on data range)

### Phase 6: Interactive Features
- Implement hover tooltip system
- Add nearest point detection algorithm
- Display timestamp, price, current and target values in tooltips
- Handle tooltip positioning edge cases

### Phase 7: Accessibility & Polish
- Add screen reader support
- Implement keyboard navigation
- Add high contrast mode support
- Fine-tune visual styling