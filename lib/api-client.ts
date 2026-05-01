// OKX-backed price API client; see lib/okx-client.ts for the underlying signing/caching logic.

import { OKXApiClient } from './okx-client';
import { logger } from './logger';

export interface HistoricalPriceData {
  prices: Array<[number, number]>;
}

// Fallback prices in case the API is unavailable
export const fallbackPrices = {
  USD: 0.00032,
  EUR: 0.00029,
  GBP: 0.00025,
  JPY: 0.048,
  RUB: 0.029,
};

const okxClient = new OKXApiClient();

/**
 * Fetch current Pi price from OKX
 */
export const fetchPiPrice = async (
  currency: string
): Promise<{ price: number | null; error: string | null }> => {
  try {
    return await okxClient.fetchPiPrice(currency);
  } catch (error) {
    logger.warn('fetch_pi_price_failed', { currency, error: String(error) });
    return {
      price: null,
      error: 'Failed to fetch price data. Using fallback data.',
    };
  }
};

/**
 * Fetch historical Pi price data from OKX
 */
export const fetchPiHistoricalData = async (
  currency: string,
  days = 7,
  bar?: '1m' | '3m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '6H' | '12H' | '1D' | '1W' | '1M'
): Promise<{ data: HistoricalPriceData | null; error: string | null }> => {
  try {
    return await okxClient.fetchHistoricalData(currency, days, bar);
  } catch (error) {
    logger.warn('fetch_pi_historical_failed', { currency, days, bar, error: String(error) });
    return {
      data: null,
      error: 'Failed to fetch historical data. Prediction may be less accurate.',
    };
  }
};
