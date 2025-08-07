/**
 * Tests for dynamic padding calculation system
 */

import {
  calculateDynamicPadding,
  calculatePaddingWithLabelProtection,
  getMinimumPadding,
  validatePadding,
  calculateAdaptivePadding,
  detectDeviceType,
  getOptimalFontSize
} from '@/lib/chart-responsive';
import type { DeviceType, PaddingConfig } from '@/types/chart-responsive';

describe('Dynamic Padding Calculation System', () => {
  describe('calculateDynamicPadding', () => {
    it('should calculate correct padding for mobile devices', () => {
      const padding = calculateDynamicPadding(375, 200, 'mobile');
      
      expect(padding.top).toBeGreaterThanOrEqual(20); // Base mobile padding
      expect(padding.right).toBeGreaterThanOrEqual(15);
      expect(padding.bottom).toBeGreaterThanOrEqual(40);
      expect(padding.left).toBeGreaterThanOrEqual(50);
    });

    it('should calculate correct padding for tablet devices', () => {
      const padding = calculateDynamicPadding(768, 400, 'tablet');
      
      expect(padding.top).toBeGreaterThanOrEqual(30); // Base tablet padding
      expect(padding.right).toBeGreaterThanOrEqual(20);
      expect(padding.bottom).toBeGreaterThanOrEqual(50);
      expect(padding.left).toBeGreaterThanOrEqual(60);
    });

    it('should calculate correct padding for desktop devices', () => {
      const padding = calculateDynamicPadding(1200, 600, 'desktop');
      
      expect(padding.top).toBeGreaterThanOrEqual(40); // Base desktop padding
      expect(padding.right).toBeGreaterThanOrEqual(25);
      expect(padding.bottom).toBeGreaterThanOrEqual(60);
      expect(padding.left).toBeGreaterThanOrEqual(70);
    });

    it('should scale padding based on canvas dimensions', () => {
      const smallCanvas = calculateDynamicPadding(300, 150, 'mobile');
      const largeCanvas = calculateDynamicPadding(600, 300, 'mobile');
      
      // Larger canvas should have proportionally larger padding
      // Small canvas: left = max(50, 300 * 0.08) = max(50, 24) = 50
      // Large canvas: left = max(50, 600 * 0.08) = max(50, 48) = 50
      // Since both hit the minimum, let's test with even larger canvas
      const veryLargeCanvas = calculateDynamicPadding(1000, 500, 'mobile');
      expect(veryLargeCanvas.left).toBeGreaterThan(smallCanvas.left);
      expect(veryLargeCanvas.bottom).toBeGreaterThan(smallCanvas.bottom);
    });

    it('should maintain minimum padding values', () => {
      const padding = calculateDynamicPadding(100, 50, 'mobile');
      
      // Should not go below base padding values
      expect(padding.top).toBeGreaterThanOrEqual(20);
      expect(padding.right).toBeGreaterThanOrEqual(15);
      expect(padding.bottom).toBeGreaterThanOrEqual(40);
      expect(padding.left).toBeGreaterThanOrEqual(50);
    });
  });

  describe('calculatePaddingWithLabelProtection', () => {
    it('should prevent price label cutoff for high-value prices', () => {
      const maxPrice = 123.456789;
      const minPrice = 0.000001;
      const padding = calculatePaddingWithLabelProtection(
        400, 300, 'mobile', maxPrice, minPrice, '$'
      );
      
      // Should have enough left padding for the longest price label
      // The function calculates based on character width estimation
      const fontSize = getOptimalFontSize('mobile'); // 10px for mobile
      const maxPriceText = `$${maxPrice.toFixed(6)}`; // "$123.456789"
      const charWidth = fontSize * 0.6; // 6px per character
      const estimatedTextWidth = maxPriceText.length * charWidth;
      const textBuffer = fontSize * 0.5;
      const expectedMinLeftPadding = estimatedTextWidth + textBuffer;
      
      expect(padding.left).toBeGreaterThanOrEqual(expectedMinLeftPadding);
    });

    it('should adjust padding for different currencies', () => {
      const maxPrice = 1000.123456;
      const minPrice = 0.000001;
      
      const usdPadding = calculatePaddingWithLabelProtection(
        400, 300, 'desktop', maxPrice, minPrice, '$'
      );
      const eurPadding = calculatePaddingWithLabelProtection(
        400, 300, 'desktop', maxPrice, minPrice, '€'
      );
      
      // Both should have adequate padding, EUR might need slightly more
      expect(usdPadding.left).toBeGreaterThan(70); // Desktop base
      expect(eurPadding.left).toBeGreaterThan(70);
    });

    it('should scale padding appropriately across device types', () => {
      const maxPrice = 50.123456;
      const minPrice = 0.001234;
      
      const mobilePadding = calculatePaddingWithLabelProtection(
        375, 200, 'mobile', maxPrice, minPrice, '$'
      );
      const tabletPadding = calculatePaddingWithLabelProtection(
        768, 400, 'tablet', maxPrice, minPrice, '$'
      );
      const desktopPadding = calculatePaddingWithLabelProtection(
        1200, 600, 'desktop', maxPrice, minPrice, '$'
      );
      
      // Desktop should have the most padding, mobile the least
      expect(desktopPadding.left).toBeGreaterThan(tabletPadding.left);
      expect(tabletPadding.left).toBeGreaterThan(mobilePadding.left);
    });

    it('should ensure adequate bottom padding for time labels', () => {
      const padding = calculatePaddingWithLabelProtection(
        600, 400, 'tablet', 100, 1, '$'
      );
      
      const fontSize = getOptimalFontSize('tablet');
      const expectedMinBottomPadding = fontSize * 1.5 + fontSize * 0.5;
      expect(padding.bottom).toBeGreaterThanOrEqual(expectedMinBottomPadding);
    });
  });

  describe('getMinimumPadding', () => {
    it('should return appropriate minimum padding for price labels', () => {
      const mobilePadding = getMinimumPadding('mobile', 'price-labels');
      const tabletPadding = getMinimumPadding('tablet', 'price-labels');
      const desktopPadding = getMinimumPadding('desktop', 'price-labels');
      
      expect(mobilePadding).toBeGreaterThan(0);
      expect(tabletPadding).toBeGreaterThan(mobilePadding);
      expect(desktopPadding).toBeGreaterThan(tabletPadding);
    });

    it('should return appropriate minimum padding for time labels', () => {
      const mobilePadding = getMinimumPadding('mobile', 'time-labels');
      const tabletPadding = getMinimumPadding('tablet', 'time-labels');
      
      expect(mobilePadding).toBeGreaterThan(0);
      expect(tabletPadding).toBeGreaterThan(mobilePadding);
    });

    it('should return touch target padding only for mobile', () => {
      const mobilePadding = getMinimumPadding('mobile', 'touch-targets');
      const tabletPadding = getMinimumPadding('tablet', 'touch-targets');
      const desktopPadding = getMinimumPadding('desktop', 'touch-targets');
      
      expect(mobilePadding).toBe(44); // iOS recommended touch target
      expect(tabletPadding).toBe(0);
      expect(desktopPadding).toBe(0);
    });

    it('should return appropriate chart area padding', () => {
      const mobilePadding = getMinimumPadding('mobile', 'chart-area');
      const tabletPadding = getMinimumPadding('tablet', 'chart-area');
      const desktopPadding = getMinimumPadding('desktop', 'chart-area');
      
      expect(mobilePadding).toBe(20);
      expect(tabletPadding).toBe(30);
      expect(desktopPadding).toBe(40);
    });
  });

  describe('validatePadding', () => {
    it('should limit padding to reasonable bounds', () => {
      const excessivePadding: PaddingConfig = {
        top: 200,
        right: 200,
        bottom: 200,
        left: 200
      };
      
      const validatedPadding = validatePadding(excessivePadding, 400, 300);
      
      // Should not exceed 30% of canvas dimensions
      expect(validatedPadding.left).toBeLessThanOrEqual(120); // 30% of 400
      expect(validatedPadding.right).toBeLessThanOrEqual(120);
      expect(validatedPadding.top).toBeLessThanOrEqual(90);   // 30% of 300
      expect(validatedPadding.bottom).toBeLessThanOrEqual(90);
    });

    it('should preserve reasonable padding values', () => {
      const reasonablePadding: PaddingConfig = {
        top: 40,
        right: 25,
        bottom: 60,
        left: 70
      };
      
      const validatedPadding = validatePadding(reasonablePadding, 800, 600);
      
      // Should remain unchanged
      expect(validatedPadding).toEqual(reasonablePadding);
    });

    it('should handle edge cases with very small canvases', () => {
      const padding: PaddingConfig = {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      };
      
      const validatedPadding = validatePadding(padding, 100, 100);
      
      // Should be limited to 30px max (30% of 100)
      expect(validatedPadding.top).toBeLessThanOrEqual(30);
      expect(validatedPadding.right).toBeLessThanOrEqual(30);
      expect(validatedPadding.bottom).toBeLessThanOrEqual(30);
      expect(validatedPadding.left).toBeLessThanOrEqual(30);
    });
  });

  describe('calculateAdaptivePadding', () => {
    it('should use label protection when price data is provided', () => {
      const adaptivePadding = calculateAdaptivePadding(600, 400, 'tablet', {
        maxPrice: 123.456789,
        minPrice: 0.000001,
        currency: '$'
      });
      
      const basicPadding = calculateDynamicPadding(600, 400, 'tablet');
      
      // Adaptive padding should be larger to accommodate price labels
      expect(adaptivePadding.left).toBeGreaterThan(basicPadding.left);
    });

    it('should adjust for long price labels', () => {
      const normalPadding = calculateAdaptivePadding(600, 400, 'mobile', {});
      const longLabelPadding = calculateAdaptivePadding(600, 400, 'mobile', {
        hasLongPriceLabels: true
      });
      
      expect(longLabelPadding.left).toBeGreaterThan(normalPadding.left);
    });

    it('should adjust for frequent time labels', () => {
      const normalPadding = calculateAdaptivePadding(600, 400, 'mobile', {});
      const frequentLabelPadding = calculateAdaptivePadding(600, 400, 'mobile', {
        hasFrequentTimeLabels: true
      });
      
      expect(frequentLabelPadding.bottom).toBeGreaterThan(normalPadding.bottom);
    });

    it('should add touch target padding for mobile', () => {
      const normalPadding = calculateAdaptivePadding(375, 200, 'mobile', {});
      const touchPadding = calculateAdaptivePadding(375, 200, 'mobile', {
        needsTouchTargets: true
      });
      
      expect(touchPadding.top).toBeGreaterThanOrEqual(44); // iOS touch target
      expect(touchPadding.bottom).toBeGreaterThanOrEqual(44);
    });

    it('should not add touch target padding for non-mobile devices', () => {
      const tabletPadding = calculateAdaptivePadding(768, 400, 'tablet', {
        needsTouchTargets: true
      });
      const desktopPadding = calculateAdaptivePadding(1200, 600, 'desktop', {
        needsTouchTargets: true
      });
      
      // Touch target padding should not significantly affect tablet/desktop
      expect(tabletPadding.top).toBeLessThan(44);
      expect(desktopPadding.top).toBeLessThan(44);
    });

    it('should validate final padding bounds', () => {
      const adaptivePadding = calculateAdaptivePadding(200, 150, 'mobile', {
        hasLongPriceLabels: true,
        hasFrequentTimeLabels: true,
        needsTouchTargets: true,
        maxPrice: 999999.999999,
        minPrice: 0.000001,
        currency: '$'
      });
      
      // Even with all options enabled, should not exceed canvas bounds
      expect(adaptivePadding.left + adaptivePadding.right).toBeLessThan(200 * 0.6);
      expect(adaptivePadding.top + adaptivePadding.bottom).toBeLessThan(150 * 0.6);
    });
  });

  describe('Integration with device detection', () => {
    it('should work correctly with detected device types', () => {
      const mobileWidth = 375;
      const tabletWidth = 768;
      const desktopWidth = 1200;
      
      const mobileDevice = detectDeviceType(mobileWidth);
      const tabletDevice = detectDeviceType(tabletWidth);
      const desktopDevice = detectDeviceType(desktopWidth);
      
      const mobilePadding = calculateDynamicPadding(mobileWidth, 200, mobileDevice);
      const tabletPadding = calculateDynamicPadding(tabletWidth, 400, tabletDevice);
      const desktopPadding = calculateDynamicPadding(desktopWidth, 600, desktopDevice);
      
      expect(mobileDevice).toBe('mobile');
      expect(tabletDevice).toBe('tablet');
      expect(desktopDevice).toBe('desktop');
      
      // Padding should increase with device size
      expect(desktopPadding.left).toBeGreaterThan(tabletPadding.left);
      expect(tabletPadding.left).toBeGreaterThan(mobilePadding.left);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle zero or negative dimensions gracefully', () => {
      expect(() => calculateDynamicPadding(0, 0, 'mobile')).not.toThrow();
      expect(() => calculateDynamicPadding(-100, -50, 'tablet')).not.toThrow();
      
      const padding = calculateDynamicPadding(0, 0, 'mobile');
      expect(padding.top).toBeGreaterThanOrEqual(0);
      expect(padding.right).toBeGreaterThanOrEqual(0);
      expect(padding.bottom).toBeGreaterThanOrEqual(0);
      expect(padding.left).toBeGreaterThanOrEqual(0);
    });

    it('should handle extreme price values', () => {
      const extremePadding = calculatePaddingWithLabelProtection(
        400, 300, 'mobile', 999999999.999999, 0.000000001, '$'
      );
      
      expect(extremePadding.left).toBeGreaterThan(0);
      expect(extremePadding.left).toBeLessThan(400); // Should not exceed canvas width
    });

    it('should handle very small canvases', () => {
      const smallPadding = calculateAdaptivePadding(50, 30, 'mobile', {
        maxPrice: 100,
        minPrice: 1,
        hasLongPriceLabels: true,
        needsTouchTargets: true
      });
      
      // Should still provide usable padding without exceeding bounds
      expect(smallPadding.left + smallPadding.right).toBeLessThan(50);
      expect(smallPadding.top + smallPadding.bottom).toBeLessThan(30);
    });
  });
});