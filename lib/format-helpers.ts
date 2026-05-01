/**
 * Formats an integer amount with locale grouping (e.g. 1000 → "1,000").
 * Used for preset buttons in the calculator.
 */
export function formatPresetAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

/**
 * Formats a large number with M/K suffix (e.g. 35000000 → "35.0M").
 * Used for compact stat displays.
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}
