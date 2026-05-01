'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from '@/components/ui/icons';
import { ChartSkeleton } from '@/components/ui/widget-skeleton';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/currency-context';
import { fetchPiPrice, fetchPiHistoricalData, fallbackPrices } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { currencySymbols } from '@/lib/currency-symbols';
import { withViewTransition } from '@/lib/view-transition';
import {
  generatePrediction,
  type HistoricalDataPoint,
  type PredictionData,
  type TimeFrame,
} from '@/lib/generate-prediction';
import { PriceChart, type PriceChartPoint } from '@/components/price-chart';

const HISTORY_PARAMS: Record<
  TimeFrame,
  { limit: number; bar: Parameters<typeof fetchPiHistoricalData>[2] }
> = {
  '30min': { limit: 72, bar: '5m' },
  '1hour': { limit: 144, bar: '5m' },
  '2hours': { limit: 192, bar: '15m' },
  '6hours': { limit: 192, bar: '30m' },
  '12hours': { limit: 168, bar: '1H' },
};

const formatPrice = (value: number, currency: string) => {
  const symbol = currencySymbols[currency as keyof typeof currencySymbols] ?? '';
  const decimals = currency === 'JPY' || currency === 'RUB' ? 5 : 6;
  return `${symbol}${value.toFixed(decimals)}`;
};

export default function PricePredictionCard() {
  const { currency } = useCurrency();
  const [timeFrame, setTimeFrameState] = useState<TimeFrame>('2hours');
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setTimeFrame = (next: TimeFrame) => {
    if (next === timeFrame) return;
    withViewTransition(() => setTimeFrameState(next));
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const { price, error: priceError } = await fetchPiPrice(currency);
        const currentPrice = price ?? fallbackPrices[currency];
        if (priceError && price === null) setError(priceError);

        const { limit, bar } = HISTORY_PARAMS[timeFrame];
        const { data, error: historyError } = await fetchPiHistoricalData(currency, limit, bar);

        if (cancelled) return;

        const points: HistoricalDataPoint[] = data?.prices
          ? data.prices.map(([t, p]) => ({ timestamp: t, price: p }))
          : [];

        if (!points.length && historyError) setError(historyError);

        setHistoricalData(points);
        setPrediction(generatePrediction(currentPrice, points, timeFrame));
      } catch (e) {
        if (cancelled) return;
        logger.error('price_prediction_fetch_failed', { currency, error: String(e) });
        setError('Failed to fetch complete data. Prediction may be less accurate.');
        setPrediction(generatePrediction(fallbackPrices[currency], [], timeFrame));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [currency, timeFrame]);

  const chartData: PriceChartPoint[] = historicalData.map(p => ({
    time: p.timestamp,
    value: p.price,
  }));

  const trendIcon =
    prediction?.trend === 'up' ? (
      <TrendingUp className="size-4 text-green-500" aria-hidden="true" />
    ) : prediction?.trend === 'down' ? (
      <TrendingDown className="size-4 text-red-500" aria-hidden="true" />
    ) : (
      <Minus className="size-4 text-blue-500" aria-hidden="true" />
    );

  const trendLabel =
    prediction?.trend === 'up' ? 'Bullish' : prediction?.trend === 'down' ? 'Bearish' : 'Stable';

  const trendClass =
    prediction?.trend === 'up'
      ? 'text-green-500'
      : prediction?.trend === 'down'
        ? 'text-red-500'
        : 'text-blue-500';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Price Prediction</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Tabs value={timeFrame} onValueChange={value => setTimeFrame(value as TimeFrame)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="30min">30m</TabsTrigger>
              <TabsTrigger value="1hour">1h</TabsTrigger>
              <TabsTrigger value="2hours">2h</TabsTrigger>
              <TabsTrigger value="6hours">6h</TabsTrigger>
              <TabsTrigger value="12hours">12h</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading || !prediction ? (
            <ChartSkeleton />
          ) : (
            <>
              <PriceChart
                data={chartData}
                targetPrice={prediction.targetPrice}
                trend={prediction.trend}
                ariaLabel={`Pi price chart over ${timeFrame}, target ${formatPrice(prediction.targetPrice, currency)} (${trendLabel})`}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Current Price</div>
                  <div className="font-medium">
                    {formatPrice(prediction.currentPrice, currency)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Target Price</div>
                  <div className={cn('font-medium', trendClass)}>
                    {formatPrice(prediction.targetPrice, currency)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Trend</div>
                  <div className="flex items-center gap-1">
                    {trendIcon}
                    <span className={trendClass}>{trendLabel}</span>
                    <span className="ml-1 text-sm text-muted-foreground">
                      ({prediction.confidence.toFixed(2)}% confidence)
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="text-sm font-medium">Analysis</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {prediction.reasons.map((reason, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-amber-500">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
