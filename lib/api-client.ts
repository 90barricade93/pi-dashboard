// API client to handle CoinGecko API requests and key management

import { OKXApiClient } from './okx-client';

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
 * Get the CoinGecko API key from environment variables
 * Falls back to demo key if not set (not recommended for production)
 */
// export const getCoinGeckoApiKey = (): string => {
//   const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY

//   if (!apiKey) {
//     // Only log this warning during development
//     if (process.env.NODE_ENV === "development") {
//       console.warn(
//         "NEXT_PUBLIC_COINGECKO_API_KEY environment variable is not set. Using fallback demo key. " +
//           "This is not recommended for production use.",
//       )
//     }
//     // Return a demo key (limited usage)
//     return "CG-mLgtcXJ3Sof8g5thnCCosstx"
//   }

//   return apiKey
// }

/**
 * Fetch current Pi price from OKX
 */
export const fetchPiPrice = async (
  currency: string
): Promise<{ price: number | null; error: string | null }> => {
  try {
    return await okxClient.fetchPiPrice(currency);
  } catch (error) {
    console.error('Error fetching Pi price:', error);
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
  days = 7
): Promise<{ data: any; error: string | null }> => {
  try {
    return await okxClient.fetchHistoricalData(currency, days);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return {
      data: null,
      error: 'Failed to fetch historical data. Prediction may be less accurate.',
    };
  }
};
