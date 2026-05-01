'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from '@/components/ui/icons';
import { PriceCardSkeleton } from '@/components/ui/widget-skeleton';
import { cn } from '@/lib/utils';
import { useCurrency, type Currency } from '@/contexts/currency-context';
import { currencySymbols } from '@/lib/currency-symbols';
import { PoweredByOkx } from '@/components/powered-by-okx';
import { notifyError } from '@/lib/toast';
import { usePiPriceStream } from '@/hooks/use-pi-price-stream';

export default function PriceTracker() {
  const { currency, setCurrency } = useCurrency();
  const { price, status, error, lastUpdated } = usePiPriceStream(currency);
  const errorToastedRef = useRef(false);
  const prevPriceRef = useRef<number | null>(null);
  const previousPrice = prevPriceRef.current;

  useEffect(() => {
    prevPriceRef.current = price;
  }, [price]);

  useEffect(() => {
    if (status === 'error' && !errorToastedRef.current) {
      notifyError('Pi price stream interrupted — reconnecting.');
      errorToastedRef.current = true;
    }
    if (status === 'connected') {
      errorToastedRef.current = false;
    }
  }, [status]);

  const loading = price === null;
  const priceChange =
    price !== null && previousPrice !== null && previousPrice !== price
      ? price - previousPrice
      : null;
  const priceChangePercent =
    priceChange !== null && previousPrice !== null && previousPrice !== 0
      ? (priceChange / previousPrice) * 100
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-2 pb-2 @sm/card:flex-row @sm/card:items-center @sm/card:justify-between @sm/card:gap-0">
        <CardTitle>Price</CardTitle>
        <div className="flex flex-wrap gap-1 @md/card:flex-nowrap">
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
        {loading ? (
          <PriceCardSkeleton />
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="flex flex-col items-center"
            >
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
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  ) : priceChange < 0 ? (
                    <ArrowDownRight className="size-4" aria-hidden="true" />
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
            </div>

            {error && (
              <div className="mt-1 flex items-center gap-1 text-xs text-amber-500">
                <AlertTriangle className="size-3" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground">
              Last updated: {lastUpdated?.toLocaleTimeString() ?? '—'}
            </div>

            <PoweredByOkx />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
