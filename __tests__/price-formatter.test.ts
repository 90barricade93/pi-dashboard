import {
  formatPriceForSpace,
  formatPriceForSpaceSimple,
  getCurrencySymbol,
  isCurrencyPrefix,
  calculatePriceWidth,
  type PriceFormattingOptions,
} from '@/lib/price-formatter';
import type { Currency } from '@/contexts/currency-context';

describe('Price Formatter', () => {
  describe('formatPriceForSpace', () => {
    const baseOptions: PriceFormattingOptions = {
      currency: 'USD' as Currency,
      availableWidth: 100,
      fontSize: 12,
    };

    it('should format regular prices with appropriate decimals', () => {
      const result = formatPriceForSpace(1.234567, baseOptions);
      
      expect(result.text).toBe('$1.23');
      expect(result.decimals).toBe(2);
      expect(result.isCompact).toBe(false);
      expect(result.isTruncated).toBe(false);
    });

    it('should format small prices with more decimals', () => {
      const result = formatPriceForSpace(0.001234, baseOptions);
      
      expect(result.text).toBe('$0.001234');
      expect(result.decimals).toBe(6);
      expect(result.isCompact).toBe(false);
      expect(result.isTruncated).toBe(false);
    });

    it('should use scientific notation for very small prices', () => {
      const result = formatPriceForSpace(0.0000001, baseOptions);
      
      expect(result.text).toBe('$1.00e-7');
      expect(result.isCompact).toBe(true);
      expect(result.isTruncated).toBe(false);
    });

    it('should handle different currencies correctly', () => {
      const eurOptions = { ...baseOptions, currency: 'EUR' as Currency };
      const result = formatPriceForSpace(1.234, eurOptions);
      
      expect(result.text).toBe('€1.23');
    });

    it('should handle suffix currencies correctly', () => {
      const rubOptions = { ...baseOptions, currency: 'RUB' as Currency };
      const result = formatPriceForSpace(1.234, rubOptions);
      
      expect(result.text).toBe('1.23₽');
    });

    it('should use compact notation for large numbers when enabled', () => {
      const options = { ...baseOptions, useCompactNotation: true };
      const result = formatPriceForSpace(1234567, options);
      
      expect(result.text).toBe('$1.23M');
      expect(result.isCompact).toBe(true);
    });

    it('should respect maximum decimal constraints', () => {
      const options = { ...baseOptions, maxDecimals: 2 };
      const result = formatPriceForSpace(0.123456, options);
      
      expect(result.decimals).toBeLessThanOrEqual(2);
    });

    it('should respect minimum decimal constraints', () => {
      const options = { ...baseOptions, minDecimals: 3 };
      const result = formatPriceForSpace(1, options);
      
      expect(result.decimals).toBeGreaterThanOrEqual(3);
      expect(result.text).toBe('$1.000');
    });

    it('should handle very limited space by truncating', () => {
      const options = { ...baseOptions, availableWidth: 20 }; // Very small width
      const result = formatPriceForSpace(123.456, options);
      
      expect(result.text.length).toBeLessThanOrEqual(3); // Should fit in available space
    });

    it('should handle invalid numbers gracefully', () => {
      const nanResult = formatPriceForSpace(NaN, baseOptions);
      expect(nanResult.text).toBe('$N/A');
      expect(nanResult.isTruncated).toBe(true);

      const infinityResult = formatPriceForSpace(Infinity, baseOptions);
      expect(infinityResult.text).toBe('$N/A');
      expect(infinityResult.isTruncated).toBe(true);
    });

    it('should handle zero correctly', () => {
      const result = formatPriceForSpace(0, baseOptions);
      
      expect(result.text).toBe('$0.00');
      expect(result.decimals).toBe(2);
    });

    it('should handle negative numbers correctly', () => {
      const result = formatPriceForSpace(-1.234, baseOptions);
      
      expect(result.text).toBe('$-1.23');
      expect(result.decimals).toBe(2);
    });
  });

  describe('formatPriceForSpaceSimple', () => {
    it('should provide backward compatibility', () => {
      const result = formatPriceForSpaceSimple(1.234567, 100, 12, 'USD');
      
      expect(result).toBe('$1.23');
    });

    it('should work with different currencies', () => {
      const result = formatPriceForSpaceSimple(1.234567, 100, 12, 'EUR');
      
      expect(result).toBe('€1.23');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct symbols for all currencies', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(getCurrencySymbol('JPY')).toBe('¥');
      expect(getCurrencySymbol('RUB')).toBe('₽');
    });
  });

  describe('isCurrencyPrefix', () => {
    it('should correctly identify prefix currencies', () => {
      expect(isCurrencyPrefix('USD')).toBe(true);
      expect(isCurrencyPrefix('EUR')).toBe(true);
      expect(isCurrencyPrefix('GBP')).toBe(true);
      expect(isCurrencyPrefix('JPY')).toBe(true);
    });

    it('should correctly identify suffix currencies', () => {
      expect(isCurrencyPrefix('RUB')).toBe(false);
    });
  });

  describe('calculatePriceWidth', () => {
    it('should calculate width for formatted prices', () => {
      const width = calculatePriceWidth(1.234, 'USD', 2, 12);
      
      expect(width).toBeGreaterThan(0);
      expect(typeof width).toBe('number');
    });

    it('should account for currency symbol position', () => {
      const usdWidth = calculatePriceWidth(1.234, 'USD', 2, 12);
      const rubWidth = calculatePriceWidth(1.234, 'RUB', 2, 12);
      
      // Both should be similar width since they have same number of characters
      expect(Math.abs(usdWidth - rubWidth)).toBeLessThan(1);
    });
  });

  describe('Edge Cases', () => {
    const baseOptions: PriceFormattingOptions = {
      currency: 'USD' as Currency,
      availableWidth: 100,
      fontSize: 12,
    };

    it('should handle extremely small available width', () => {
      const options = { ...baseOptions, availableWidth: 5 };
      const result = formatPriceForSpace(123.456, options);
      
      expect(result.text).toBe('$');
      expect(result.isTruncated).toBe(true);
    });

    it('should handle very large numbers without compact notation', () => {
      const result = formatPriceForSpace(1234567890, baseOptions);
      
      expect(result.text).toContain('$1234567890');
      expect(result.isCompact).toBe(false);
    });

    it('should prioritize significant digits when space is limited', () => {
      const options = { 
        ...baseOptions, 
        availableWidth: 50, // Limited space
        preserveSignificantDigits: true 
      };
      const result = formatPriceForSpace(0.00123456, options);
      
      // Should show meaningful digits even with limited space
      expect(result.text).toMatch(/\$0\.001/);
    });

    it('should handle different font sizes correctly', () => {
      const smallFont = { ...baseOptions, fontSize: 8 };
      const largeFont = { ...baseOptions, fontSize: 16 };
      
      const smallResult = formatPriceForSpace(1.234567, smallFont);
      const largeResult = formatPriceForSpace(1.234567, largeFont);
      
      // Smaller font should allow more characters
      expect(smallResult.text.length).toBeGreaterThanOrEqual(largeResult.text.length);
    });
  });

  describe('Currency-Specific Formatting', () => {
    it('should handle JPY (typically no decimals) appropriately', () => {
      const jpyOptions: PriceFormattingOptions = {
        currency: 'JPY' as Currency,
        availableWidth: 100,
        fontSize: 12,
        maxDecimals: 0, // JPY typically doesn't use decimals
      };
      
      const result = formatPriceForSpace(123.456, jpyOptions);
      
      expect(result.text).toBe('¥123');
      expect(result.decimals).toBe(0);
    });

    it('should handle very small JPY values with decimals when needed', () => {
      const jpyOptions: PriceFormattingOptions = {
        currency: 'JPY' as Currency,
        availableWidth: 100,
        fontSize: 12,
        minDecimals: 2, // Force decimals for very small values
      };
      
      const result = formatPriceForSpace(0.123, jpyOptions);
      
      expect(result.decimals).toBeGreaterThanOrEqual(2);
    });
  });
});