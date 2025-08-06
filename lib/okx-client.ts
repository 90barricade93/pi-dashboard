import crypto from 'crypto';

interface OKXConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

export class OKXApiClient {
  private config: OKXConfig;
  private baseUrl = 'https://www.okx.com/api/v5';

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
                } else {
                  // Als de rate ongeldig is, gebruik fallback
                  price = price * fallbackRates[currency.toUpperCase()];
                }
              } else {
                // Als er geen data is, gebruik fallback
                price = price * fallbackRates[currency.toUpperCase()];
              }
            } else {
              // Als de API call faalt, gebruik fallback
              price = price * fallbackRates[currency.toUpperCase()];
            }
          } catch (error) {
            console.error('Error fetching conversion rate:', error);
            // Bij een error, gebruik fallback
            price = price * fallbackRates[currency.toUpperCase()];
          }
        }

        return { price, error: null };
      }

      throw new Error('Price data not found');
    } catch (error) {
      console.error('Error fetching Pi price from OKX:', error);
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
  ): Promise<{ data: any; error: string | null }> {
    try {
      const timestamp = new Date().toISOString();
      const path = '/market/candles';
      const symbol = 'PI-USDT';
      const signature = this.generateSignature(timestamp, 'GET', path);

      // Use provided granularity or default heuristic
      const resolvedBar = bar ?? (days <= 2 ? '1H' : '1D');

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
        throw new Error(`Historical data API request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data?.data) {
        // Base prices are in USDT terms. Convert if a different currency is requested.
        let prices = data.data.map((candle: any) => [
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
                }
              }

              prices = prices.map(([ts, p]: [number, number]) => [ts, p * rate] as [number, number]);
            } catch (e) {
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
    } catch (error) {
      console.error('Error fetching historical data from OKX:', error);
      return {
        data: null,
        error: 'Failed to fetch historical data from OKX',
      };
    }
  }
}
