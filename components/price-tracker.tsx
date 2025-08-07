'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { ArrowUp, ArrowDown, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency, type Currency } from '@/contexts/currency-context';
import { fetchPiPrice } from '@/lib/api-client';

const currencySymbols: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  RUB: '₽',
};

export default function PriceTracker() {
  const { currency, setCurrency } = useCurrency();
  const [price, setPrice] = useState<number | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch Pi price from OKX API
  const getPiPrice = async () => {
    setLoading(true);
    setError(null);

    // Store previous price for comparison
    if (price !== null) {
      setPreviousPrice(price);
    }

    try {
      const result = await fetchPiPrice(currency);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.price !== null) {
        setPrice(result.price);
        setLastUpdated(new Date());
      } else {
        throw new Error('Price data not available');
      }
    } catch (error) {
      console.error('Error fetching Pi price:', error);
      setError('Failed to fetch price data. Using fallback data.');

      // Fallback to simulated data if API fails
      const basePrice = 0.00032; // Approximate Pi price in USD as fallback

      // Apply currency conversion (simplified for fallback)
      const rates: Record<Currency, number> = {
        EUR: 0.92,
        USD: 1,
        GBP: 0.79,
        JPY: 150,
        RUB: 92,
      };

      const convertedPrice = basePrice * rates[currency];
      setPrice(convertedPrice);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and setup interval for updates
  useEffect(() => {
    getPiPrice();

    // Update price every 30 seconds
    const interval = setInterval(getPiPrice, 30000);

    return () => clearInterval(interval);
  }, [currency]);

  // Calculate price change
  const priceChange = price !== null && previousPrice !== null ? price - previousPrice : null;

  const priceChangePercent =
    price !== null && previousPrice !== null && previousPrice !== 0
      ? ((price - previousPrice) / previousPrice) * 100
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Pi Price</CardTitle>
        <div className="flex gap-1">
          {Object.keys(currencySymbols).map(curr => (
            <Button
              key={curr}
              variant={currency === curr ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrency(curr as Currency)}
              className="w-12"
            >
              {currencySymbols[curr as Currency]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-4">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <span className="animate-spin text-2xl">🔄</span>
            </div>
          ) : (
            <>
              <div className="mb-2 text-4xl font-bold">
                {currencySymbols[currency]}
                {price?.toFixed(currency === 'JPY' || currency === 'RUB' ? 5 : 6)}
              </div>

              {priceChange !== null && (
                <div
                  className={cn(
                    'flex items-center text-sm',
                    priceChange > 0
                      ? 'text-green-500'
                      : priceChange < 0
                        ? 'text-red-500'
                        : 'text-gray-500'
                  )}
                >
                  {priceChange > 0 ? (
                    <span>↗️</span>
                  ) : priceChange < 0 ? (
                    <span>↘️</span>
                  ) : null}
                  <span>
                    {priceChange > 0 ? '+' : ''}
                    {priceChange.toFixed(8)}(
                    {priceChangePercent !== null
                      ? (priceChangePercent > 0 ? '+' : '') + priceChangePercent.toFixed(2)
                      : 0}
                    %)
                  </span>
                </div>
              )}

              {error && (
                <div className="mt-1 flex items-center gap-1 text-xs text-amber-500">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-4 text-xs text-muted-foreground">
                Last updated: {lastUpdated?.toLocaleTimeString()}
              </div>

              <div className="mt-2 flex items-center justify-center text-center text-xs text-muted-foreground">
                <span>Powered by</span>
                <a
                  href="https://www.okx.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 flex items-center transition-colors hover:text-foreground"
                >
                  OKX
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-1 size-3"
                  >
                    <path d="M7 17L17 7"></path>
                    <path d="M7 7h10v10"></path>
                  </svg>
                </a>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
