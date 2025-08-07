/**
 * Unit tests for responsive chart configuration system and device detection utilities
 */

import {
  detectDeviceType,
  calculateDynamicPadding,
  getOptimalFontSize,
  getTimeframeConfig,
  calculateResponsiveMetrics,
  isValidScreenWidth,
  BREAKPOINTS,
  CHART_CONFIG
} from '@/lib/chart-responsive';

import type { DeviceType, TimeFrame } from '@/types/chart-responsive';

describe('Device Detection', () => {
  describe('detectDeviceType', () => {
    it('should detect mobile devices correctly', () => {
      expect(detectDeviceType(320)).toBe('mobile');
      expect(detectDeviceType(480)).toBe('mobile');
      expect(detectDeviceType(767)).toBe('mobile');
    });

    it('should detect tablet devices correctly', () => {
      expect(detectDeviceType(768)).toBe('tablet');
      expect(detectDeviceType(900)).toBe('tablet');
      expect(detectDeviceType(1023)).toBe('tablet');
    });

    it('should detect desktop devices correctly', () => {
      expect(detectDeviceType(1024)).toBe('desktop');
      expect(detectDeviceType(1440)).toBe('desktop');
      expect(detectDeviceType(1920)).toBe('desktop');
    });

    it('should handle edge cases at breakpoint boundaries', () => {
      expect(detectDeviceType(BREAKPOINTS.mobile.max)).toBe('mobile');
      expect(detectDeviceType(BREAKPOINTS.mobile.max + 1)).toBe('tablet');
      expect(detectDeviceType(BREAKPOINTS.tablet.max)).toBe('tablet');
      expect(detectDeviceType(BREAKPOINTS.tablet.max + 1)).toBe('desktop');
    });

    it('should handle very small and very large screen sizes', () => {
      expect(detectDeviceType(1)).toBe('mobile');
      expect(detectDeviceType(8192)).toBe('desktop');
    });
  });

  describe('isValidScreenWidth', () => {
    it('should validate normal screen widths', () => {
      expect(isValidScreenWidth(320)).toBe(true);
      expect(isValidScreenWidth(1920)).toBe(true);
      expect(isValidScreenWidth(1024)).toBe(true);
    });

    it('should reject invalid screen widths', () => {
      expect(isValidScreenWidth(0)).toBe(false);
      expect(isValidScreenWidth(-100)).toBe(false);
      expect(isValidScreenWidth(10000)).toBe(false);
      expect(isValidScreenWidth(Infinity)).toBe(false);
      expect(isValidScreenWidth(NaN)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidScreenWidth(1)).toBe(true);
      expect(isValidScreenWidth(8192)).toBe(true);
      expect(isValidScreenWidth(8193)).toBe(false);
    });
  });
});

describe('Dynamic Padding Calculation', () => {
  describe('calculateDynamicPadding', () => {
    it('should calculate mobile padding correctly', () => {
      const padding = calculateDynamicPadding(375, 667, 'mobile');
      
      expect(padding.top).toBeGreaterThanOrEqual(20);
      expect(padding.right).toBeGreaterThanOrEqual(15);
      expect(padding.bottom).toBeGreaterThanOrEqual(40);
      expect(padding.left).toBeGreaterThanOrEqual(50);
    });

    it('should calculate tablet padding correctly', () => {
      const padding = calculateDynamicPadding(768, 1024, 'tablet');
      
      expect(padding.top).toBeGreaterThanOrEqual(30);
      expect(padding.right).toBeGreaterThanOrEqual(20);
      expect(padding.bottom).toBeGreaterThanOrEqual(50);
      expect(padding.left).toBeGreaterThanOrEqual(60);
    });

    it('should calculate desktop padding correctly', () => {
      const padding = calculateDynamicPadding(1920, 1080, 'desktop');
      
      expect(padding.top).toBeGreaterThanOrEqual(40);
      expect(padding.right).toBeGreaterThanOrEqual(25);
      expect(padding.bottom).toBeGreaterThanOrEqual(60);
      expect(padding.left).toBeGreaterThanOrEqual(70);
    });

    it('should adjust padding based on canvas dimensions', () => {
      // Small canvas should use percentage-based padding
      const smallPadding = calculateDynamicPadding(200, 100, 'mobile');
      expect(smallPadding.top).toBe(20); // Base padding is larger than 5% of height
      expect(smallPadding.left).toBe(50); // Base padding is larger than 8% of width

      // Large canvas should use percentage-based padding
      const largePadding = calculateDynamicPadding(2000, 1000, 'mobile');
      expect(largePadding.top).toBe(50); // 5% of 1000
      expect(largePadding.left).toBe(160); // 8% of 2000
    });

    it('should maintain minimum padding values', () => {
      const padding = calculateDynamicPadding(100, 50, 'mobile');
      
      expect(padding.top).toBeGreaterThanOrEqual(CHART_CONFIG.padding.mobile.top);
      expect(padding.right).toBeGreaterThanOrEqual(CHART_CONFIG.padding.mobile.right);
      expect(padding.bottom).toBeGreaterThanOrEqual(CHART_CONFIG.padding.mobile.bottom);
      expect(padding.left).toBeGreaterThanOrEqual(CHART_CONFIG.padding.mobile.left);
    });
  });
});

describe('Font Size Optimization', () => {
  describe('getOptimalFontSize', () => {
    it('should return correct base font sizes for each device type', () => {
      expect(getOptimalFontSize('mobile')).toBe(10);
      expect(getOptimalFontSize('tablet')).toBe(12);
      expect(getOptimalFontSize('desktop')).toBe(14);
    });

    it('should scale custom base font sizes correctly', () => {
      const baseSize = 16;
      
      expect(getOptimalFontSize('mobile', baseSize)).toBe(13); // 16 * 0.8 = 12.8, rounded to 13
      expect(getOptimalFontSize('tablet', baseSize)).toBe(16); // 16 * 1.0 = 16
      expect(getOptimalFontSize('desktop', baseSize)).toBe(19); // 16 * 1.2 = 19.2, rounded to 19
    });

    it('should handle edge cases for base font sizes', () => {
      expect(getOptimalFontSize('mobile', 1)).toBe(8); // 1 * 0.8 = 0.8, constrained to minimum 8
      expect(getOptimalFontSize('desktop', 100)).toBe(24); // 100 * 1.2 = 120, constrained to maximum 24
    });
  });
});

describe('Timeframe Configuration', () => {
  describe('getTimeframeConfig', () => {
    const timeframes: TimeFrame[] = ['30min', '1hour', '2hours', '6hours', '12hours'];
    const deviceTypes: DeviceType[] = ['mobile', 'tablet', 'desktop'];

    it('should return valid configuration for all timeframe/device combinations', () => {
      timeframes.forEach(timeframe => {
        deviceTypes.forEach(deviceType => {
          const config = getTimeframeConfig(timeframe, deviceType);
          
          expect(config).toBeDefined();
          expect(config.interval).toBeGreaterThan(0);
          expect(config.maxLabels).toBeGreaterThan(0);
          expect(Number.isInteger(config.interval)).toBe(true);
          expect(Number.isInteger(config.maxLabels)).toBe(true);
        });
      });
    });

    it('should have appropriate intervals for different timeframes', () => {
      // 30min timeframe should have shorter intervals
      expect(getTimeframeConfig('30min', 'desktop').interval).toBeLessThan(
        getTimeframeConfig('12hours', 'desktop').interval
      );

      // Mobile should generally have longer intervals than desktop for same timeframe
      expect(getTimeframeConfig('6hours', 'mobile').interval).toBeGreaterThanOrEqual(
        getTimeframeConfig('6hours', 'desktop').interval
      );
    });

    it('should have appropriate max labels for different devices', () => {
      // Mobile should generally have fewer max labels than desktop
      expect(getTimeframeConfig('6hours', 'mobile').maxLabels).toBeLessThanOrEqual(
        getTimeframeConfig('6hours', 'desktop').maxLabels
      );
    });

    it('should return specific expected values for key combinations', () => {
      // Test some specific configurations from the design
      expect(getTimeframeConfig('30min', 'mobile')).toEqual({
        interval: 10 * 60 * 1000, // 10 minutes
        maxLabels: 4
      });

      expect(getTimeframeConfig('12hours', 'desktop')).toEqual({
        interval: 2 * 60 * 60 * 1000, // 2 hours
        maxLabels: 7
      });
    });
  });
});

describe('Responsive Metrics Calculation', () => {
  describe('calculateResponsiveMetrics', () => {
    it('should calculate complete metrics for mobile device', () => {
      const metrics = calculateResponsiveMetrics(375, 667, '2hours');
      
      expect(metrics.width).toBe(375);
      expect(metrics.height).toBe(667);
      expect(metrics.deviceType).toBe('mobile');
      expect(metrics.fontSize).toBe(10);
      expect(metrics.padding).toBeDefined();
      expect(metrics.timeConfig).toEqual({
        interval: 60 * 60 * 1000, // 1 hour
        maxLabels: 3
      });
    });

    it('should calculate complete metrics for tablet device', () => {
      const metrics = calculateResponsiveMetrics(768, 1024, '1hour');
      
      expect(metrics.width).toBe(768);
      expect(metrics.height).toBe(1024);
      expect(metrics.deviceType).toBe('tablet');
      expect(metrics.fontSize).toBe(12);
      expect(metrics.timeConfig).toEqual({
        interval: 15 * 60 * 1000, // 15 minutes
        maxLabels: 6
      });
    });

    it('should calculate complete metrics for desktop device', () => {
      const metrics = calculateResponsiveMetrics(1920, 1080, '6hours');
      
      expect(metrics.width).toBe(1920);
      expect(metrics.height).toBe(1080);
      expect(metrics.deviceType).toBe('desktop');
      expect(metrics.fontSize).toBe(14);
      expect(metrics.timeConfig).toEqual({
        interval: 1 * 60 * 60 * 1000, // 1 hour
        maxLabels: 7
      });
    });

    it('should maintain consistency between individual functions and combined metrics', () => {
      const width = 1024;
      const height = 768;
      const timeframe: TimeFrame = '30min';
      
      const metrics = calculateResponsiveMetrics(width, height, timeframe);
      const deviceType = detectDeviceType(width);
      const padding = calculateDynamicPadding(width, height, deviceType);
      const fontSize = getOptimalFontSize(deviceType);
      const timeConfig = getTimeframeConfig(timeframe, deviceType);
      
      expect(metrics.deviceType).toBe(deviceType);
      expect(metrics.padding).toEqual(padding);
      expect(metrics.fontSize).toBe(fontSize);
      expect(metrics.timeConfig).toEqual(timeConfig);
    });
  });
});

describe('Configuration Constants', () => {
  describe('BREAKPOINTS', () => {
    it('should have valid breakpoint values', () => {
      expect(BREAKPOINTS.mobile.max).toBe(767);
      expect(BREAKPOINTS.tablet.min).toBe(768);
      expect(BREAKPOINTS.tablet.max).toBe(1023);
      expect(BREAKPOINTS.desktop.min).toBe(1024);
    });

    it('should have consistent breakpoint boundaries', () => {
      expect(BREAKPOINTS.tablet.min).toBe(BREAKPOINTS.mobile.max + 1);
      expect(BREAKPOINTS.desktop.min).toBe(BREAKPOINTS.tablet.max + 1);
    });
  });

  describe('CHART_CONFIG', () => {
    it('should have valid padding configurations', () => {
      const deviceTypes: DeviceType[] = ['mobile', 'tablet', 'desktop'];
      
      deviceTypes.forEach(deviceType => {
        const padding = CHART_CONFIG.padding[deviceType];
        expect(padding.top).toBeGreaterThan(0);
        expect(padding.right).toBeGreaterThan(0);
        expect(padding.bottom).toBeGreaterThan(0);
        expect(padding.left).toBeGreaterThan(0);
      });
    });

    it('should have valid font size configurations', () => {
      expect(CHART_CONFIG.fontSize.mobile).toBeGreaterThan(0);
      expect(CHART_CONFIG.fontSize.tablet).toBeGreaterThan(0);
      expect(CHART_CONFIG.fontSize.desktop).toBeGreaterThan(0);
      
      // Desktop should have largest font, mobile smallest
      expect(CHART_CONFIG.fontSize.mobile).toBeLessThan(CHART_CONFIG.fontSize.tablet);
      expect(CHART_CONFIG.fontSize.tablet).toBeLessThan(CHART_CONFIG.fontSize.desktop);
    });

    it('should have valid label spacing configuration', () => {
      expect(CHART_CONFIG.labelSpacing.minDistance).toBeGreaterThan(0);
      expect(CHART_CONFIG.labelSpacing.maxLabels).toBeGreaterThan(0);
    });

    it('should have complete timeframe configurations', () => {
      const timeframes: TimeFrame[] = ['30min', '1hour', '2hours', '6hours', '12hours'];
      const deviceTypes: DeviceType[] = ['mobile', 'tablet', 'desktop'];
      
      timeframes.forEach(timeframe => {
        expect(CHART_CONFIG.timeIntervals[timeframe]).toBeDefined();
        
        deviceTypes.forEach(deviceType => {
          const config = CHART_CONFIG.timeIntervals[timeframe][deviceType];
          expect(config.interval).toBeGreaterThan(0);
          expect(config.maxLabels).toBeGreaterThan(0);
        });
      });
    });
  });
});