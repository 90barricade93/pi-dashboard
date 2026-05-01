/**
 * Tests for responsive font sizing system
 */

import {
  getOptimalFontSize,
  calculateResponsiveFontSize,
  constrainFontSize,
  calculateFontScalingFactor,
  getElementFontSize,
  isValidFontSize,
  FONT_SIZE_CONSTRAINTS,
} from '@/lib/chart-responsive';
import type { DeviceType, FontContentType, ChartElementType } from '@/types/chart-responsive';

describe('Responsive Font Sizing System', () => {
  describe('getOptimalFontSize', () => {
    it('should return correct base font sizes for each device type', () => {
      expect(getOptimalFontSize('mobile')).toBe(10);
      expect(getOptimalFontSize('tablet')).toBe(12);
      expect(getOptimalFontSize('desktop')).toBe(14);
    });

    it('should scale base font size correctly when provided', () => {
      const baseSize = 16;

      expect(getOptimalFontSize('mobile', baseSize)).toBe(13); // 16 * 0.8 = 12.8, rounded to 13
      expect(getOptimalFontSize('tablet', baseSize)).toBe(16); // 16 * 1.0 = 16
      expect(getOptimalFontSize('desktop', baseSize)).toBe(19); // 16 * 1.2 = 19.2, rounded to 19
    });

    it('should constrain scaled font sizes within bounds', () => {
      const largeFontSize = 30;
      const smallFontSize = 5;

      // Should be constrained to maximum
      expect(getOptimalFontSize('desktop', largeFontSize)).toBe(FONT_SIZE_CONSTRAINTS.maximum);

      // Should be constrained to minimum
      expect(getOptimalFontSize('mobile', smallFontSize)).toBe(FONT_SIZE_CONSTRAINTS.minimum);
    });
  });

  describe('calculateResponsiveFontSize', () => {
    it('should calculate appropriate font sizes for different screen dimensions', () => {
      // Mobile dimensions
      const mobileSize = calculateResponsiveFontSize(375, 667, 'mobile');
      expect(mobileSize).toBeGreaterThanOrEqual(FONT_SIZE_CONSTRAINTS.minimum);
      expect(mobileSize).toBeLessThanOrEqual(FONT_SIZE_CONSTRAINTS.maximum);

      // Tablet dimensions
      const tabletSize = calculateResponsiveFontSize(768, 1024, 'tablet');
      expect(tabletSize).toBeGreaterThan(mobileSize);

      // Desktop dimensions
      const desktopSize = calculateResponsiveFontSize(1920, 1080, 'desktop');
      expect(desktopSize).toBeGreaterThan(tabletSize);
    });

    it('should adjust font size based on content type', () => {
      const width = 1024;
      const height = 768;
      const deviceType: DeviceType = 'tablet';

      const labelsSize = calculateResponsiveFontSize(width, height, deviceType, 'labels');
      const valuesSize = calculateResponsiveFontSize(width, height, deviceType, 'values');
      const titlesSize = calculateResponsiveFontSize(width, height, deviceType, 'titles');

      expect(valuesSize).toBeGreaterThan(labelsSize);
      expect(titlesSize).toBeGreaterThan(valuesSize);
    });

    it('should handle small mobile screens appropriately', () => {
      const smallMobileSize = calculateResponsiveFontSize(320, 568, 'mobile');
      const regularMobileSize = calculateResponsiveFontSize(375, 667, 'mobile');

      expect(smallMobileSize).toBeLessThanOrEqual(regularMobileSize);
      expect(smallMobileSize).toBeGreaterThanOrEqual(FONT_SIZE_CONSTRAINTS.minimum);
    });

    it('should handle large desktop screens appropriately', () => {
      const regularDesktopSize = calculateResponsiveFontSize(1920, 1080, 'desktop');
      const largeDesktopSize = calculateResponsiveFontSize(3840, 2160, 'desktop');

      expect(largeDesktopSize).toBeGreaterThanOrEqual(regularDesktopSize);
      expect(largeDesktopSize).toBeLessThanOrEqual(FONT_SIZE_CONSTRAINTS.maximum);
    });
  });

  describe('constrainFontSize', () => {
    it('should constrain font sizes within minimum and maximum bounds', () => {
      expect(constrainFontSize(5)).toBe(FONT_SIZE_CONSTRAINTS.minimum);
      expect(constrainFontSize(30)).toBe(FONT_SIZE_CONSTRAINTS.maximum);
      expect(constrainFontSize(12)).toBe(12);
    });

    it('should handle edge cases', () => {
      expect(constrainFontSize(FONT_SIZE_CONSTRAINTS.minimum)).toBe(FONT_SIZE_CONSTRAINTS.minimum);
      expect(constrainFontSize(FONT_SIZE_CONSTRAINTS.maximum)).toBe(FONT_SIZE_CONSTRAINTS.maximum);
    });
  });

  describe('calculateFontScalingFactor', () => {
    it('should return correct scaling factors for different device types', () => {
      const standardDPR = 1.5;

      expect(calculateFontScalingFactor(standardDPR, 'mobile')).toBe(0.8);
      expect(calculateFontScalingFactor(standardDPR, 'tablet')).toBe(1.0);
      expect(calculateFontScalingFactor(standardDPR, 'desktop')).toBe(1.2);
    });

    it('should adjust for high-DPI displays', () => {
      const highDPR = 3.0;

      expect(calculateFontScalingFactor(highDPR, 'mobile')).toBeCloseTo(0.88); // 0.8 * 1.1
      expect(calculateFontScalingFactor(highDPR, 'tablet')).toBeCloseTo(1.1); // 1.0 * 1.1
      expect(calculateFontScalingFactor(highDPR, 'desktop')).toBeCloseTo(1.32); // 1.2 * 1.1
    });

    it('should adjust for low-DPI displays', () => {
      const lowDPR = 1.0;

      expect(calculateFontScalingFactor(lowDPR, 'mobile')).toBeCloseTo(0.76); // 0.8 * 0.95
      expect(calculateFontScalingFactor(lowDPR, 'tablet')).toBeCloseTo(0.95); // 1.0 * 0.95
      expect(calculateFontScalingFactor(lowDPR, 'desktop')).toBeCloseTo(1.14); // 1.2 * 0.95
    });
  });

  describe('getElementFontSize', () => {
    const screenWidth = 1024;
    const screenHeight = 768;

    it('should return appropriate font sizes for different element types', () => {
      const deviceType: DeviceType = 'tablet';

      const timeLabelSize = getElementFontSize(
        deviceType,
        'time-labels',
        screenWidth,
        screenHeight
      );
      const priceLabelSize = getElementFontSize(
        deviceType,
        'price-labels',
        screenWidth,
        screenHeight
      );
      const gridLabelSize = getElementFontSize(
        deviceType,
        'grid-labels',
        screenWidth,
        screenHeight
      );
      const legendSize = getElementFontSize(deviceType, 'legend', screenWidth, screenHeight);

      // Price labels should be the base size
      expect(priceLabelSize).toBeGreaterThan(timeLabelSize);
      expect(priceLabelSize).toBeGreaterThan(gridLabelSize);
      expect(priceLabelSize).toBeGreaterThan(legendSize);

      // Grid labels should be smallest
      expect(gridLabelSize).toBeLessThan(timeLabelSize);
      expect(gridLabelSize).toBeLessThan(legendSize);
    });

    it('should maintain font size constraints for all element types', () => {
      const deviceTypes: DeviceType[] = ['mobile', 'tablet', 'desktop'];
      const elementTypes: ChartElementType[] = [
        'time-labels',
        'price-labels',
        'grid-labels',
        'legend',
      ];

      deviceTypes.forEach(deviceType => {
        elementTypes.forEach(elementType => {
          const fontSize = getElementFontSize(deviceType, elementType, screenWidth, screenHeight);
          expect(fontSize).toBeGreaterThanOrEqual(FONT_SIZE_CONSTRAINTS.minimum);
          expect(fontSize).toBeLessThanOrEqual(FONT_SIZE_CONSTRAINTS.maximum);
        });
      });
    });
  });

  describe('isValidFontSize', () => {
    it('should validate font sizes correctly', () => {
      expect(isValidFontSize(12, 'tablet')).toBe(true);
      expect(isValidFontSize(10, 'mobile')).toBe(true);
      expect(isValidFontSize(14, 'desktop')).toBe(true);
    });

    it('should reject invalid font sizes', () => {
      expect(isValidFontSize(0, 'mobile')).toBe(false);
      expect(isValidFontSize(-5, 'tablet')).toBe(false);
      expect(isValidFontSize(NaN, 'desktop')).toBe(false);
      expect(isValidFontSize(Infinity, 'mobile')).toBe(false);
    });

    it('should reject font sizes outside constraints', () => {
      expect(isValidFontSize(5, 'mobile')).toBe(false); // Below minimum
      expect(isValidFontSize(30, 'desktop')).toBe(false); // Above maximum
    });

    it('should respect device-specific ranges', () => {
      // Mobile should reject very large fonts
      expect(isValidFontSize(20, 'mobile')).toBe(false);

      // Desktop should reject very small fonts
      expect(isValidFontSize(8, 'desktop')).toBe(false);

      // Tablet should be in between
      expect(isValidFontSize(16, 'tablet')).toBe(true);
    });
  });

  describe('FONT_SIZE_CONSTRAINTS', () => {
    it('should have reasonable constraint values', () => {
      expect(FONT_SIZE_CONSTRAINTS.minimum).toBeGreaterThan(0);
      expect(FONT_SIZE_CONSTRAINTS.maximum).toBeGreaterThan(FONT_SIZE_CONSTRAINTS.minimum);

      expect(FONT_SIZE_CONSTRAINTS.scaleFactor.mobile).toBeLessThan(
        FONT_SIZE_CONSTRAINTS.scaleFactor.tablet
      );
      expect(FONT_SIZE_CONSTRAINTS.scaleFactor.tablet).toBeLessThan(
        FONT_SIZE_CONSTRAINTS.scaleFactor.desktop
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extreme screen dimensions', () => {
      // Very small screen
      const tinySize = calculateResponsiveFontSize(100, 100, 'mobile');
      expect(tinySize).toBeGreaterThanOrEqual(FONT_SIZE_CONSTRAINTS.minimum);

      // Very large screen
      const hugeSize = calculateResponsiveFontSize(5000, 3000, 'desktop');
      expect(hugeSize).toBeLessThanOrEqual(FONT_SIZE_CONSTRAINTS.maximum);
    });

    it('should handle zero and negative dimensions gracefully', () => {
      expect(() => calculateResponsiveFontSize(0, 100, 'mobile')).not.toThrow();
      expect(() => calculateResponsiveFontSize(100, 0, 'tablet')).not.toThrow();
    });

    it('should handle unusual device pixel ratios', () => {
      expect(() => calculateFontScalingFactor(0.5, 'mobile')).not.toThrow();
      expect(() => calculateFontScalingFactor(10, 'desktop')).not.toThrow();
    });
  });

  describe('Integration with Existing System', () => {
    it('should maintain backward compatibility with existing font size usage', () => {
      // Existing code should still work
      const mobileFont = getOptimalFontSize('mobile');
      const tabletFont = getOptimalFontSize('tablet');
      const desktopFont = getOptimalFontSize('desktop');

      expect(typeof mobileFont).toBe('number');
      expect(typeof tabletFont).toBe('number');
      expect(typeof desktopFont).toBe('number');

      expect(mobileFont).toBeLessThan(tabletFont);
      expect(tabletFont).toBeLessThan(desktopFont);
    });

    it('should work with responsive chart metrics calculation', () => {
      // This ensures the font sizing integrates well with existing responsive system
      const fontSize = calculateResponsiveFontSize(1024, 768, 'tablet');
      expect(isValidFontSize(fontSize, 'tablet')).toBe(true);
    });
  });
});
