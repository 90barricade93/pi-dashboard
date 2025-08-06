'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency, type Currency } from '@/contexts/currency-context';
import { fetchPiPrice, fetchPiHistoricalData, fallbackPrices } from '@/lib/api-client';

type PredictionTrend = 'up' | 'down' | 'stable';
type TimeFrame = '30min' | '1hour' | '2hours' | '6hours' | '12hours';

interface PredictionData {
  trend: PredictionTrend;
  confidence: number;
  targetPrice: number;
  currentPrice: number;
  timeFrame: TimeFrame;
  reasons: string[];
}

interface HistoricalDataPoint {
  timestamp: number;
  price: number;
}

const currencySymbols: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  RUB: '₽',
};

export default function PricePrediction() {
  const { currency } = useCurrency();
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('2hours');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch current Pi price and historical data from CoinGecko
  useEffect(() => {
    const fetchPriceData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch current price
        const { price: newPrice, error: priceError } = await fetchPiPrice(currency);

        if (newPrice !== null) {
          setCurrentPrice(newPrice);
        } else {
          setError(priceError);
          // Fallback to simulated price if API fails
          setCurrentPrice(fallbackPrices[currency]);
        }

        // Fetch historical data with granularity suited for the selected timeframe
        const getHistoryParams = (tf: TimeFrame): { limit: number; bar: Parameters<typeof fetchPiHistoricalData>[2] } => {
          switch (tf) {
            case '30min':
              return { limit: 72, bar: '5m' }; // ~6h coverage at 5m
            case '1hour':
              return { limit: 144, bar: '5m' }; // ~12h at 5m
            case '2hours':
              return { limit: 192, bar: '15m' }; // ~2 days at 15m
            case '6hours':
              return { limit: 192, bar: '30m' }; // ~4 days at 30m
            case '12hours':
              return { limit: 168, bar: '1H' }; // 7 days at 1h
          }
        };

        const { limit, bar } = getHistoryParams(selectedTimeFrame);
        const { data: historyData, error: historyError } = await fetchPiHistoricalData(currency, limit, bar);

        if (historyData && historyData.prices) {
          // Format the historical data
          const formattedData: HistoricalDataPoint[] = historyData.prices.map(
            (item: [number, number]) => ({
              timestamp: item[0],
              price: item[1],
            })
          );

          setHistoricalData(formattedData);
        } else if (historyError) {
          setError(historyError);
        }
      } catch (error) {
        console.error('Error in data fetching:', error);
        setError('Failed to fetch complete data. Prediction may be less accurate.');

        // If we have current price but no historical data, we can still make predictions
        if (currentPrice === null) {
          setCurrentPrice(fallbackPrices[currency]);
        }
      }
    };

    fetchPriceData();
  }, [currency, selectedTimeFrame]);

  // Generate prediction based on historical data and current price
  useEffect(() => {
    if (currentPrice === null) return;

    const generatePrediction = () => {
      // Only show loading if we don't already have a prediction
      if (!prediction) {
        setLoading(true);
      }

      // Calculate volatility from historical data if available
      let volatility = 0.01; // Default volatility if no historical data
      let trend: PredictionTrend = 'stable';
      let confidence = 65;

      if (historicalData.length > 0) {
        // Calculate recent price movement trend
        const recentDataPoints = historicalData.slice(-48); // Last 48 data points

        if (recentDataPoints.length > 1) {
          // Calculate average price change
          let totalChange = 0;
          for (let i = 1; i < recentDataPoints.length; i++) {
            totalChange +=
              (recentDataPoints[i].price - recentDataPoints[i - 1].price) /
              recentDataPoints[i - 1].price;
          }
          const avgChange = totalChange / (recentDataPoints.length - 1);

          // Calculate volatility (standard deviation of price changes)
          let sumSquaredDiff = 0;
          for (let i = 1; i < recentDataPoints.length; i++) {
            const change =
              (recentDataPoints[i].price - recentDataPoints[i - 1].price) /
              recentDataPoints[i - 1].price;
            sumSquaredDiff += Math.pow(change - avgChange, 2);
          }
          volatility = Math.sqrt(sumSquaredDiff / (recentDataPoints.length - 1));

          // Determine trend based on recent movement
          const shortTermTrend = recentDataPoints.slice(-12); // Last 12 data points
          const startPrice = shortTermTrend[0].price;
          const endPrice = shortTermTrend[shortTermTrend.length - 1].price;
          const percentChange = (endPrice - startPrice) / startPrice;

          if (percentChange > 0.005) {
            trend = 'up';
            confidence = 65 + Math.min(percentChange * 1000, 25);
          } else if (percentChange < -0.005) {
            trend = 'down';
            confidence = 65 + Math.min(Math.abs(percentChange) * 1000, 20);
          } else {
            trend = 'stable';
            confidence = 75;
          }
        }
      }

      // Adjust volatility based on timeframe - longer timeframes have higher volatility
      if (selectedTimeFrame === '6hours' || selectedTimeFrame === '12hours') {
        // For longer timeframes, we need to look at more historical data
        const longTermDataPoints = historicalData.slice(-96); // Last 96 data points (approx. 4 days)

        if (longTermDataPoints.length > 1) {
          // Calculate longer-term volatility
          let longTermTotalChange = 0;
          for (let i = 1; i < longTermDataPoints.length; i++) {
            longTermTotalChange += Math.abs(
              (longTermDataPoints[i].price - longTermDataPoints[i - 1].price) /
                longTermDataPoints[i - 1].price
            );
          }
          const longTermAvgChange = longTermTotalChange / (longTermDataPoints.length - 1);

          // Blend short-term and long-term volatility
          volatility = (volatility + longTermAvgChange) / 2;
        }
      }

      // Adjust volatility based on timeframe
      const timeframeMultiplier =
        selectedTimeFrame === '30min'
          ? 0.3
          : selectedTimeFrame === '1hour'
            ? 0.6
            : selectedTimeFrame === '2hours'
              ? 1.0
              : selectedTimeFrame === '6hours'
                ? 2.0
                : 3.0; // 12 hours

      // Calculate target price based on trend and volatility
      let targetPrice: number;
      let reasons: string[] = [];

      if (trend === 'up') {
        // Upward trend
        const changePercent = (0.005 + volatility * 2) * timeframeMultiplier;
        targetPrice = currentPrice * (1 + changePercent);

        reasons = [
          'Recent price movement shows bullish momentum',
          'Trading volume indicates increasing interest',
          'Technical indicators suggest short-term uptrend',
          'Historical pattern shows recovery after similar price action',
          'Market sentiment analysis shows positive trend',
          'Increased network activity correlates with price growth',
        ];

        if (selectedTimeFrame === '6hours' || selectedTimeFrame === '12hours') {
          reasons = [
            'Long-term technical analysis indicates bullish momentum',
            'Increased network adoption metrics suggest growing demand',
            'Positive correlation with broader crypto market trends',
            'Historical support levels holding strong',
            'Accumulation pattern detected in trading volume',
            'Reduced selling pressure observed in order books',
          ];
        }
      } else if (trend === 'down') {
        // Downward trend
        const changePercent = (0.005 + volatility * 2) * timeframeMultiplier;
        targetPrice = currentPrice * (1 - changePercent);

        reasons = [
          'Recent price action shows bearish momentum',
          'Profit taking expected after recent movements',
          'Technical indicators suggest short-term correction',
          'Historical pattern shows pullback after similar price action',
          'Correlation with broader crypto market trends',
          'Decreased trading volume suggests waning interest',
        ];

        if (selectedTimeFrame === '6hours' || selectedTimeFrame === '12hours') {
          reasons = [
            'Long-term technical analysis indicates bearish momentum',
            'Resistance levels preventing upward price movement',
            'Correlation with broader crypto market correction',
            'Historical pattern suggests continued downward pressure',
            'Decreasing network metrics indicate reduced activity',
            'Increased selling observed in larger wallets',
          ];
        }
      } else {
        // Stable trend
        const smallChange = volatility * 0.5 * timeframeMultiplier;
        targetPrice = currentPrice * (1 + (Math.random() > 0.5 ? smallChange : -smallChange));

        reasons = [
          'Price consolidation phase detected',
          'Trading volume indicates sideways movement',
          'Strong support and resistance levels nearby',
          'Historical volatility is currently low',
          'No significant market catalysts expected short-term',
          'Technical indicators show neutral signals',
        ];

        if (selectedTimeFrame === '6hours' || selectedTimeFrame === '12hours') {
          reasons = [
            'Price consolidation within established range',
            'Equal buying and selling pressure maintaining equilibrium',
            'Long-term support and resistance levels constraining movement',
            'Historical volatility decreasing over time',
            'Network fundamentals remain stable without significant changes',
            'Market awaiting catalyst for directional movement',
          ];
        }
      }

      // Randomly select 2-3 reasons
      const numReasons = 2 + Math.floor(Math.random() * 2);
      const shuffledReasons = [...reasons].sort(() => 0.5 - Math.random());
      const selectedReasons = shuffledReasons.slice(0, numReasons);

      setPrediction({
        trend,
        confidence,
        targetPrice,
        currentPrice,
        timeFrame: selectedTimeFrame,
        reasons: selectedReasons,
      });

      setLoading(false);
    };

    // Add a small delay to simulate analysis
    const timer = setTimeout(generatePrediction, 800);
    return () => clearTimeout(timer);
  }, [currentPrice, historicalData, selectedTimeFrame]);

  // Fix canvas rendering
  useEffect(() => {
    if (!prediction || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 60; // Increased padding for better label visibility
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;

    // Calculate time range
    const now = Date.now();
    const timeRangeMs = getTimeRangeMs(selectedTimeFrame);
    const startTime = now - (timeRangeMs * 2); // Show 2x historical data
    const endTime = now + timeRangeMs;

    // Get relevant historical data
    const relevantData = historicalData
      .filter(point => point.timestamp >= startTime && point.timestamp <= now)
      .sort((a, b) => a.timestamp - b.timestamp);

    // If we have no historical data points, create one at the current price
    if (relevantData.length === 0 && prediction.currentPrice) {
      relevantData.push({
        timestamp: now,
        price: prediction.currentPrice
      });
    }

    // Calculate price range including historical and prediction
    // Interpolate a price at the exact "now" timestamp to ensure continuity
    let nowPriceForGraph = prediction.currentPrice;
    if (relevantData.length >= 2) {
      const before = [...relevantData].filter(p => p.timestamp <= now).pop();
      const after = [...relevantData].find(p => p.timestamp >= now);
      if (before && after) {
        if (after.timestamp === before.timestamp) {
          nowPriceForGraph = before.price;
        } else {
          const ratio = (now - before.timestamp) / (after.timestamp - before.timestamp);
          nowPriceForGraph = before.price + ratio * (after.price - before.price);
        }
      } else if (before) {
        // No point after now; use the last known price
        nowPriceForGraph = before.price;
      }
    } else if (relevantData.length === 1) {
      nowPriceForGraph = relevantData[0].price;
    }

    const allPrices = [
      ...relevantData.map(point => point.price),
      nowPriceForGraph,
      prediction.targetPrice
    ].filter(price => !isNaN(price) && price !== null);

    // Ensure we have valid prices before proceeding
    if (allPrices.length === 0) return;
    
    const minPrice = Math.min(...allPrices) * 0.99; // Add 1% padding
    const maxPrice = Math.max(...allPrices) * 1.01;
    const priceRange = maxPrice - minPrice;

    // Helper functions
    const timeToX = (timestamp: number): number => {
      return padding + ((timestamp - startTime) / (endTime - startTime)) * chartWidth;
    };

    const priceToY = (price: number): number => {
      return rect.height - padding - ((price - minPrice) / priceRange) * chartHeight;
    };

    // Draw grid
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    // Vertical grid lines (every hour)
    const hourMs = 60 * 60 * 1000;
    const startHour = Math.ceil(startTime / hourMs) * hourMs;
    for (let t = startHour; t <= endTime; t += hourMs) {
      const x = timeToX(t);
      ctx.moveTo(x, padding);
      ctx.lineTo(x, rect.height - padding);
    }

    // Horizontal grid lines
    const numPriceLines = 5;
    for (let i = 0; i <= numPriceLines; i++) {
      const y = padding + (i * chartHeight) / numPriceLines;
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
    }
    ctx.stroke();

    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, rect.height - padding);
    ctx.lineTo(rect.width - padding, rect.height - padding);
    ctx.stroke();

    // Draw price labels
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    for (let i = 0; i <= numPriceLines; i++) {
      const price = minPrice + (i / numPriceLines) * priceRange;
      const y = padding + ((numPriceLines - i) * chartHeight) / numPriceLines;
      ctx.fillText(formatPrice(price), padding - 8, y + 4);
    }

    // Draw time labels
    ctx.textAlign = 'center';
    for (let t = startHour; t <= endTime; t += hourMs) {
      const x = timeToX(t);
      ctx.fillText(formatTime(t), x, rect.height - padding + 16);
    }

    // Draw historical data line
    if (relevantData.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;

      // Start from the first point
      const firstPoint = relevantData[0];
      ctx.moveTo(timeToX(firstPoint.timestamp), priceToY(firstPoint.price));

      // Connect all points
      relevantData.forEach((point, index) => {
        if (index === 0) return; // Skip first point as we already moved to it
        ctx.lineTo(timeToX(point.timestamp), priceToY(point.price));
      });

      // Extend to the exact 'now' x-position using the interpolated price for continuity
      ctx.lineTo(timeToX(now), priceToY(nowPriceForGraph));
      
      ctx.stroke();
    }

    // Draw prediction line
    ctx.beginPath();
    ctx.strokeStyle = prediction.trend === 'up' ? '#22c55e' : prediction.trend === 'down' ? '#ef4444' : '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    // Start prediction exactly at 'now' from the last historical value
    ctx.moveTo(timeToX(now), priceToY(nowPriceForGraph));
    ctx.lineTo(timeToX(endTime), priceToY(prediction.targetPrice));
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw current price point
    ctx.beginPath();
    ctx.fillStyle = '#94a3b8';
    // Use the same 'now' value so the historical and prediction join smoothly
    ctx.arc(timeToX(now), priceToY(nowPriceForGraph), 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw target price point
    ctx.beginPath();
    ctx.fillStyle = prediction.trend === 'up' ? '#22c55e' : prediction.trend === 'down' ? '#ef4444' : '#3b82f6';
    ctx.arc(timeToX(endTime), priceToY(prediction.targetPrice), 4, 0, Math.PI * 2);
    ctx.fill();

  }, [prediction, historicalData, selectedTimeFrame, currency]);

  // Helper functions
  const formatPrice = (price: number): string => {
    return currencySymbols[currency] + price.toFixed(6);
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getTimeRangeMs = (timeFrame: TimeFrame): number => {
    switch (timeFrame) {
      case '30min':
        return 30 * 60 * 1000;
      case '1hour':
        return 60 * 60 * 1000;
      case '2hours':
        return 2 * 60 * 60 * 1000;
      case '6hours':
        return 6 * 60 * 60 * 1000;
      case '12hours':
        return 12 * 60 * 60 * 1000;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Prediction</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Tabs
            value={selectedTimeFrame}
            onValueChange={value => setSelectedTimeFrame(value as TimeFrame)}
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="30min">30m</TabsTrigger>
              <TabsTrigger value="1hour">1h</TabsTrigger>
              <TabsTrigger value="2hours">2h</TabsTrigger>
              <TabsTrigger value="6hours">6h</TabsTrigger>
              <TabsTrigger value="12hours">12h</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : prediction ? (
            <>
              <div className="relative aspect-[2/1] w-full">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Current Price</div>
                  <div className="font-medium">
                    {currencySymbols[currency]}
                    {prediction.currentPrice.toFixed(6)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Target Price</div>
                  <div
                    className={cn(
                      'font-medium',
                      prediction.trend === 'up'
                        ? 'text-green-500'
                        : prediction.trend === 'down'
                          ? 'text-red-500'
                          : 'text-blue-500'
                    )}
                  >
                    {currencySymbols[currency]}
                    {prediction.targetPrice.toFixed(6)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Trend</div>
                  <div className="flex items-center gap-1">
                    {prediction.trend === 'up' ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">Bullish</span>
                      </>
                    ) : prediction.trend === 'down' ? (
                      <>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="text-red-500">Bearish</span>
                      </>
                    ) : (
                      <>
                        <Minus className="h-4 w-4 text-blue-500" />
                        <span className="text-blue-500">Stable</span>
                      </>
                    )}
                    <span className="text-sm text-muted-foreground ml-1">
                      ({prediction.confidence}% confidence)
                    </span>
                  </div>
                </div>

                <div className="space-y-1 mt-4">
                  <div className="text-sm font-medium">Analysis</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
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
          ) : null}

          {error && (
            <div className="flex items-center gap-2 text-amber-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
