import type { Currency } from '@/contexts/currency-context';

export const currencySymbols: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  RUB: '₽',
};
