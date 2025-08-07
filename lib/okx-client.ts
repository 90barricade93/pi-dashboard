import crypto from 'crypto';

interface OKXConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

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

  async fetchPiPrice(
    currency: string = 'USD'
  ): Promise<{ price: number | null; error: string | null }> {
    try {
      const now = Date.now();
      // Respect cooldown if recently rate limited
      if (now < this.rateLimitedUntil) {
        const cached = this.priceCache.get(currency.toUpperCase());
        if (cached && now - cached.timestamp < OKXApiClient.PRICE_TTL_MS) {
          return { price: cached.price, error: 'Using cached price (rate limited)' };
        }
        return { price: null, error: 'Rate limited; try again later' };
      }

      const timestamp = new Date().toISOString();
      const path = '/market/ticker';
      const symbol = 'PI-USDT'; // Pi tegen USDT
      const signature = this.generateSignature(timestamp, 'GET', path);

      const response = await fetch(`${this.baseUrl}${path}?instId=${symbol}`, {
        headers: {
          'OK-ACCESS-KEY': this.config.apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': this.config.passphrase,
        },
      });

      if (!response.ok) {
        // Apply cooldown on 429s to avoid spamming
        if (response.status === 429) {
          this.rateLimitedUntil = now + OKXApiClient.RATE_LIMIT_COOLDOWN_MS;
        }
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data?.data?.[0]) {
        let price = parseFloat(data.data[0].last);

        // Convert to requested currency if not USD
        if (currency.toUpperCase() !== 'USD') {
          // Valutaparen mapping voor OKX
          const currencyPairs: Record<string, string> = {
            EUR: 'EUR-USDT',
            GBP: 'GBP-USDT',
            JPY: 'JPY-USDT',
            RUB: 'RUB-USDT'
          };

          // Fallback conversie rates als API faalt
          const fallbackRates: Record<string, number> = {
            EUR: 0.92,
            GBP: 0.79,
            JPY: 150,
            RUB: 92
          };

          try {
            // Fetch conversion rate from OKX
            const conversionPath = '/market/ticker';
            const conversionSymbol = currencyPairs[currency.toUpperCase()];
            const conversionSignature = this.generateSignature(timestamp, 'GET', conversionPath);

            // Use cached conversion if fresh
            const cachedConv = this.conversionCache.get(currency.toUpperCase());
            if (cachedConv && now - cachedConv.timestamp < OKXApiClient.CONV_TTL_MS) {
              price = price * cachedConv.rate;
              // cache final price
              this.priceCache.set(currency.toUpperCase(), { price, timestamp: now });
              return { price, error: null };
            }

            const conversionResponse = await fetch(
              `${this.baseUrl}${conversionPath}?instId=${conversionSymbol}`,
              {
                headers: {
                  'OK-ACCESS-KEY': this.config.apiKey,
                  'OK-ACCESS-SIGN': conversionSignature,
                  'OK-ACCESS-TIMESTAMP': timestamp,
                  'OK-ACCESS-PASSPHRASE': this.config.passphrase,
                },
              }
            );

            if (conversionResponse.ok) {
              const conversionData = await conversionResponse.json();
              if (conversionData?.data?.[0]) {
                const rate = parseFloat(conversionData.data[0].last);
                if (!isNaN(rate) && rate > 0) {
                  price = price * rate;
                  this.conversionCache.set(currency.toUpperCase(), { rate, timestamp: now });
                } else {
                  // Als de rate ongeldig is, gebruik fallback
                  price = price * fallbackRates[currency.toUpperCase()];
                }
              } else {
                // Als er geen data is, gebruik fallback
                price = price * fallbackRates[currency.toUpperCase()];
              }
            } else {
              if (conversionResponse.status === 429) {
                this.rateLimitedUntil = now + OKXApiClient.RATE_LIMIT_COOLDOWN_MS;
              }
              // Als de API call faalt, gebruik fallback
              price = price * fallbackRates[currency.toUpperCase()];
            }
          } catch {
            // Non-fatal: keep logs quiet during known rate limits
            if (process.env['NODE_ENV'] === 'development') {
              console.warn('Conversion rate lookup failed, using fallback');
            }
            // Bij een error, gebruik fallback
            price = price * fallbackRates[currency.toUpperCase()];
          }
        }

        // cache successful price
        this.priceCache.set(currency.toUpperCase(), { price, timestamp: now });
        return { price, error: null };
      }

      throw new Error('Price data not found');
    } catch {
      // Avoid noisy errors in the console; surface a concise message upstream
      if (process.env['NODE_ENV'] === 'development') {
        console.warn('OKX price fetch failed; returning null');
      }
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
      const timestamp = new Date().toISOString();
      const path = '/market/candles';
      const symbol = 'PI-USDT';
      const signature = this.generateSignature(timestamp, 'GET', path);

      // Use provided granularity or default heuristic
      const resolvedBar = bar ?? (days <= 2 ? '1H' : '1D');

      // Respect cooldown if rate limited recently; short-circuit with error to let UI fallback
      if (now < this.rateLimitedUntil) {
        return { data: null, error: 'Rate limited; try again later' };
      }

      const response = await fetch(
        `${this.baseUrl}${path}?instId=${symbol}&bar=${resolvedBar}&limit=${days}`,
        {
          headers: {
            'OK-ACCESS-KEY': this.config.apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': this.config.passphrase,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          this.rateLimitedUntil = now + OKXApiClient.RATE_LIMIT_COOLDOWN_MS;
        }
        throw new Error(`Historical data API request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data?.data) {
        // Base prices are in USDT terms. Convert if a different currency is requested.
        type CandleTuple = [string, string, string, string, string, ...string[]];
        const raw: CandleTuple[] = data.data as CandleTuple[];
        let prices = raw.map((candle) => [
          parseInt(candle[0]), // timestamp
          parseFloat(candle[4]), // closing price
        ] as [number, number]);

        if (currency.toUpperCase() !== 'USD') {
          // Map desired currency to its USDT pair for conversion
          const currencyPairs: Record<string, string> = {
            EUR: 'EUR-USDT',
            GBP: 'GBP-USDT',
            JPY: 'JPY-USDT',
            RUB: 'RUB-USDT',
          };

          const fallbackRates: Record<string, number> = {
            EUR: 0.92,
            GBP: 0.79,
            JPY: 150,
            RUB: 92,
          };

          const convSymbol = currencyPairs[currency.toUpperCase()];
          if (convSymbol) {
            try {
              const conversionPath = '/market/ticker';
              const conversionSignature = this.generateSignature(timestamp, 'GET', conversionPath);
              // Use cached conversion rate if available
              const cachedConv = this.conversionCache.get(currency.toUpperCase());
              if (cachedConv && now - cachedConv.timestamp < OKXApiClient.CONV_TTL_MS) {
                const rate = cachedConv.rate;
                prices = prices.map(([ts, p]: [number, number]) => [ts, p * rate] as [number, number]);
              } else {
                const conversionResponse = await fetch(
                `${this.baseUrl}${conversionPath}?instId=${convSymbol}`,
                {
                  headers: {
                    'OK-ACCESS-KEY': this.config.apiKey,
                    'OK-ACCESS-SIGN': conversionSignature,
                    'OK-ACCESS-TIMESTAMP': timestamp,
                    'OK-ACCESS-PASSPHRASE': this.config.passphrase,
                  },
                }
              );

                let rate = fallbackRates[currency.toUpperCase()] ?? 1;
                if (conversionResponse.ok) {
                  const conversionData = await conversionResponse.json();
                  const last = parseFloat(conversionData?.data?.[0]?.last ?? '');
                  if (!isNaN(last) && last > 0) {
                    rate = last;
                    this.conversionCache.set(currency.toUpperCase(), { rate, timestamp: now });
                  }
                } else if (conversionResponse.status === 429) {
                  this.rateLimitedUntil = now + OKXApiClient.RATE_LIMIT_COOLDOWN_MS;
                }

                prices = prices.map(([ts, p]: [number, number]) => [ts, p * rate] as [number, number]);
              }
            } catch {
              // On any error, fall back to static rate
              const rate = fallbackRates[currency.toUpperCase()] ?? 1;
              prices = prices.map(([ts, p]: [number, number]) => [ts, p * rate] as [number, number]);
            }
          }
        }

        return {
          data: { prices },
          error: null,
        };
      }

      throw new Error('Historical data not found');
    } catch {
      if (process.env['NODE_ENV'] === 'development') {
        console.warn('OKX historical fetch failed; returning null');
      }
      return {
        data: null,
        error: 'Failed to fetch historical data from OKX',
      };
    }
  }
}
