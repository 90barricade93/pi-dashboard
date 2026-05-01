/**
 * Unit tests for intelligent time label management engine
 */

import {
  calculateOptimalTimeLabels,
  assignLabelPriority,
  detectAndResolveCollisions,
  estimateTextWidth,
  calculateMinimumLabelDistance,
  resolveCollisionsWithReadability,
  validateCollisionResolution,
  type TimeLabelConfig,
  type LabelCalculationOptions,
  type CollisionDetectionOptions,
} from '@/lib/time-label-manager';
import type { DeviceType, TimeFrame } from '@/types/chart-responsive';

describe('Time Label Manager', () => {
  // Test data setup
  const mockStartTime = new Date('2024-01-01T10:00:00Z').getTime();
  const mockEndTime = new Date('2024-01-01T12:00:00Z').getTime(); // 2 hours later
  const mockAvailableWidth = 800;

  describe('calculateOptimalTimeLabels', () => {
    it('should generate appropriate number of labels for mobile 30min timeframe', () => {
      const options: LabelCalculationOptions = {
        startTime: mockStartTime,
        endTime: mockStartTime + 30 * 60 * 1000, // 30 minutes
        availableWidth: 400, // Mobile width
        timeFrame: '30min',
        deviceType: 'mobile',
      };

      const labels = calculateOptimalTimeLabels(options);

      expect(labels.length).toBeLessThanOrEqual(4); // Mobile max for 30min
      expect(labels[0].priority).toBe('high'); // Start time
      expect(labels[labels.length - 1].priority).toBe('high'); // End time
    });

    it('should generate more labels for desktop than mobile', () => {
      const baseOptions: LabelCalculationOptions = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        availableWidth: mockAvailableWidth,
        timeFrame: '2hours',
        deviceType: 'mobile',
      };

      const mobileLabels = calculateOptimalTimeLabels(baseOptions);
      const desktopLabels = calculateOptimalTimeLabels({
        ...baseOptions,
        deviceType: 'desktop',
      });

      expect(desktopLabels.length).toBeGreaterThanOrEqual(mobileLabels.length);
    });

    it('should position labels correctly across available width', () => {
      const options: LabelCalculationOptions = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        availableWidth: mockAvailableWidth,
        timeFrame: '2hours',
        deviceType: 'desktop',
      };

      const labels = calculateOptimalTimeLabels(options);

      // First label should be at x=0
      expect(labels[0].x).toBe(0);

      // Last label should be at x=availableWidth
      expect(labels[labels.length - 1].x).toBe(mockAvailableWidth);

      // Labels should be in ascending x order
      for (let i = 1; i < labels.length; i++) {
        expect(labels[i].x).toBeGreaterThan(labels[i - 1].x);
      }
    });

    it('should respect maximum label limits for each timeframe', () => {
      const timeframes: TimeFrame[] = ['30min', '1hour', '2hours', '6hours', '12hours'];

      timeframes.forEach(timeFrame => {
        const options: LabelCalculationOptions = {
          startTime: mockStartTime,
          endTime: mockStartTime + parseInt(timeFrame) * 60 * 60 * 1000,
          availableWidth: mockAvailableWidth,
          timeFrame,
          deviceType: 'desktop',
        };

        const labels = calculateOptimalTimeLabels(options);

        // Should not exceed reasonable limits (8 is max for desktop)
        expect(labels.length).toBeLessThanOrEqual(8);
      });
    });

    it('should handle edge case with very narrow width', () => {
      const options: LabelCalculationOptions = {
        startTime: mockStartTime,
        endTime: mockEndTime,
        availableWidth: 100, // Very narrow
        timeFrame: '2hours',
        deviceType: 'mobile',
      };

      const labels = calculateOptimalTimeLabels(options);

      // Should still generate at least start and end labels
      expect(labels.length).toBeGreaterThanOrEqual(2);
      expect(labels[0].x).toBe(0);
      expect(labels[labels.length - 1].x).toBe(100);
    });
  });

  describe('assignLabelPriority', () => {
    it('should assign high priority to start and end times', () => {
      const startPriority = assignLabelPriority(
        mockStartTime,
        mockStartTime,
        mockEndTime,
        '2hours'
      );
      const endPriority = assignLabelPriority(mockEndTime, mockStartTime, mockEndTime, '2hours');

      expect(startPriority).toBe('high');
      expect(endPriority).toBe('high');
    });

    it('should assign high priority to current time', () => {
      const now = Date.now();
      const priority = assignLabelPriority(now, now - 3600000, now + 3600000, '2hours');

      expect(priority).toBe('high');
    });

    it('should assign medium priority to quarter points', () => {
      const timeRange = mockEndTime - mockStartTime;
      const quarterTime = mockStartTime + timeRange * 0.25;
      const priority = assignLabelPriority(quarterTime, mockStartTime, mockEndTime, '2hours');

      expect(priority).toBe('medium');
    });

    it('should assign medium priority to hour boundaries for long timeframes', () => {
      // Use a 6-hour range to test hour boundaries properly
      const sixHourStart = new Date('2024-01-01T10:00:00Z').getTime();
      const sixHourEnd = new Date('2024-01-01T16:00:00Z').getTime(); // 6 hours later
      const hourBoundary = new Date('2024-01-01T12:00:00Z').getTime(); // 2 hours in, not middle
      const priority = assignLabelPriority(hourBoundary, sixHourStart, sixHourEnd, '6hours');

      expect(priority).toBe('medium');
    });

    it('should assign low priority to other times', () => {
      const randomTime = mockStartTime + 15 * 60 * 1000; // 15 minutes after start
      const priority = assignLabelPriority(randomTime, mockStartTime, mockEndTime, '2hours');

      expect(priority).toBe('low');
    });
  });

  describe('detectAndResolveCollisions', () => {
    const createMockLabels = (): TimeLabelConfig[] => [
      { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
      { timestamp: mockStartTime + 1800000, x: 30, text: '10:30', priority: 'medium' }, // Too close!
      { timestamp: mockStartTime + 3600000, x: 100, text: '11:00', priority: 'medium' },
      { timestamp: mockStartTime + 5400000, x: 150, text: '11:30', priority: 'low' },
      { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
    ];

    it('should detect and resolve collisions', () => {
      const labels = createMockLabels();
      const options: CollisionDetectionOptions = {
        minDistance: 50,
        preserveHighPriority: true,
      };

      const resolvedLabels = detectAndResolveCollisions(labels, options);

      // Should have fewer labels due to collision resolution
      expect(resolvedLabels.length).toBeLessThan(labels.length);

      // High priority labels should be preserved
      const highPriorityCount = resolvedLabels.filter(l => l.priority === 'high').length;
      expect(highPriorityCount).toBe(2); // Start and end
    });

    it('should preserve high priority labels during collision resolution', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 20, text: '10:30', priority: 'low' }, // Collides with start
        { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 50,
        preserveHighPriority: true,
      };

      const resolvedLabels = detectAndResolveCollisions(labels, options);

      // Should keep high priority labels and remove colliding low priority
      expect(resolvedLabels.length).toBe(2);
      expect(resolvedLabels.every(l => l.priority === 'high')).toBe(true);
    });

    it('should fall back to key points when collision resolution fails', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 900000, x: 10, text: '10:15', priority: 'high' }, // Too close
        { timestamp: mockStartTime + 1800000, x: 20, text: '10:30', priority: 'high' }, // Too close
        { timestamp: mockEndTime, x: 30, text: '12:00', priority: 'high' }, // Too close
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 50,
        preserveHighPriority: true,
        fallbackToKeyPoints: true,
      };

      const resolvedLabels = detectAndResolveCollisions(labels, options);

      // Should fall back to key points (start, middle, end)
      expect(resolvedLabels.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty label array', () => {
      const labels: TimeLabelConfig[] = [];
      const options: CollisionDetectionOptions = {
        minDistance: 50,
      };

      const resolvedLabels = detectAndResolveCollisions(labels, options);

      expect(resolvedLabels).toEqual([]);
    });

    it('should handle single label', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
      ];
      const options: CollisionDetectionOptions = {
        minDistance: 50,
      };

      const resolvedLabels = detectAndResolveCollisions(labels, options);

      expect(resolvedLabels).toEqual(labels);
    });

    it('should resolve collisions among high priority labels intelligently', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 900000, x: 25, text: '10:15', priority: 'high' }, // Close to start
        { timestamp: mockStartTime + 1800000, x: 45, text: '10:30', priority: 'high' }, // Close to previous
        { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 50,
        preserveHighPriority: true,
        fallbackToKeyPoints: false,
      };

      const resolvedLabels = detectAndResolveCollisions(labels, options);

      // Should maintain proper spacing between resolved labels
      for (let i = 1; i < resolvedLabels.length; i++) {
        expect(resolvedLabels[i].x - resolvedLabels[i - 1].x).toBeGreaterThanOrEqual(50);
      }

      // Should preserve at least start and end
      expect(resolvedLabels.length).toBeGreaterThanOrEqual(2);
      expect(resolvedLabels[0].x).toBe(0);
      expect(resolvedLabels[resolvedLabels.length - 1].x).toBe(200);
    });

    it('should handle extreme space constraints with advanced fallback', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 900000, x: 20, text: '10:15', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 40, text: '10:30', priority: 'medium' },
        { timestamp: mockStartTime + 2700000, x: 60, text: '10:45', priority: 'low' },
        { timestamp: mockEndTime, x: 80, text: '12:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 100, // Very large minimum distance
        preserveHighPriority: true,
        fallbackToKeyPoints: true,
      };

      const resolvedLabels = detectAndResolveCollisions(labels, options);

      // Should use advanced fallback strategy
      expect(resolvedLabels.length).toBeLessThanOrEqual(2); // Only start and end can fit
      expect(resolvedLabels[0].x).toBe(0);

      if (resolvedLabels.length > 1) {
        expect(resolvedLabels[resolvedLabels.length - 1].x).toBe(80);
      }
    });

    it('should maintain label ordering after collision resolution', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 3600000, x: 100, text: '11:00', priority: 'medium' },
        { timestamp: mockStartTime + 1800000, x: 50, text: '10:30', priority: 'low' }, // Out of order
        { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 40,
        preserveHighPriority: true,
      };

      const resolvedLabels = detectAndResolveCollisions(labels, options);

      // Should be ordered by x position
      for (let i = 1; i < resolvedLabels.length; i++) {
        expect(resolvedLabels[i].x).toBeGreaterThan(resolvedLabels[i - 1].x);
      }
    });

    it('should handle labels with identical positions', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 100, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 100, text: '10:30', priority: 'medium' }, // Same position
        { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 50,
        preserveHighPriority: true,
      };

      const resolvedLabels = detectAndResolveCollisions(labels, options);

      // Should resolve the collision by keeping the high priority label
      expect(resolvedLabels.length).toBe(2);
      expect(resolvedLabels.find(l => l.x === 100)?.priority).toBe('high');
    });
  });

  describe('estimateTextWidth', () => {
    it('should estimate text width based on font size', () => {
      const text = '10:30';
      const fontSize = 12;

      const width = estimateTextWidth(text, fontSize);

      expect(width).toBeGreaterThan(0);
      expect(width).toBe(text.length * fontSize * 0.6);
    });

    it('should return larger width for longer text', () => {
      const shortText = '10:00';
      const longText = '10:30:45';
      const fontSize = 12;

      const shortWidth = estimateTextWidth(shortText, fontSize);
      const longWidth = estimateTextWidth(longText, fontSize);

      expect(longWidth).toBeGreaterThan(shortWidth);
    });

    it('should scale with font size', () => {
      const text = '10:30';
      const smallFont = 10;
      const largeFont = 16;

      const smallWidth = estimateTextWidth(text, smallFont);
      const largeWidth = estimateTextWidth(text, largeFont);

      expect(largeWidth).toBeGreaterThan(smallWidth);
    });
  });

  describe('calculateMinimumLabelDistance', () => {
    it('should calculate minimum distance based on longest label', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 50, text: '10:30:45', priority: 'medium' }, // Longest
        { timestamp: mockEndTime, x: 100, text: '12:00', priority: 'high' },
      ];
      const fontSize = 12;

      const minDistance = calculateMinimumLabelDistance(labels, fontSize);

      const expectedWidth = estimateTextWidth('10:30:45', fontSize) + 8; // 8 is default buffer
      expect(minDistance).toBe(expectedWidth);
    });

    it('should return default minimum for empty array', () => {
      const labels: TimeLabelConfig[] = [];
      const fontSize = 12;

      const minDistance = calculateMinimumLabelDistance(labels, fontSize);

      expect(minDistance).toBe(40); // Default minimum
    });

    it('should include buffer in calculation', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
      ];
      const fontSize = 12;
      const buffer = 16;

      const minDistance = calculateMinimumLabelDistance(labels, fontSize, buffer);

      const expectedWidth = estimateTextWidth('10:00', fontSize) + buffer;
      expect(minDistance).toBe(expectedWidth);
    });
  });

  describe('Advanced Collision Resolution', () => {
    describe('resolveCollisionsWithReadability', () => {
      it('should optimize labels for readability', () => {
        const labels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockStartTime + 900000, x: 25, text: '10:15', priority: 'medium' },
          { timestamp: mockStartTime + 1800000, x: 45, text: '10:30', priority: 'medium' },
          { timestamp: mockStartTime + 2700000, x: 65, text: '10:45', priority: 'low' },
          { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
        ];

        const resolvedLabels = resolveCollisionsWithReadability(labels, 200, 50, 12);

        // Should maintain readability by ensuring proper spacing
        for (let i = 1; i < resolvedLabels.length; i++) {
          expect(resolvedLabels[i].x - resolvedLabels[i - 1].x).toBeGreaterThanOrEqual(50);
        }

        // Should preserve high priority labels
        const highPriorityCount = resolvedLabels.filter(l => l.priority === 'high').length;
        expect(highPriorityCount).toBeGreaterThanOrEqual(2);
      });

      it('should handle very narrow spaces gracefully', () => {
        const labels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockStartTime + 1800000, x: 30, text: '10:30', priority: 'medium' },
          { timestamp: mockEndTime, x: 60, text: '12:00', priority: 'high' },
        ];

        const resolvedLabels = resolveCollisionsWithReadability(labels, 60, 50, 12);

        // Should fall back to minimal labels for very narrow spaces
        expect(resolvedLabels.length).toBeLessThanOrEqual(2);
        expect(resolvedLabels[0].x).toBe(0);
      });

      it('should calculate minimum distance based on text width', () => {
        const labels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00:00', priority: 'high' }, // Long text
          { timestamp: mockEndTime, x: 100, text: '12:00:00', priority: 'high' },
        ];

        const resolvedLabels = resolveCollisionsWithReadability(labels, 200, 30, 12);

        // Should use text-based minimum distance rather than the provided 30px
        expect(resolvedLabels.length).toBe(2);
        // The actual minimum distance should be calculated based on text width
      });
    });

    describe('validateCollisionResolution', () => {
      it('should validate successful collision resolution', () => {
        const originalLabels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockStartTime + 1800000, x: 30, text: '10:30', priority: 'medium' },
          { timestamp: mockStartTime + 3600000, x: 100, text: '11:00', priority: 'medium' },
          { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
        ];

        const resolvedLabels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockStartTime + 3600000, x: 100, text: '11:00', priority: 'medium' },
          { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
        ];

        const validation = validateCollisionResolution(originalLabels, resolvedLabels, 50);

        expect(validation.isValid).toBe(true);
        expect(validation.hasCollisions).toBe(false);
        expect(validation.preservedHighPriority).toBe(true);
        expect(validation.reductionRatio).toBe(0.75); // 3/4 labels preserved
        expect(validation.issues).toHaveLength(0);
      });

      it('should detect remaining collisions', () => {
        const originalLabels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
        ];

        const resolvedLabels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockEndTime, x: 30, text: '12:00', priority: 'high' }, // Too close!
        ];

        const validation = validateCollisionResolution(originalLabels, resolvedLabels, 50);

        expect(validation.isValid).toBe(false);
        expect(validation.hasCollisions).toBe(true);
        expect(validation.issues).toContain('Collisions still exist after resolution');
      });

      it('should detect loss of high priority labels', () => {
        const originalLabels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockStartTime + 1800000, x: 50, text: '10:30', priority: 'high' },
          { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
        ];

        const resolvedLabels: TimeLabelConfig[] = [
          { timestamp: mockStartTime + 1800000, x: 50, text: '10:30', priority: 'medium' }, // Lost high priority
        ];

        const validation = validateCollisionResolution(originalLabels, resolvedLabels, 50);

        expect(validation.isValid).toBe(false);
        expect(validation.preservedHighPriority).toBe(false);
        expect(validation.issues).toContain('High priority labels were not adequately preserved');
      });

      it('should detect excessive label reduction', () => {
        const originalLabels: TimeLabelConfig[] = Array.from({ length: 10 }, (_, i) => ({
          timestamp: mockStartTime + i * 600000, // 10 minute intervals
          x: i * 20,
          text: `10:${i.toString().padStart(2, '0')}`,
          priority: 'medium' as const,
        }));

        const resolvedLabels: TimeLabelConfig[] = [originalLabels[0]]; // Only 1 out of 10

        const validation = validateCollisionResolution(originalLabels, resolvedLabels, 50);

        expect(validation.isValid).toBe(false);
        expect(validation.reductionRatio).toBe(0.1);
        expect(validation.issues).toContain('Excessive label reduction may impact usability');
      });

      it('should detect improper label ordering', () => {
        const originalLabels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
        ];

        const resolvedLabels: TimeLabelConfig[] = [
          { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' }, // Wrong order
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        ];

        const validation = validateCollisionResolution(originalLabels, resolvedLabels, 50);

        expect(validation.isValid).toBe(false);
        expect(validation.issues).toContain('Labels are not properly ordered by position');
      });
    });

    describe('Extreme Space Constraint Scenarios', () => {
      it('should handle space too narrow for any labels', () => {
        const labels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockEndTime, x: 10, text: '12:00', priority: 'high' },
        ];

        const resolvedLabels = detectAndResolveCollisions(labels, {
          minDistance: 50,
          preserveHighPriority: true,
          fallbackToKeyPoints: true,
        });

        // Should return at least one label even in extreme constraints
        expect(resolvedLabels.length).toBeGreaterThanOrEqual(1);
      });

      it('should prioritize start label when only one can fit', () => {
        const labels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockStartTime + 1800000, x: 20, text: '10:30', priority: 'high' },
          { timestamp: mockEndTime, x: 40, text: '12:00', priority: 'high' },
        ];

        const resolvedLabels = detectAndResolveCollisions(labels, {
          minDistance: 100, // Very large minimum distance
          preserveHighPriority: true,
          fallbackToKeyPoints: true,
        });

        // Should keep the start label when space is extremely limited
        expect(resolvedLabels.length).toBe(1);
        expect(resolvedLabels[0].x).toBe(0);
        expect(resolvedLabels[0].text).toBe('10:00');
      });

      it('should distribute labels intelligently when space allows multiple labels', () => {
        const labels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockStartTime + 900000, x: 25, text: '10:15', priority: 'medium' },
          { timestamp: mockStartTime + 1800000, x: 50, text: '10:30', priority: 'medium' },
          { timestamp: mockStartTime + 2700000, x: 75, text: '10:45', priority: 'low' },
          { timestamp: mockEndTime, x: 300, text: '12:00', priority: 'high' },
        ];

        const resolvedLabels = detectAndResolveCollisions(labels, {
          minDistance: 80,
          preserveHighPriority: true,
          fallbackToKeyPoints: true,
        });

        // Should intelligently distribute available labels
        expect(resolvedLabels.length).toBeGreaterThanOrEqual(2);
        expect(resolvedLabels.length).toBeLessThanOrEqual(4);

        // Should maintain proper spacing
        for (let i = 1; i < resolvedLabels.length; i++) {
          expect(resolvedLabels[i].x - resolvedLabels[i - 1].x).toBeGreaterThanOrEqual(80);
        }
      });

      it('should handle mixed priority scenarios with space constraints', () => {
        const labels: TimeLabelConfig[] = [
          { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
          { timestamp: mockStartTime + 600000, x: 20, text: '10:10', priority: 'low' },
          { timestamp: mockStartTime + 1200000, x: 40, text: '10:20', priority: 'medium' },
          { timestamp: mockStartTime + 1800000, x: 60, text: '10:30', priority: 'high' },
          { timestamp: mockEndTime, x: 200, text: '12:00', priority: 'high' },
        ];

        const resolvedLabels = detectAndResolveCollisions(labels, {
          minDistance: 70,
          preserveHighPriority: true,
          fallbackToKeyPoints: true,
        });

        // Should prioritize high priority labels
        const highPriorityCount = resolvedLabels.filter(l => l.priority === 'high').length;
        const totalHighPriority = labels.filter(l => l.priority === 'high').length;

        expect(highPriorityCount).toBeGreaterThanOrEqual(Math.min(totalHighPriority, 2));
      });
    });
  });

  describe('Integration tests', () => {
    it('should handle complete workflow for mobile 6-hour timeframe', () => {
      const options: LabelCalculationOptions = {
        startTime: mockStartTime,
        endTime: mockStartTime + 6 * 60 * 60 * 1000, // 6 hours
        availableWidth: 375, // iPhone width
        timeFrame: '6hours',
        deviceType: 'mobile',
        minDistance: 60,
      };

      const labels = calculateOptimalTimeLabels(options);

      // Should respect mobile constraints
      expect(labels.length).toBeLessThanOrEqual(3); // Mobile max for 6hours

      // Should have proper spacing
      for (let i = 1; i < labels.length; i++) {
        expect(labels[i].x - labels[i - 1].x).toBeGreaterThanOrEqual(options.minDistance!);
      }

      // Should include high priority labels
      const highPriorityCount = labels.filter(l => l.priority === 'high').length;
      expect(highPriorityCount).toBeGreaterThanOrEqual(2); // At least start and end
    });

    it('should handle complete workflow for desktop 12-hour timeframe', () => {
      const options: LabelCalculationOptions = {
        startTime: mockStartTime,
        endTime: mockStartTime + 12 * 60 * 60 * 1000, // 12 hours
        availableWidth: 1200, // Desktop width
        timeFrame: '12hours',
        deviceType: 'desktop',
        minDistance: 40,
      };

      const labels = calculateOptimalTimeLabels(options);

      // Should use desktop capacity
      expect(labels.length).toBeLessThanOrEqual(7); // Desktop max for 12hours
      expect(labels.length).toBeGreaterThanOrEqual(3); // At least start, middle, end

      // Should have proper priority distribution
      const priorities = labels.map(l => l.priority);
      expect(priorities).toContain('high');

      // Should have start and end labels
      expect(labels[0].x).toBe(0);
      expect(labels[labels.length - 1].x).toBe(1200);
    });

    it('should adapt to extreme space constraints', () => {
      const options: LabelCalculationOptions = {
        startTime: mockStartTime,
        endTime: mockStartTime + 12 * 60 * 60 * 1000, // 12 hours
        availableWidth: 150, // Very narrow
        timeFrame: '12hours',
        deviceType: 'mobile',
        minDistance: 80, // Large minimum distance
      };

      const labels = calculateOptimalTimeLabels(options);

      // Should fall back to minimal labels
      expect(labels.length).toBeLessThanOrEqual(3);

      // Should still maintain start and end
      expect(labels[0].x).toBe(0);
      expect(labels[labels.length - 1].x).toBe(150);
    });
  });
});
