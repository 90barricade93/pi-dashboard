/**
 * Intelligent time label management engine
 * Handles optimal time interval calculation, label priority assignment, and collision detection
 */

import type { DeviceType, TimeFrame } from '@/types/chart-responsive';
import { getTimeframeConfig, getOptimalFontSize } from '@/lib/chart-responsive';

export type LabelPriority = 'high' | 'medium' | 'low';

export interface TimeLabelConfig {
  timestamp: number;
  x: number;
  text: string;
  priority: LabelPriority;
}

export interface LabelCalculationOptions {
  startTime: number;
  endTime: number;
  availableWidth: number;
  timeFrame: TimeFrame;
  deviceType: DeviceType;
  fontSize?: number;
  minDistance?: number;
}

export interface CollisionDetectionOptions {
  minDistance: number;
  preserveHighPriority?: boolean;
  fallbackToKeyPoints?: boolean;
}

/**
 * Calculates optimal time labels for the given parameters
 * @param options - Configuration options for label calculation
 * @returns Array of TimeLabelConfig objects with optimal positioning and priority
 */
export function calculateOptimalTimeLabels(options: LabelCalculationOptions): TimeLabelConfig[] {
  const {
    startTime,
    endTime,
    availableWidth,
    timeFrame,
    deviceType,
    fontSize = getOptimalFontSize(deviceType),
    minDistance = 40,
  } = options;

  // Get timeframe-specific configuration with adaptive intervals
  const timeConfig = getTimeframeConfig(timeFrame, deviceType);
  const { interval, maxLabels } = timeConfig;

  // Calculate total time range
  const totalTimeRange = endTime - startTime;

  // Generate candidate time points based on adaptive interval
  const candidateLabels: TimeLabelConfig[] = [];

  // Always include start time (high priority)
  candidateLabels.push({
    timestamp: startTime,
    x: 0,
    text: formatTimeLabel(startTime, timeFrame),
    priority: 'high',
  });

  // Generate intermediate labels based on timeframe-specific interval
  let currentTime = Math.ceil(startTime / interval) * interval;
  while (currentTime < endTime) {
    const x = ((currentTime - startTime) / totalTimeRange) * availableWidth;

    candidateLabels.push({
      timestamp: currentTime,
      x,
      text: formatTimeLabel(currentTime, timeFrame),
      priority: assignLabelPriority(currentTime, startTime, endTime, timeFrame),
    });

    currentTime += interval;
  }

  // Always include end time (high priority)
  candidateLabels.push({
    timestamp: endTime,
    x: availableWidth,
    text: formatTimeLabel(endTime, timeFrame),
    priority: 'high',
  });

  // Update x positions for all labels
  const labelsWithPositions = candidateLabels.map(label => ({
    ...label,
    x: ((label.timestamp - startTime) / totalTimeRange) * availableWidth,
  }));

  // Apply intelligent label reduction respecting maximum label limits
  const optimizedLabels = intelligentLabelReduction(
    labelsWithPositions,
    maxLabels,
    minDistance,
    fontSize
  );

  return optimizedLabels;
}

/**
 * Assigns priority to time labels based on their significance
 * @param timestamp - The timestamp of the label
 * @param startTime - Start time of the chart
 * @param endTime - End time of the chart
 * @param timeFrame - Selected timeframe
 * @returns LabelPriority - Assigned priority level
 */
export function assignLabelPriority(
  timestamp: number,
  startTime: number,
  endTime: number,
  timeFrame: TimeFrame
): LabelPriority {
  const totalRange = endTime - startTime;
  const position = (timestamp - startTime) / totalRange;

  // Start and end times are always high priority
  if (timestamp === startTime || timestamp === endTime) {
    return 'high';
  }

  // Current time (now) is high priority
  const now = Date.now();
  const timeDiffFromNow = Math.abs(timestamp - now);
  if (timeDiffFromNow < 60000) {
    // Within 1 minute of now
    return 'high';
  }

  // Middle point is high priority for longer timeframes
  if (timeFrame === '6hours' || timeFrame === '12hours') {
    if (Math.abs(position - 0.5) < 0.1) {
      // Within 10% of middle
      return 'high';
    }
  }

  // Hour boundaries are medium priority for long timeframes
  if (timeFrame === '6hours' || timeFrame === '12hours') {
    const date = new Date(timestamp);
    if (date.getMinutes() === 0) {
      return 'medium';
    }
  }

  // Quarter and three-quarter points are medium priority
  if (Math.abs(position - 0.25) < 0.05 || Math.abs(position - 0.75) < 0.05) {
    return 'medium';
  }

  // Half-hour boundaries are medium priority for shorter timeframes
  if (timeFrame === '1hour' || timeFrame === '2hours') {
    const date = new Date(timestamp);
    if (date.getMinutes() === 0 || date.getMinutes() === 30) {
      return 'medium';
    }
  }

  // Everything else is low priority
  return 'low';
}

/**
 * Detects and resolves collisions between time labels
 * @param labels - Array of time labels to check for collisions
 * @param options - Collision detection options
 * @returns Array of labels with collisions resolved
 */
export function detectAndResolveCollisions(
  labels: TimeLabelConfig[],
  options: CollisionDetectionOptions
): TimeLabelConfig[] {
  const { minDistance, preserveHighPriority = true, fallbackToKeyPoints = true } = options;

  // Sort labels by x position
  const sortedLabels = [...labels].sort((a, b) => a.x - b.x);

  if (preserveHighPriority) {
    return resolveCollisionsWithPriority(sortedLabels, minDistance, fallbackToKeyPoints);
  } else {
    return resolveCollisionsSimple(sortedLabels, minDistance);
  }
}

/**
 * Resolves label collisions using priority-based algorithm with intelligent spacing
 * @param labels - Sorted array of labels
 * @param minDistance - Minimum distance between labels
 * @param fallbackToKeyPoints - Whether to use fallback strategy for extreme cases
 * @returns Array of labels with collisions resolved
 */
function resolveCollisionsWithPriority(
  labels: TimeLabelConfig[],
  minDistance: number,
  fallbackToKeyPoints: boolean
): TimeLabelConfig[] {
  if (labels.length === 0) return [];
  if (labels.length === 1) return labels;

  // Sort labels by x position first
  const sortedLabels = [...labels].sort((a, b) => a.x - b.x);

  // Group labels by priority for intelligent selection
  const highPriorityLabels = sortedLabels.filter(l => l.priority === 'high');
  const mediumPriorityLabels = sortedLabels.filter(l => l.priority === 'medium');
  const lowPriorityLabels = sortedLabels.filter(l => l.priority === 'low');

  // Start with high priority labels and resolve collisions among them first
  let resolvedLabels = resolveHighPriorityCollisions(highPriorityLabels, minDistance);

  // Add medium priority labels if they don't collide with existing labels
  for (const label of mediumPriorityLabels) {
    if (!hasCollision(label, resolvedLabels, minDistance)) {
      resolvedLabels.push(label);
    }
  }

  // Add low priority labels if they don't collide with existing labels
  for (const label of lowPriorityLabels) {
    if (!hasCollision(label, resolvedLabels, minDistance)) {
      resolvedLabels.push(label);
    }
  }

  // Sort final result by x position
  resolvedLabels.sort((a, b) => a.x - b.x);

  // Check if we still have collisions after priority-based resolution
  if (hasAnyCollisions(resolvedLabels, minDistance)) {
    if (fallbackToKeyPoints) {
      // Use advanced fallback strategy for extreme space constraints
      return createAdvancedFallbackLabels(sortedLabels, minDistance);
    } else {
      // Apply final collision resolution pass
      resolvedLabels = applyFinalCollisionResolution(resolvedLabels, minDistance);
    }
  }

  return resolvedLabels;
}

/**
 * Resolves collisions among high priority labels using intelligent spacing
 * @param highPriorityLabels - Array of high priority labels
 * @param minDistance - Minimum distance between labels
 * @returns Array of high priority labels with collisions resolved
 */
function resolveHighPriorityCollisions(
  highPriorityLabels: TimeLabelConfig[],
  minDistance: number
): TimeLabelConfig[] {
  if (highPriorityLabels.length <= 1) return highPriorityLabels;

  const sortedLabels = [...highPriorityLabels].sort((a, b) => a.x - b.x);
  const resolvedLabels: TimeLabelConfig[] = [sortedLabels[0]]; // Always keep first

  for (let i = 1; i < sortedLabels.length; i++) {
    const currentLabel = sortedLabels[i];
    const lastResolvedLabel = resolvedLabels[resolvedLabels.length - 1];

    // Check if current label collides with the last resolved label
    if (currentLabel.x - lastResolvedLabel.x >= minDistance) {
      resolvedLabels.push(currentLabel);
    } else {
      // For high priority labels, try to find a compromise position
      const compromisePosition = findCompromisePosition(
        lastResolvedLabel,
        currentLabel,
        minDistance,
        sortedLabels[0].x,
        sortedLabels[sortedLabels.length - 1].x
      );

      if (compromisePosition !== null) {
        // Adjust the current label position
        resolvedLabels.push({
          ...currentLabel,
          x: compromisePosition,
        });
      }
      // If no compromise possible, skip this label (prioritize the earlier one)
    }
  }

  return resolvedLabels;
}

/**
 * Finds a compromise position for colliding high priority labels
 * @param firstLabel - First label in collision
 * @param secondLabel - Second label in collision
 * @param minDistance - Minimum required distance
 * @param minX - Minimum allowed x position
 * @param maxX - Maximum allowed x position
 * @returns Compromise position or null if not possible
 */
function findCompromisePosition(
  firstLabel: TimeLabelConfig,
  secondLabel: TimeLabelConfig,
  minDistance: number,
  minX: number,
  maxX: number
): number | null {
  // Try to place the second label at minimum distance from the first
  const proposedPosition = firstLabel.x + minDistance;

  // Check if the proposed position is within bounds
  if (proposedPosition <= maxX) {
    return proposedPosition;
  }

  // If not possible, try to move the first label back slightly
  const alternativeFirstPosition = secondLabel.x - minDistance;
  if (alternativeFirstPosition >= minX) {
    return secondLabel.x; // Keep second label in original position
  }

  return null; // No compromise possible
}

/**
 * Creates advanced fallback labels for extreme space constraints
 * @param originalLabels - Original array of labels
 * @param minDistance - Minimum distance between labels
 * @returns Array of fallback labels optimized for readability
 */
function createAdvancedFallbackLabels(
  originalLabels: TimeLabelConfig[],
  minDistance: number
): TimeLabelConfig[] {
  if (originalLabels.length === 0) return [];

  const sortedLabels = [...originalLabels].sort((a, b) => a.x - b.x);
  const startLabel = sortedLabels[0];
  const endLabel = sortedLabels[sortedLabels.length - 1];
  const totalWidth = endLabel.x - startLabel.x;

  // If we can't fit even start and end labels, return just the start
  if (totalWidth < minDistance) {
    return [{ ...startLabel, priority: 'high' as LabelPriority }];
  }

  // Calculate how many labels we can fit
  const maxPossibleLabels = Math.floor(totalWidth / minDistance) + 1;

  if (maxPossibleLabels <= 2) {
    // Only start and end fit
    return [
      { ...startLabel, priority: 'high' as LabelPriority },
      { ...endLabel, priority: 'high' as LabelPriority },
    ];
  } else if (maxPossibleLabels === 3) {
    // Start, middle, and end fit
    const middleX = (startLabel.x + endLabel.x) / 2;
    const middleLabel = findClosestLabel(sortedLabels, middleX);

    return [
      { ...startLabel, priority: 'high' as LabelPriority },
      { ...middleLabel, x: middleX, priority: 'high' as LabelPriority },
      { ...endLabel, priority: 'high' as LabelPriority },
    ];
  } else {
    // We can fit more labels - use intelligent distribution
    return createIntelligentDistribution(sortedLabels, maxPossibleLabels, minDistance);
  }
}

/**
 * Finds the label closest to a target x position
 * @param labels - Array of labels to search
 * @param targetX - Target x position
 * @returns Label closest to target position
 */
function findClosestLabel(labels: TimeLabelConfig[], targetX: number): TimeLabelConfig {
  return labels.reduce((closest, current) =>
    Math.abs(current.x - targetX) < Math.abs(closest.x - targetX) ? current : closest
  );
}

/**
 * Creates intelligent label distribution for available space
 * @param labels - Original labels
 * @param maxLabels - Maximum number of labels that can fit
 * @param minDistance - Minimum distance between labels
 * @returns Optimally distributed labels
 */
function createIntelligentDistribution(
  labels: TimeLabelConfig[],
  maxLabels: number,
  minDistance: number
): TimeLabelConfig[] {
  const sortedLabels = [...labels].sort((a, b) => a.x - b.x);
  const startLabel = sortedLabels[0];
  const endLabel = sortedLabels[sortedLabels.length - 1];
  const totalWidth = endLabel.x - startLabel.x;

  // Calculate optimal spacing
  const optimalSpacing = totalWidth / (maxLabels - 1);
  const actualSpacing = Math.max(optimalSpacing, minDistance);

  const distributedLabels: TimeLabelConfig[] = [
    { ...startLabel, priority: 'high' as LabelPriority },
  ];

  // Distribute labels evenly across the available space
  for (let i = 1; i < maxLabels - 1; i++) {
    const targetX = startLabel.x + i * actualSpacing;
    const closestLabel = findClosestLabel(sortedLabels, targetX);

    distributedLabels.push({
      ...closestLabel,
      x: targetX,
      priority: 'high' as LabelPriority,
    });
  }

  distributedLabels.push({ ...endLabel, priority: 'high' as LabelPriority });

  return distributedLabels;
}

/**
 * Applies final collision resolution pass for remaining conflicts
 * @param labels - Labels with potential remaining collisions
 * @param minDistance - Minimum distance between labels
 * @returns Labels with all collisions resolved
 */
function applyFinalCollisionResolution(
  labels: TimeLabelConfig[],
  minDistance: number
): TimeLabelConfig[] {
  const sortedLabels = [...labels].sort((a, b) => a.x - b.x);
  const resolvedLabels: TimeLabelConfig[] = [];

  for (const label of sortedLabels) {
    if (resolvedLabels.length === 0) {
      resolvedLabels.push(label);
    } else {
      const lastLabel = resolvedLabels[resolvedLabels.length - 1];

      if (label.x - lastLabel.x >= minDistance) {
        resolvedLabels.push(label);
      } else {
        // Skip this label to maintain minimum distance
        // Priority was already considered in earlier passes
      }
    }
  }

  return resolvedLabels;
}

/**
 * Simple collision resolution without priority consideration
 * @param labels - Sorted array of labels
 * @param minDistance - Minimum distance between labels
 * @returns Array of labels with collisions resolved
 */
function resolveCollisionsSimple(
  labels: TimeLabelConfig[],
  minDistance: number
): TimeLabelConfig[] {
  const resolvedLabels: TimeLabelConfig[] = [];

  for (const label of labels) {
    if (!hasCollision(label, resolvedLabels, minDistance)) {
      resolvedLabels.push(label);
    }
  }

  return resolvedLabels;
}

/**
 * Checks if a label collides with any existing labels
 * @param label - Label to check
 * @param existingLabels - Array of existing labels
 * @param minDistance - Minimum distance between labels
 * @returns boolean - True if collision detected
 */
function hasCollision(
  label: TimeLabelConfig,
  existingLabels: TimeLabelConfig[],
  minDistance: number
): boolean {
  return existingLabels.some(existing => Math.abs(existing.x - label.x) < minDistance);
}

/**
 * Checks if any labels in the array have collisions
 * @param labels - Array of labels to check
 * @param minDistance - Minimum distance between labels
 * @returns boolean - True if any collisions exist
 */
function hasAnyCollisions(labels: TimeLabelConfig[], minDistance: number): boolean {
  for (let i = 0; i < labels.length - 1; i++) {
    if (Math.abs(labels[i + 1].x - labels[i].x) < minDistance) {
      return true;
    }
  }
  return false;
}

/**
 * Creates fallback labels showing only key points (start, middle, end)
 * @param originalLabels - Original array of labels
 * @returns Array of key point labels
 */
export function createKeyPointLabels(originalLabels: TimeLabelConfig[]): TimeLabelConfig[] {
  if (originalLabels.length === 0) return [];

  const sortedLabels = [...originalLabels].sort((a, b) => a.x - b.x);
  const startLabel = sortedLabels[0];
  const endLabel = sortedLabels[sortedLabels.length - 1];

  // Find middle label (closest to center)
  const centerX = (startLabel.x + endLabel.x) / 2;
  const middleLabel = sortedLabels.reduce((closest, current) =>
    Math.abs(current.x - centerX) < Math.abs(closest.x - centerX) ? current : closest
  );

  return [
    { ...startLabel, priority: 'high' as LabelPriority },
    { ...middleLabel, priority: 'high' as LabelPriority },
    { ...endLabel, priority: 'high' as LabelPriority },
  ].filter(
    (label, index, array) =>
      // Remove duplicates
      array.findIndex(l => l.timestamp === label.timestamp) === index
  );
}

/**
 * Applies intelligent label reduction based on available space and constraints
 * @param labels - Array of candidate labels
 * @param maxLabels - Maximum number of labels allowed
 * @param minDistance - Minimum distance between labels
 * @param fontSize - Font size for text width estimation
 * @returns Array of optimized labels
 */
function intelligentLabelReduction(
  labels: TimeLabelConfig[],
  maxLabels: number,
  minDistance: number,
  _fontSize: number
): TimeLabelConfig[] {
  // First, resolve collisions with priority
  let optimizedLabels = resolveCollisionsWithPriority(labels, minDistance, true);

  // If still too many labels, reduce by priority
  if (optimizedLabels.length > maxLabels) {
    // Keep all high priority labels
    const highPriority = optimizedLabels.filter(l => l.priority === 'high');
    const mediumPriority = optimizedLabels.filter(l => l.priority === 'medium');
    const lowPriority = optimizedLabels.filter(l => l.priority === 'low');

    // Calculate how many more labels we can add
    const remainingSlots = maxLabels - highPriority.length;

    if (remainingSlots > 0) {
      // Add medium priority labels first, then low priority
      const additionalLabels = [
        ...mediumPriority.slice(0, Math.max(0, remainingSlots)),
        ...lowPriority.slice(0, Math.max(0, remainingSlots - mediumPriority.length)),
      ];

      optimizedLabels = [...highPriority, ...additionalLabels];
    } else {
      optimizedLabels = highPriority;
    }
  }

  // Final collision check and sort
  optimizedLabels = detectAndResolveCollisions(optimizedLabels, {
    minDistance,
    preserveHighPriority: true,
    fallbackToKeyPoints: true,
  });

  return optimizedLabels.sort((a, b) => a.x - b.x);
}

/**
 * Formats timestamp into appropriate time label text
 * @param timestamp - Timestamp to format
 * @param timeFrame - Current timeframe for context
 * @returns Formatted time string
 */
function formatTimeLabel(timestamp: number, timeFrame: TimeFrame): string {
  const date = new Date(timestamp);

  // For shorter timeframes, show hours and minutes
  if (timeFrame === '30min' || timeFrame === '1hour') {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  // For longer timeframes, show hours only or date if crossing days
  if (timeFrame === '2hours') {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  // For 6+ hour timeframes, show hour or date
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return (
      date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        hour12: false,
      }) + ':00'
    );
  } else {
    // Show date for different days
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Estimates the width of a text label in pixels
 * @param text - Text to measure
 * @param fontSize - Font size in pixels
 * @returns Estimated width in pixels
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  // Approximate character width based on font size (monospace assumption)
  const charWidth = fontSize * 0.6;
  return text.length * charWidth;
}

/**
 * Calculates the minimum distance needed between labels based on text width
 * @param labels - Array of labels to analyze
 * @param fontSize - Font size in pixels
 * @param buffer - Additional buffer space between labels
 * @returns Minimum distance in pixels
 */
export function calculateMinimumLabelDistance(
  labels: TimeLabelConfig[],
  fontSize: number,
  buffer: number = 8
): number {
  if (labels.length === 0) return 40; // Default minimum

  // Find the longest label text
  const longestText = labels.reduce(
    (longest, current) => (current.text.length > longest.length ? current.text : longest),
    ''
  );

  const textWidth = estimateTextWidth(longestText, fontSize);
  return textWidth + buffer;
}

/**
 * Generates adaptive grid intervals based on timeframe and device type
 * @param startTime - Start timestamp
 * @param endTime - End timestamp
 * @param timeFrame - Selected timeframe
 * @param deviceType - Device type (mobile, tablet, desktop)
 * @returns Array of timestamps for grid lines
 */
export function generateAdaptiveGridIntervals(
  startTime: number,
  endTime: number,
  timeFrame: TimeFrame,
  deviceType: DeviceType
): number[] {
  const timeConfig = getTimeframeConfig(timeFrame, deviceType);
  const { interval } = timeConfig;

  const gridIntervals: number[] = [];

  // Generate grid lines at the same intervals as time labels
  let currentTime = Math.ceil(startTime / interval) * interval;

  while (currentTime <= endTime) {
    gridIntervals.push(currentTime);
    currentTime += interval;
  }

  return gridIntervals;
}

/**
 * Advanced collision resolution with readability optimization
 * @param labels - Array of labels to optimize
 * @param availableWidth - Total available width
 * @param minDistance - Minimum distance between labels
 * @param fontSize - Font size for text width calculation
 * @returns Optimized labels that maintain readability
 */
export function resolveCollisionsWithReadability(
  labels: TimeLabelConfig[],
  availableWidth: number,
  minDistance: number,
  fontSize: number
): TimeLabelConfig[] {
  if (labels.length === 0) return [];

  // Calculate actual minimum distance based on text width
  const actualMinDistance = Math.max(minDistance, calculateMinimumLabelDistance(labels, fontSize));

  // Use enhanced collision detection
  const collisionOptions: CollisionDetectionOptions = {
    minDistance: actualMinDistance,
    preserveHighPriority: true,
    fallbackToKeyPoints: true,
  };

  let resolvedLabels = detectAndResolveCollisions(labels, collisionOptions);

  // If we still have issues, apply readability-focused optimization
  if (hasReadabilityIssues(resolvedLabels, availableWidth, actualMinDistance)) {
    resolvedLabels = optimizeForReadability(resolvedLabels, availableWidth, actualMinDistance);
  }

  return resolvedLabels;
}

/**
 * Checks if labels have readability issues
 * @param labels - Array of labels to check
 * @param availableWidth - Total available width
 * @param minDistance - Minimum distance between labels
 * @returns True if readability issues are detected
 */
function hasReadabilityIssues(
  labels: TimeLabelConfig[],
  availableWidth: number,
  minDistance: number
): boolean {
  if (labels.length === 0) return false;

  // Check if labels are too crowded
  const totalRequiredWidth = (labels.length - 1) * minDistance;
  if (totalRequiredWidth > availableWidth * 0.9) {
    return true;
  }

  // Check for any remaining collisions
  if (hasAnyCollisions(labels, minDistance)) {
    return true;
  }

  // Check if labels are too sparse (poor use of space)
  const sortedLabels = [...labels].sort((a, b) => a.x - b.x);
  const actualSpread = sortedLabels[sortedLabels.length - 1].x - sortedLabels[0].x;
  if (actualSpread < availableWidth * 0.5 && labels.length < 3) {
    return true;
  }

  return false;
}

/**
 * Optimizes labels specifically for readability
 * @param labels - Array of labels to optimize
 * @param availableWidth - Total available width
 * @param minDistance - Minimum distance between labels
 * @returns Readability-optimized labels
 */
function optimizeForReadability(
  labels: TimeLabelConfig[],
  availableWidth: number,
  minDistance: number
): TimeLabelConfig[] {
  const sortedLabels = [...labels].sort((a, b) => a.x - b.x);

  // Calculate maximum labels that can fit with good readability
  const maxReadableLabels = Math.floor(availableWidth / (minDistance * 1.2)) + 1;

  if (sortedLabels.length <= maxReadableLabels) {
    return sortedLabels;
  }

  // Reduce to most important labels
  const highPriorityLabels = sortedLabels.filter(l => l.priority === 'high');

  if (highPriorityLabels.length <= maxReadableLabels) {
    // Add some medium priority labels if space allows
    const mediumPriorityLabels = sortedLabels.filter(l => l.priority === 'medium');
    const remainingSlots = maxReadableLabels - highPriorityLabels.length;

    const additionalLabels = mediumPriorityLabels
      .slice(0, remainingSlots)
      .filter(label => !hasCollision(label, highPriorityLabels, minDistance));

    return [...highPriorityLabels, ...additionalLabels].sort((a, b) => a.x - b.x);
  }

  // If even high priority labels don't fit, use advanced fallback
  return createAdvancedFallbackLabels(sortedLabels, minDistance);
}

/**
 * Validates collision resolution results
 * @param originalLabels - Original labels before resolution
 * @param resolvedLabels - Labels after collision resolution
 * @param minDistance - Minimum distance requirement
 * @returns Validation result with details
 */
export function validateCollisionResolution(
  originalLabels: TimeLabelConfig[],
  resolvedLabels: TimeLabelConfig[],
  minDistance: number
): {
  isValid: boolean;
  hasCollisions: boolean;
  preservedHighPriority: boolean;
  reductionRatio: number;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for remaining collisions
  const hasCollisions = hasAnyCollisions(resolvedLabels, minDistance);
  if (hasCollisions) {
    issues.push('Collisions still exist after resolution');
  }

  // Check if high priority labels were preserved
  const originalHighPriority = originalLabels.filter(l => l.priority === 'high').length;
  const resolvedHighPriority = resolvedLabels.filter(l => l.priority === 'high').length;
  const preservedHighPriority = resolvedHighPriority >= Math.min(originalHighPriority, 2);

  if (!preservedHighPriority) {
    issues.push('High priority labels were not adequately preserved');
  }

  // Calculate reduction ratio
  const reductionRatio =
    originalLabels.length > 0 ? resolvedLabels.length / originalLabels.length : 1;

  if (reductionRatio < 0.3 && originalLabels.length > 3) {
    issues.push('Excessive label reduction may impact usability');
  }

  // Check label ordering
  const sortedResolved = [...resolvedLabels].sort((a, b) => a.x - b.x);
  const isProperlyOrdered = resolvedLabels.every(
    (label, index) => label.x === sortedResolved[index].x
  );

  if (!isProperlyOrdered) {
    issues.push('Labels are not properly ordered by position');
  }

  return {
    isValid: issues.length === 0,
    hasCollisions,
    preservedHighPriority,
    reductionRatio,
    issues,
  };
}

/**
 * Calculates smooth transition parameters when switching between timeframes
 * @param fromTimeFrame - Previous timeframe
 * @param toTimeFrame - New timeframe
 * @param deviceType - Device type
 * @returns Transition configuration for smooth animation
 */
export function calculateTimeframeTransition(
  fromTimeFrame: TimeFrame,
  toTimeFrame: TimeFrame,
  deviceType: DeviceType
): {
  duration: number;
  easing: 'ease-in-out' | 'ease-out' | 'linear';
  shouldAnimateLabels: boolean;
  shouldAnimateGrid: boolean;
} {
  // Get configurations for both timeframes
  const fromConfig = getTimeframeConfig(fromTimeFrame, deviceType);
  const toConfig = getTimeframeConfig(toTimeFrame, deviceType);

  // Calculate transition duration based on complexity change
  const complexityChange = Math.abs(toConfig.maxLabels - fromConfig.maxLabels);
  const intervalChange =
    Math.abs(toConfig.interval - fromConfig.interval) /
    Math.min(toConfig.interval, fromConfig.interval);

  // Base duration adjusted for device performance
  const baseDuration = deviceType === 'mobile' ? 200 : deviceType === 'tablet' ? 250 : 300;
  const duration = baseDuration + complexityChange * 50 + intervalChange * 100;

  // Determine if we should animate different elements
  const shouldAnimateLabels = complexityChange > 0 || intervalChange > 0.5;
  const shouldAnimateGrid = intervalChange > 0.2;

  // Choose easing based on transition type
  const easing = intervalChange > 1 ? 'ease-in-out' : 'ease-out';

  return {
    duration: Math.min(duration, 500), // Cap at 500ms for performance
    easing,
    shouldAnimateLabels,
    shouldAnimateGrid,
  };
}
