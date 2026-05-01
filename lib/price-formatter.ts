import type { Currency } from '@/contexts/currency-context';

export interface PriceFormattingOptions {
  currency: Currency;
  availableWidth: number;
  fontSize: number;
  maxDecimals?: number;
  minDecimals?: number;
  useCompactNotation?: boolean;
  preserveSignificantDigits?: boolean;
}

export interface FormattedPrice {
  text: string;
  decimals: number;
  isCompact: boolean;
  isTruncated: boolean;
}

// Currency symbols and their characteristics
const CURRENCY_CONFIG = {
  EUR: { symbol: '€', position: 'prefix', avgDigitWidth: 0.6 },
  USD: { symbol: '$', position: 'prefix', avgDigitWidth: 0.6 },
  GBP: { symbol: '£', position: 'prefix', avgDigitWidth: 0.6 },
  JPY: { symbol: '¥', position: 'prefix', avgDigitWidth: 0.6 },
  RUB: { symbol: '₽', position: 'suffix', avgDigitWidth: 0.6 },
} as const;

// Estimate character width based on font size
const estimateCharWidth = (fontSize: number): number => {
  return fontSize * 0.6; // Approximate monospace character width
};

// Calculate maximum characters that fit in available width
const calculateMaxChars = (availableWidth: number, fontSize: number): number => {
  const charWidth = estimateCharWidth(fontSize);
  return Math.floor(availableWidth / charWidth);
};

// Determine optimal decimal places based on price magnitude and available space
const calculateOptimalDecimals = (
  price: number,
  maxChars: number,
  currency: Currency,
  options: PriceFormattingOptions
): number => {
  const config = CURRENCY_CONFIG[currency];
  const symbolLength = config.symbol.length;

  // Calculate space available for digits (excluding symbol)
  const availableDigitChars = maxChars - symbolLength;

  if (availableDigitChars <= 0) return 0;

  // Get integer part length
  const integerPart = Math.floor(Math.abs(price));
  const integerLength = integerPart.toString().length;

  // Calculate available space for decimals (including decimal point)
  const availableDecimalChars = availableDigitChars - integerLength - 1; // -1 for decimal point

  if (availableDecimalChars <= 0) return 0;

  // Apply constraints from options
  const maxDecimals = options.maxDecimals ?? 6;
  const minDecimals = options.minDecimals ?? 0;

  // Calculate optimal decimals based on price magnitude
  let optimalDecimals: number;

  if (price === 0) {
    // Special case for zero - use minimum decimals or 2, whichever is higher
    optimalDecimals = Math.min(Math.max(2, minDecimals), availableDecimalChars);
  } else if (Math.abs(price) >= 1) {
    // For prices >= 1, use fewer decimals
    optimalDecimals = Math.min(2, availableDecimalChars);
  } else if (Math.abs(price) >= 0.01) {
    // For prices between 0.01 and 1, use moderate decimals
    optimalDecimals = Math.min(4, availableDecimalChars);
  } else {
    // For very small prices, use more decimals to show significant digits
    optimalDecimals = Math.min(6, availableDecimalChars);
  }

  // Apply min/max constraints
  optimalDecimals = Math.max(minDecimals, Math.min(maxDecimals, optimalDecimals));

  return optimalDecimals;
};

// Format price with scientific notation for very small or large numbers
const formatScientific = (price: number, currency: Currency, maxChars: number): FormattedPrice => {
  const config = CURRENCY_CONFIG[currency];

  // Try different precision levels for scientific notation
  for (let precision = 2; precision >= 0; precision--) {
    const scientific = price.toExponential(precision);
    const fullText =
      config.position === 'prefix' ? config.symbol + scientific : scientific + config.symbol;

    if (fullText.length <= maxChars) {
      return {
        text: fullText,
        decimals: precision,
        isCompact: true,
        isTruncated: false,
      };
    }
  }

  // If even scientific notation is too long, truncate
  const truncated = config.symbol + '...';
  return {
    text: truncated,
    decimals: 0,
    isCompact: true,
    isTruncated: true,
  };
};

// Format price with compact notation (K, M, B suffixes)
const formatCompact = (price: number, currency: Currency, maxChars: number): FormattedPrice => {
  const config = CURRENCY_CONFIG[currency];

  const suffixes = [
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'K' },
  ];

  for (const { value, suffix } of suffixes) {
    if (Math.abs(price) >= value) {
      const compactValue = price / value;

      // Try different decimal places
      for (let decimals = 2; decimals >= 0; decimals--) {
        const formatted = compactValue.toFixed(decimals) + suffix;
        const fullText =
          config.position === 'prefix' ? config.symbol + formatted : formatted + config.symbol;

        if (fullText.length <= maxChars) {
          return {
            text: fullText,
            decimals,
            isCompact: true,
            isTruncated: false,
          };
        }
      }
    }
  }

  // If no compact format works, fall back to regular formatting
  return formatRegular(price, currency, maxChars, {});
};

// Format price with regular decimal notation
const formatRegular = (
  price: number,
  currency: Currency,
  maxChars: number,
  options: Partial<PriceFormattingOptions>
): FormattedPrice => {
  const config = CURRENCY_CONFIG[currency];

  // Calculate optimal decimal places
  const decimals = calculateOptimalDecimals(price, maxChars, currency, {
    currency,
    availableWidth: maxChars * estimateCharWidth(12), // Use default font size for calculation
    fontSize: 12,
    ...options,
  });

  const formatted = price.toFixed(decimals);
  const fullText =
    config.position === 'prefix' ? config.symbol + formatted : formatted + config.symbol;

  if (fullText.length <= maxChars) {
    return {
      text: fullText,
      decimals,
      isCompact: false,
      isTruncated: false,
    };
  }

  // If still too long, try reducing decimals further
  for (let d = decimals - 1; d >= 0; d--) {
    const reducedFormatted = price.toFixed(d);
    const reducedText =
      config.position === 'prefix'
        ? config.symbol + reducedFormatted
        : reducedFormatted + config.symbol;

    if (reducedText.length <= maxChars) {
      return {
        text: reducedText,
        decimals: d,
        isCompact: false,
        isTruncated: false,
      };
    }
  }

  // Last resort: truncate with ellipsis
  const truncated = config.symbol + '...';
  return {
    text: truncated,
    decimals: 0,
    isCompact: false,
    isTruncated: true,
  };
};

// Main price formatting function
export const formatPriceForSpace = (
  price: number,
  options: PriceFormattingOptions
): FormattedPrice => {
  const { currency, availableWidth, fontSize } = options;
  const maxChars = calculateMaxChars(availableWidth, fontSize);

  // Handle edge cases
  if (maxChars <= 2) {
    return {
      text: CURRENCY_CONFIG[currency].symbol,
      decimals: 0,
      isCompact: false,
      isTruncated: true,
    };
  }

  if (!isFinite(price) || isNaN(price)) {
    return {
      text: CURRENCY_CONFIG[currency].symbol + 'N/A',
      decimals: 0,
      isCompact: false,
      isTruncated: true,
    };
  }

  // For very small numbers (< 0.000001), use scientific notation
  if (Math.abs(price) < 0.000001 && price !== 0) {
    return formatScientific(price, currency, maxChars);
  }

  // For very large numbers (> 1000000) and compact notation is enabled
  if (options.useCompactNotation && Math.abs(price) >= 1000000) {
    const compactResult = formatCompact(price, currency, maxChars);
    if (!compactResult.isTruncated) {
      return compactResult;
    }
  }

  // Use regular formatting
  return formatRegular(price, currency, maxChars, options);
};

// Utility function for backward compatibility with existing code
export const formatPriceForSpaceSimple = (
  price: number,
  availableWidth: number,
  fontSize: number,
  currency: Currency
): string => {
  const result = formatPriceForSpace(price, {
    currency,
    availableWidth,
    fontSize,
    maxDecimals: 6,
    minDecimals: 0,
  });

  return result.text;
};

// Get currency symbol
export const getCurrencySymbol = (currency: Currency): string => {
  return CURRENCY_CONFIG[currency].symbol;
};

// Check if currency symbol is positioned as prefix or suffix
export const isCurrencyPrefix = (currency: Currency): boolean => {
  return CURRENCY_CONFIG[currency].position === 'prefix';
};

// Calculate the width needed for a formatted price
export const calculatePriceWidth = (
  price: number,
  currency: Currency,
  decimals: number,
  fontSize: number
): number => {
  const config = CURRENCY_CONFIG[currency];
  const formatted = price.toFixed(decimals);
  const fullText =
    config.position === 'prefix' ? config.symbol + formatted : formatted + config.symbol;

  return fullText.length * estimateCharWidth(fontSize);
};
