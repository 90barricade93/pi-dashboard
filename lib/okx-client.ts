import crypto from 'crypto';
import { logger } from './logger';

interface OKXConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

const CURRENCY_PAIRS: Record<string, string> = {
  EUR: 'EUR-USDT',
  GBP: 'GBP-USDT',
  JPY: 'JPY-USDT',
  RUB: 'RUB-USDT',
};

const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.92,
  GBP: 0.79,
  JPY: 150,
  RUB: 92,
};

type CandleTuple = [string, string, string, string, string, ...string[]];

export class OKXApiClient {
  private config: OKXConfig;
  private baseUrl = 'https://www.okx.com/api/v5';
  // Basic in-memory caches and rate-limit guard to reduce 429s and network load
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private conversionCache: Map<string, { rate: number; timestamp: number }> = new Map();
  private rateLimitedUntil = 0;
  private static readonly PRICE_TTL_MS = 60 * 1000; // 1 minute
  private static readonly CONV_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.config = {
      apiKey: process.env['OKX_API_KEY'] || '',
      apiSecret: process.env['OKX_API_SECRET'] || '',
      passphrase: process.env['OKX_PASSPHRASE'] || '',
    };
  }

  private generateSignature(
    timestamp: string,
    method: string,
    path: string,
    body?: string
  ): string {
    const message = timestamp + method + path + (body || '');
    return crypto.createHmac('sha256', this.config.apiSecret).update(message).digest('base64');
  }

  private async signedGet<T>(
    path: string,
    query: Record<string, string>,
    timestamp: string,
    now: number
  ): Promise<T> {
    const queryString = new URLSearchParams(query).toString();
    const signature = this.generateSignature(timestamp, 'GET', path);
    const response = await fetch(`${this.baseUrl}${path}?${queryString}`, {
      headers: {
        'OK-ACCESS-KEY': this.config.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.config.passphrase,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        this.rateLimitedUntil = now + OKXApiClient.RATE_LIMIT_COOLDOWN_MS;
      }
      throw new Error(`OKX request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private async getConversionRate(
    currency: string,
    timestamp: string,
    now: number
  ): Promise<number> {
    const upper = currency.toUpperCase();
    const fallback = FALLBACK_RATES[upper] ?? 1;
    const symbol = CURRENCY_PAIRS[upper];
    if (!symbol) return fallback;

    const cached = this.conversionCache.get(upper);
    if (cached && now - cached.timestamp < OKXApiClient.CONV_TTL_MS) {
      return cached.rate;
    }

    try {
      const data = await this.signedGet<{ data?: Array<{ last?: string }> }>(
        '/market/ticker',
        { instId: symbol },
        timestamp,
        now
      );
      const last = parseFloat(data?.data?.[0]?.last ?? '');
      if (!isNaN(last) && last > 0) {
        this.conversionCache.set(upper, { rate: last, timestamp: now });
        return last;
      }
      return fallback;
    } catch {
      logger.warn('okx_conversion_lookup_failed', { currency: upper });
      return fallback;
    }
  }

  async fetchPiPrice(
    currency: string = 'USD'
  ): Promise<{ price: number | null; error: string | null }> {
    try {
      const now = Date.now();
      const upper = currency.toUpperCase();

      // Respect cooldown if recently rate limited
      if (now < this.rateLimitedUntil) {
        const cached = this.priceCache.get(upper);
        if (cached && now - cached.timestamp < OKXApiClient.PRICE_TTL_MS) {
          return { price: cached.price, error: 'Using cached price (rate limited)' };
        }
        return { price: null, error: 'Rate limited; try again later' };
      }

      const timestamp = new Date().toISOString();
      const data = await this.signedGet<{ data?: Array<{ last: string }> }>(
        '/market/ticker',
        { instId: 'PI-USDT' },
        timestamp,
        now
      );

      if (!data?.data?.[0]) {
        throw new Error('Price data not found');
      }

      let price = parseFloat(data.data[0].last);

      if (upper !== 'USD') {
        const rate = await this.getConversionRate(upper, timestamp, now);
        price = price * rate;
      }

      this.priceCache.set(upper, { price, timestamp: now });
      return { price, error: null };
    } catch {
      logger.warn('okx_price_fetch_failed', { currency });
      return {
        price: null,
        error: 'Failed to fetch price data from OKX',
      };
    }
  }

  async fetchHistoricalData(
    currency: string = 'USD',
    days: number = 7,
    bar?: '1m' | '3m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '6H' | '12H' | '1D' | '1W' | '1M'
  ): Promise<{ data: { prices: [number, number][] } | null; error: string | null }> {
    try {
      const now = Date.now();
      const upper = currency.toUpperCase();
      const resolvedBar = bar ?? (days <= 2 ? '1H' : '1D');

      // Respect cooldown if rate limited recently; short-circuit with error to let UI fallback
      if (now < this.rateLimitedUntil) {
        return { data: null, error: 'Rate limited; try again later' };
      }

      const timestamp = new Date().toISOString();
      const data = await this.signedGet<{ data?: CandleTuple[] }>(
        '/market/candles',
        { instId: 'PI-USDT', bar: resolvedBar, limit: String(days) },
        timestamp,
        now
      );

      if (!data?.data) {
        throw new Error('Historical data not found');
      }

      let prices: [number, number][] = data.data.map(
        (candle) => [parseInt(candle[0]), parseFloat(candle[4])] as [number, number]
      );

      if (upper !== 'USD' && CURRENCY_PAIRS[upper]) {
        const rate = await this.getConversionRate(upper, timestamp, now);
        prices = prices.map(([ts, p]) => [ts, p * rate] as [number, number]);
      }

      return { data: { prices }, error: null };
    } catch {
      logger.warn('okx_historical_fetch_failed', { currency, days });
      return {
        data: null,
        error: 'Failed to fetch historical data from OKX',
      };
    }
  }
}
