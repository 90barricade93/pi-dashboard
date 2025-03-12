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
      passphrase: process.env['OKX_PASSPHRASE'] || ''
    };
  }

  private generateSignature(timestamp: string, method: string, path: string, body?: string): string {
    const message = timestamp + method + path + (body || '');
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(message)
      .digest('base64');
  }

  async fetchPiPrice(currency: string = 'USD'): Promise<{ price: number | null; error: string | null }> {
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
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data?.data?.[0]) {
        let price = parseFloat(data.data[0].last);

        // Convert to requested currency if not USD
        if (currency.toUpperCase() !== 'USD') {
          // Fetch conversion rate from OKX
          const conversionPath = '/market/ticker';
          const conversionSymbol = `${currency.toUpperCase()}-USDT`;
          const conversionSignature = this.generateSignature(timestamp, 'GET', conversionPath);

          const conversionResponse = await fetch(`${this.baseUrl}${conversionPath}?instId=${conversionSymbol}`, {
            headers: {
              'OK-ACCESS-KEY': this.config.apiKey,
              'OK-ACCESS-SIGN': conversionSignature,
              'OK-ACCESS-TIMESTAMP': timestamp,
              'OK-ACCESS-PASSPHRASE': this.config.passphrase,
            }
          });

          if (conversionResponse.ok) {
            const conversionData = await conversionResponse.json();
            if (conversionData?.data?.[0]) {
              const rate = parseFloat(conversionData.data[0].last);
              price = price * rate;
            }
          }
        }

        return { price, error: null };
      }

      throw new Error('Price data not found');
    } catch (error) {
      console.error('Error fetching Pi price from OKX:', error);
      return {
        price: null,
        error: 'Failed to fetch price data from OKX'
      };
    }
  }

  async fetchHistoricalData(currency: string = 'USD', days: number = 7): Promise<{ data: any; error: string | null }> {
    try {
      const timestamp = new Date().toISOString();
      const path = '/market/candles';
      const symbol = 'PI-USDT';
      const signature = this.generateSignature(timestamp, 'GET', path);

      // Convert days to granularity (1D = 86400 seconds)
      const bar = '1D';

      const response = await fetch(
        `${this.baseUrl}${path}?instId=${symbol}&bar=${bar}&limit=${days}`,
        {
          headers: {
            'OK-ACCESS-KEY': this.config.apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': this.config.passphrase,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Historical data API request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data?.data) {
        // Transform data to match expected format
        const prices = data.data.map((candle: any) => [
          parseInt(candle[0]), // timestamp
          parseFloat(candle[4]) // closing price
        ]);

        return {
          data: { prices },
          error: null
        };
      }

      throw new Error('Historical data not found');
    } catch (error) {
      console.error('Error fetching historical data from OKX:', error);
      return {
        data: null,
        error: 'Failed to fetch historical data from OKX'
      };
    }
  }
} 