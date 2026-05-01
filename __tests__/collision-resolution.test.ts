/**
 * Comprehensive tests for label collision resolution system
 * Tests the enhanced collision resolution functionality implemented in task 7
 */

import {
  detectAndResolveCollisions,
  resolveCollisionsWithReadability,
  validateCollisionResolution,
  type TimeLabelConfig,
  type CollisionDetectionOptions,
} from '@/lib/time-label-manager';

describe('Label Collision Resolution System', () => {
  // Test data setup
  const mockStartTime = new Date('2024-01-01T10:00:00Z').getTime();
  const mockEndTime = new Date('2024-01-01T16:00:00Z').getTime(); // 6 hours later

  describe('Priority-based Collision Resolution', () => {
    it('should resolve collisions while preserving high priority labels', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 25, text: '10:30', priority: 'low' }, // Collides
        { timestamp: mockStartTime + 3600000, x: 100, text: '11:00', priority: 'medium' },
        { timestamp: mockStartTime + 5400000, x: 125, text: '11:30', priority: 'low' }, // Collides
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 50,
        preserveHighPriority: true,
        fallbackToKeyPoints: false,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      // Should preserve high priority labels
      const highPriorityResolved = resolved.filter(l => l.priority === 'high');
      expect(highPriorityResolved).toHaveLength(2);
      expect(highPriorityResolved[0].text).toBe('10:00');
      expect(highPriorityResolved[1].text).toBe('16:00');

      // Should maintain minimum distance
      for (let i = 1; i < resolved.length; i++) {
        expect(resolved[i].x - resolved[i - 1].x).toBeGreaterThanOrEqual(50);
      }
    });

    it('should handle collisions among high priority labels intelligently', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 900000, x: 30, text: '10:15', priority: 'high' }, // Too close
        { timestamp: mockStartTime + 1800000, x: 60, text: '10:30', priority: 'high' }, // Close
        { timestamp: mockEndTime, x: 300, text: '16:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 80,
        preserveHighPriority: true,
        fallbackToKeyPoints: false,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      // Should resolve high priority collisions intelligently
      expect(resolved.length).toBeGreaterThanOrEqual(2);
      expect(resolved[0].x).toBe(0); // Start should be preserved
      expect(resolved[resolved.length - 1].x).toBe(300); // End should be preserved

      // Should maintain minimum distance
      for (let i = 1; i < resolved.length; i++) {
        expect(resolved[i].x - resolved[i - 1].x).toBeGreaterThanOrEqual(80);
      }
    });

    it('should use compromise positioning for high priority collisions', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 40, text: '10:30', priority: 'high' }, // Close but adjustable
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 60,
        preserveHighPriority: true,
        fallbackToKeyPoints: false,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      // Should adjust positions to accommodate all high priority labels
      expect(resolved).toHaveLength(3);
      expect(resolved[0].x).toBe(0);
      expect(resolved[1].x).toBeGreaterThanOrEqual(60); // Should be adjusted
      expect(resolved[2].x).toBe(200);
    });
  });

  describe('Advanced Fallback Strategies', () => {
    it('should fall back to key points for extreme space constraints', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 900000, x: 20, text: '10:15', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 40, text: '10:30', priority: 'high' },
        { timestamp: mockStartTime + 2700000, x: 60, text: '10:45', priority: 'high' },
        { timestamp: mockEndTime, x: 80, text: '16:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 100, // Very large minimum distance
        preserveHighPriority: true,
        fallbackToKeyPoints: true,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      // Should fall back to key points strategy
      expect(resolved.length).toBeLessThanOrEqual(3);
      expect(resolved[0].x).toBe(0); // Start
      if (resolved.length > 1) {
        expect(resolved[resolved.length - 1].x).toBe(80); // End
      }
    });

    it('should create intelligent distribution when space allows', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 50, text: '10:30', priority: 'medium' },
        { timestamp: mockStartTime + 3600000, x: 100, text: '11:00', priority: 'medium' },
        { timestamp: mockStartTime + 5400000, x: 150, text: '11:30', priority: 'low' },
        { timestamp: mockEndTime, x: 400, text: '16:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 80,
        preserveHighPriority: true,
        fallbackToKeyPoints: true,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      // Should create intelligent distribution
      expect(resolved.length).toBeGreaterThanOrEqual(3);
      expect(resolved.length).toBeLessThanOrEqual(5);

      // Should maintain proper spacing
      for (let i = 1; i < resolved.length; i++) {
        expect(resolved[i].x - resolved[i - 1].x).toBeGreaterThanOrEqual(80);
      }
    });

    it('should handle single label edge case', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 100,
        preserveHighPriority: true,
        fallbackToKeyPoints: true,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toEqual(labels[0]);
    });

    it('should return start label when space is too narrow for any labels', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockEndTime, x: 10, text: '16:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 50,
        preserveHighPriority: true,
        fallbackToKeyPoints: true,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      // Should return at least the start label
      expect(resolved.length).toBeGreaterThanOrEqual(1);
      expect(resolved[0].x).toBe(0);
      expect(resolved[0].text).toBe('10:00');
    });
  });

  describe('Readability-focused Optimization', () => {
    it('should optimize labels for readability with text width consideration', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00:00', priority: 'high' }, // Long text
        { timestamp: mockStartTime + 1800000, x: 40, text: '10:30:00', priority: 'medium' },
        { timestamp: mockStartTime + 3600000, x: 80, text: '11:00:00', priority: 'medium' },
        { timestamp: mockEndTime, x: 200, text: '16:00:00', priority: 'high' },
      ];

      const resolved = resolveCollisionsWithReadability(labels, 200, 30, 12);

      // Should consider text width in spacing calculations
      expect(resolved.length).toBeGreaterThanOrEqual(2);

      // Should maintain readability spacing
      for (let i = 1; i < resolved.length; i++) {
        const actualDistance = resolved[i].x - resolved[i - 1].x;
        expect(actualDistance).toBeGreaterThan(30); // Should use text-based minimum
      }
    });

    it('should handle very narrow spaces with readability focus', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 30, text: '10:30', priority: 'medium' },
        { timestamp: mockEndTime, x: 60, text: '16:00', priority: 'high' },
      ];

      const resolved = resolveCollisionsWithReadability(labels, 60, 50, 12);

      // Should prioritize readability over quantity
      expect(resolved.length).toBeLessThanOrEqual(2);
      expect(resolved[0].priority).toBe('high');
    });

    it('should optimize for good space utilization', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 3600000, x: 100, text: '11:00', priority: 'medium' },
        { timestamp: mockEndTime, x: 400, text: '16:00', priority: 'high' },
      ];

      const resolved = resolveCollisionsWithReadability(labels, 400, 40, 12);

      // Should utilize available space effectively
      expect(resolved.length).toBeGreaterThanOrEqual(3);

      // Should maintain good distribution
      const totalSpread = resolved[resolved.length - 1].x - resolved[0].x;
      expect(totalSpread).toBeGreaterThan(200); // Good use of space
    });
  });

  describe('Collision Resolution Validation', () => {
    it('should validate successful collision resolution', () => {
      const originalLabels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 30, text: '10:30', priority: 'medium' },
        { timestamp: mockStartTime + 3600000, x: 100, text: '11:00', priority: 'medium' },
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' },
      ];

      const resolvedLabels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 3600000, x: 100, text: '11:00', priority: 'medium' },
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' },
      ];

      const validation = validateCollisionResolution(originalLabels, resolvedLabels, 50);

      expect(validation.isValid).toBe(true);
      expect(validation.hasCollisions).toBe(false);
      expect(validation.preservedHighPriority).toBe(true);
      expect(validation.reductionRatio).toBe(0.75);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect remaining collisions in validation', () => {
      const originalLabels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' },
      ];

      const resolvedLabels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockEndTime, x: 30, text: '16:00', priority: 'high' }, // Too close!
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
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' },
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
        timestamp: mockStartTime + i * 600000,
        x: i * 30,
        text: `${10 + Math.floor(i / 6)}:${((i % 6) * 10).toString().padStart(2, '0')}`,
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
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' },
      ];

      const resolvedLabels: TimeLabelConfig[] = [
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' }, // Wrong order
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
      ];

      const validation = validateCollisionResolution(originalLabels, resolvedLabels, 50);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Labels are not properly ordered by position');
    });

    it('should handle empty arrays in validation', () => {
      const validation = validateCollisionResolution([], [], 50);

      expect(validation.isValid).toBe(true);
      expect(validation.hasCollisions).toBe(false);
      expect(validation.preservedHighPriority).toBe(true);
      expect(validation.reductionRatio).toBe(1);
      expect(validation.issues).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle labels with identical positions', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 100, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 100, text: '10:30', priority: 'medium' }, // Same position
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 50,
        preserveHighPriority: true,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      // Should handle identical positions by keeping higher priority
      expect(resolved.length).toBe(2);
      const labelAt100 = resolved.find(l => l.x === 100);
      expect(labelAt100?.priority).toBe('high');
    });

    it('should handle negative positions gracefully', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: -50, text: '09:30', priority: 'high' },
        { timestamp: mockStartTime + 1800000, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 60,
        preserveHighPriority: true,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      // Should handle negative positions
      expect(resolved.length).toBeGreaterThanOrEqual(2);
      expect(resolved[0].x).toBe(-50);
    });

    it('should handle very large position values', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockEndTime, x: 10000, text: '16:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 50,
        preserveHighPriority: true,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      // Should handle large values correctly
      expect(resolved).toHaveLength(2);
      expect(resolved[0].x).toBe(0);
      expect(resolved[1].x).toBe(10000);
    });

    it('should handle mixed priority scenarios correctly', () => {
      const labels: TimeLabelConfig[] = [
        { timestamp: mockStartTime, x: 0, text: '10:00', priority: 'high' },
        { timestamp: mockStartTime + 600000, x: 20, text: '10:10', priority: 'low' },
        { timestamp: mockStartTime + 1200000, x: 40, text: '10:20', priority: 'medium' },
        { timestamp: mockStartTime + 1800000, x: 60, text: '10:30', priority: 'high' },
        { timestamp: mockEndTime, x: 200, text: '16:00', priority: 'high' },
      ];

      const options: CollisionDetectionOptions = {
        minDistance: 70,
        preserveHighPriority: true,
        fallbackToKeyPoints: false,
      };

      const resolved = detectAndResolveCollisions(labels, options);

      // Should prioritize high priority labels
      const highPriorityCount = resolved.filter(l => l.priority === 'high').length;
      const totalHighPriority = labels.filter(l => l.priority === 'high').length;

      expect(highPriorityCount).toBeGreaterThanOrEqual(Math.min(totalHighPriority, 2));

      // Should maintain proper spacing
      for (let i = 1; i < resolved.length; i++) {
        expect(resolved[i].x - resolved[i - 1].x).toBeGreaterThanOrEqual(70);
      }
    });
  });
});
