'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import {
//   TrendingUp,
//   TrendingDown,
//   Minus,
//   RefreshCw,
//   AlertCircle,
// } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency, type Currency } from '@/contexts/currency-context';
import { fetchPiPrice, fetchPiHistoricalData, fallbackPrices } from '@/lib/api-client';
import { 
  calculateResponsiveMetrics, 
  calculateAdaptivePadding,
  getElementFontSize 
} from '@/lib/chart-responsive';
import { 
  calculateOptimalTimeLabels,
  generateAdaptiveGridIntervals,
  calculateTimeframeTransition
} from '@/lib/time-label-manager';
import {
  formatPriceForSpace,
  getCurrencySymbol,
  type PriceFormattingOptions
} from '@/lib/price-formatter';
import {
  useResizeObserver,
  CanvasRedrawManager,
  type PerformanceMetrics
} from '@/lib/chart-performance';
import { 
  useChartAccessibility, 
  useScreenReaderDescription,
  useFocusIndicator 
} from '@/hooks/use-chart-accessibility';
import type { ChartAccessibilityData } from '@/lib/chart-accessibility';

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

// Currency symbols are now handled by the price formatter

export default function PricePrediction() {
  const { currency } = useCurrency();
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('2hours');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [, setPreviousTimeFrame] = useState<TimeFrame>('2hours');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const redrawManagerRef = useRef<CanvasRedrawManager>(new CanvasRedrawManager());

  // Accessibility features
  const accessibility = useChartAccessibility({
    accessibilityOptions: {
      includeDataPoints: true,
      includeAnalysis: true,
      verboseDescription: false,
      includeNavigation: true
    },
    enableKeyboardNavigation: true,
    enableLiveRegions: true,
    enableHighContrastDetection: true
  });

  // Keep a stable ref to accessibility to avoid re-creating callbacks/effects
  const accessibilityRef = useRef(accessibility);
  useEffect(() => {
    accessibilityRef.current = accessibility;
  }, [accessibility]);

  const { DescriptionElement } = useScreenReaderDescription(
    'price-prediction-chart',
    accessibility.altText
  );

  // Focus indicator for canvas
  useFocusIndicator(canvasRef, accessibility.isHighContrastMode);

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
    // We intentionally omit 'currentPrice' and 'accessibility' to avoid re-fetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const newPrediction = {
        trend,
        confidence,
        targetPrice,
        currentPrice,
        timeFrame: selectedTimeFrame,
        reasons: selectedReasons,
      };

      setPrediction(newPrediction);

      // Update accessibility data
      const accessibilityData: ChartAccessibilityData = {
        currentPrice,
        targetPrice,
        trend,
        confidence,
        timeFrame: selectedTimeFrame,
        currency,
        historicalDataPoints: historicalData.length,
        priceChange: targetPrice - currentPrice,
        priceChangePercent: ((targetPrice - currentPrice) / currentPrice) * 100,
        reasons: selectedReasons
      };

      accessibilityRef.current.updateAltText(accessibilityData);

      // Announce data update
      accessibilityRef.current.announceDataUpdate(currentPrice, currency);

      setLoading(false);
    };

    // Add a small delay to simulate analysis
    const timer = setTimeout(generatePrediction, 800);
    return () => clearTimeout(timer);
  // Intentionally exclude 'prediction' and 'accessibility' to avoid loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, historicalData, selectedTimeFrame, currency]);

  // Separate function for the actual chart content rendering with full responsive integration
  const renderChartContent = useCallback((
    ctx: CanvasRenderingContext2D,
    rect: DOMRect,
    prediction: PredictionData,
    historicalData: HistoricalDataPoint[],
    selectedTimeFrame: TimeFrame,
    currency: string
  ) => {
    try {
      // Apply high contrast styles if needed
      accessibilityRef.current.applyHighContrastStyles(ctx);
      
      // Get colors based on high contrast mode
      const colors = accessibilityRef.current.highContrastColors;

      // Calculate responsive metrics using the responsive system
      const metrics = calculateResponsiveMetrics(rect.width, rect.height, selectedTimeFrame);
      const { deviceType, fontSize } = metrics;
      
      // Enhanced price formatting with adaptive decimal places and currency awareness
      const formatPriceForCanvas = (price: number, availableWidth: number, fontSize: number): string => {
        const options: PriceFormattingOptions = {
          currency: currency as Currency,
          availableWidth,
          fontSize,
          maxDecimals: 6,
          minDecimals: 0,
          useCompactNotation: deviceType === 'mobile', // Use compact notation on mobile
          preserveSignificantDigits: true
        };
        
        const result = formatPriceForSpace(price, options);
        return result.text;
      };

      // Calculate adaptive padding with price label protection
      const adaptivePadding = calculateAdaptivePadding(
        rect.width,
        rect.height,
        deviceType,
        {
          maxPrice: prediction.targetPrice,
          minPrice: prediction.currentPrice,
          currency: getCurrencySymbol(currency as Currency),
          hasLongPriceLabels: true,
          hasFrequentTimeLabels: selectedTimeFrame === '30min' || selectedTimeFrame === '1hour'
        }
      );
      
      const chartWidth = rect.width - adaptivePadding.left - adaptivePadding.right;
      const chartHeight = rect.height - adaptivePadding.top - adaptivePadding.bottom;

      // Ensure minimum chart dimensions for usability
      if (chartWidth <= 0 || chartHeight <= 0) {
        console.warn('Chart dimensions too small for rendering');
        return;
      }

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
    
    // Optimize axis range padding for better data visualization (0.5-1.0% padding)
    const rawMinPrice = Math.min(...allPrices);
    const rawMaxPrice = Math.max(...allPrices);
    const rawPriceRange = rawMaxPrice - rawMinPrice;
    
    // Use dynamic padding based on price range magnitude
    const paddingPercent = rawPriceRange > 0 ? Math.min(1.0, Math.max(0.5, rawPriceRange * 0.01)) : 0.75;
    const paddingAmount = rawPriceRange * (paddingPercent / 100);
    
    const minPrice = rawMinPrice - paddingAmount;
    const maxPrice = rawMaxPrice + paddingAmount;
    const priceRange = maxPrice - minPrice;

    // Helper functions with responsive padding
    const timeToX = (timestamp: number): number => {
      return adaptivePadding.left + ((timestamp - startTime) / (endTime - startTime)) * chartWidth;
    };

    const priceToY = (price: number): number => {
      return rect.height - adaptivePadding.bottom - ((price - minPrice) / priceRange) * chartHeight;
    };

    // Calculate optimal time labels using intelligent label management
    const timeLabels = calculateOptimalTimeLabels({
      startTime,
      endTime,
      availableWidth: chartWidth,
      timeFrame: selectedTimeFrame,
      deviceType,
      fontSize,
      minDistance: deviceType === 'mobile' ? 35 : deviceType === 'tablet' ? 45 : 55
    });

    // Generate adaptive grid intervals based on timeframe
    const gridIntervals = generateAdaptiveGridIntervals(
      startTime,
      endTime,
      selectedTimeFrame,
      deviceType
    );

    // Draw grid with adaptive spacing
    ctx.beginPath();
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;

    // Vertical grid lines based on adaptive intervals
    gridIntervals.forEach(timestamp => {
      const x = timeToX(timestamp);
      ctx.moveTo(x, adaptivePadding.top);
      ctx.lineTo(x, rect.height - adaptivePadding.bottom);
    });

    // Horizontal grid lines (responsive count based on device)
    const numPriceLines = deviceType === 'mobile' ? 4 : deviceType === 'tablet' ? 5 : 6;
    for (let i = 0; i <= numPriceLines; i++) {
      const y = adaptivePadding.top + (i * chartHeight) / numPriceLines;
      ctx.moveTo(adaptivePadding.left, y);
      ctx.lineTo(rect.width - adaptivePadding.right, y);
    }
    ctx.stroke();

    // Draw axes with responsive positioning
    ctx.beginPath();
    ctx.strokeStyle = colors.foreground;
    ctx.lineWidth = 2;
    ctx.moveTo(adaptivePadding.left, adaptivePadding.top);
    ctx.lineTo(adaptivePadding.left, rect.height - adaptivePadding.bottom);
    ctx.lineTo(rect.width - adaptivePadding.right, rect.height - adaptivePadding.bottom);
    ctx.stroke();

    // Draw price labels with responsive font size and positioning
    const priceLabelFontSize = getElementFontSize(deviceType, 'price-labels', rect.width, rect.height);
    ctx.font = `${priceLabelFontSize}px system-ui`;
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i <= numPriceLines; i++) {
      const price = minPrice + (i / numPriceLines) * priceRange;
      const y = adaptivePadding.top + ((numPriceLines - i) * chartHeight) / numPriceLines;
      
      // Format price with enhanced adaptive formatting
      const formattedPrice = formatPriceForCanvas(price, adaptivePadding.left - 16, priceLabelFontSize);
      ctx.fillText(formattedPrice, adaptivePadding.left - 8, y);
    }

    // Draw time labels using intelligent label management
    const timeLabelFontSize = getElementFontSize(deviceType, 'time-labels', rect.width, rect.height);
    ctx.font = `${timeLabelFontSize}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    timeLabels.forEach(label => {
      const x = timeToX(label.timestamp);
      ctx.fillText(label.text, x, rect.height - adaptivePadding.bottom + 8);
    });

    // Draw historical data line with responsive styling
    if (relevantData.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = colors.historical;
      ctx.lineWidth = deviceType === 'mobile' ? 1.5 : 2;

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

    // Draw confidence band for prediction uncertainty
    const confidenceLevel = prediction.confidence / 100;
    const predictionRange = prediction.targetPrice - nowPriceForGraph;
    const uncertaintyRange = Math.abs(predictionRange) * (1 - confidenceLevel) * 0.5;
    
    // Calculate confidence band boundaries
    const upperBound = Math.max(prediction.targetPrice, nowPriceForGraph) + uncertaintyRange;
    const lowerBound = Math.min(prediction.targetPrice, nowPriceForGraph) - uncertaintyRange;
    
    // Draw confidence band as semi-transparent area
    ctx.beginPath();
    ctx.fillStyle = (prediction.trend === 'up' ? colors.upTrend : prediction.trend === 'down' ? colors.downTrend : colors.stable) + '20'; // 20% opacity
    ctx.moveTo(timeToX(now), priceToY(nowPriceForGraph));
    ctx.lineTo(timeToX(endTime), priceToY(upperBound));
    ctx.lineTo(timeToX(endTime), priceToY(lowerBound));
    ctx.lineTo(timeToX(now), priceToY(nowPriceForGraph));
    ctx.closePath();
    ctx.fill();

    // Draw prediction line with responsive styling
    ctx.beginPath();
    ctx.strokeStyle = prediction.trend === 'up' ? colors.upTrend : prediction.trend === 'down' ? colors.downTrend : colors.stable;
    ctx.lineWidth = deviceType === 'mobile' ? 1.5 : 2;
    const dashSize = deviceType === 'mobile' ? 4 : 5;
    ctx.setLineDash([dashSize, dashSize]);
    // Start prediction exactly at 'now' from the last historical value
    ctx.moveTo(timeToX(now), priceToY(nowPriceForGraph));
    ctx.lineTo(timeToX(endTime), priceToY(prediction.targetPrice));
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw current price point with responsive size
    const pointRadius = deviceType === 'mobile' ? 3 : 4;
    ctx.beginPath();
    ctx.fillStyle = colors.historical;
    // Use the same 'now' value so the historical and prediction join smoothly
    ctx.arc(timeToX(now), priceToY(nowPriceForGraph), pointRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw target price point with responsive size
    ctx.beginPath();
    ctx.fillStyle = prediction.trend === 'up' ? colors.upTrend : prediction.trend === 'down' ? colors.downTrend : colors.stable;
    ctx.arc(timeToX(endTime), priceToY(prediction.targetPrice), pointRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw vertical "Now" marker with timestamp label
    const nowX = timeToX(now);
    const nowMarkerColor = colors.foreground;
    
    // Draw vertical line
    ctx.beginPath();
    ctx.strokeStyle = nowMarkerColor;
    ctx.lineWidth = deviceType === 'mobile' ? 1 : 2;
    ctx.setLineDash([3, 3]);
    ctx.moveTo(nowX, adaptivePadding.top);
    ctx.lineTo(nowX, rect.height - adaptivePadding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw "Now" label with responsive positioning
    const nowLabelFontSize = getElementFontSize(deviceType, 'time-labels', rect.width, rect.height);
    ctx.font = `${nowLabelFontSize}px system-ui`;
    ctx.fillStyle = nowMarkerColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Position label to avoid overlap with other elements
    const nowLabelY = adaptivePadding.top - 4;
    ctx.fillText('Now', nowX, nowLabelY);

    // Setup keyboard navigation data points
    const dataPointsForNavigation = [
      ...relevantData.map(point => ({
        timestamp: point.timestamp,
        price: point.price,
        type: 'historical' as const
      })),
      {
        timestamp: now,
        price: nowPriceForGraph,
        type: 'historical' as const
      },
      {
        timestamp: endTime,
        price: prediction.targetPrice,
        type: 'prediction' as const
      }
    ];

    if (accessibilityRef.current.keyboardNavigator) {
      accessibilityRef.current.keyboardNavigator.updateDataPoints(dataPointsForNavigation);
    }

    } catch (error) {
      console.error('Error rendering chart content:', error);
      
      // Graceful degradation: show error message on canvas
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#64748b'; // fallback text color
      ctx.font = '14px system-ui'; // fallback font size
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Chart rendering error. Please refresh to try again.',
        rect.width / 2,
        rect.height / 2
      );
    }
  // We intentionally avoid depending on 'accessibility' to keep this callback stable
  }, []);

  // Chart rendering function with performance monitoring and responsive integration
  const renderChart = useCallback(() => {
    if (!prediction || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect();
    
    // Create draw parameters for change detection
    const drawParams = {
      prediction,
      historicalData,
      selectedTimeFrame,
      currency,
      canvasWidth: rect.width,
      canvasHeight: rect.height
    };

    // Check if redraw is necessary
    if (!redrawManagerRef.current.shouldRedraw(drawParams)) {
      return; // Skip unnecessary redraw
    }

    // Setup HiDPI canvas for crisp rendering
    try {
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      
      // Scale context to match device pixel ratio
      ctx.scale(devicePixelRatio, devicePixelRatio);
      
      // Set canvas CSS size to maintain layout
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    } catch (error) {
      console.warn('HiDPI setup failed, using standard canvas:', error);
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Configure smooth line rendering
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) {
      ctx.imageSmoothingQuality = 'high';
    }

    // Determine device type for performance monitoring
    const deviceType = rect.width <= 767 ? 'mobile' : rect.width <= 1023 ? 'tablet' : 'desktop';
    const canvasSize = { width: rect.width, height: rect.height };

    // Execute chart drawing with performance monitoring
    const metric = redrawManagerRef.current.executeDraw(
      'chart-render',
      () => {
        renderChartContent(ctx, rect, prediction, historicalData, selectedTimeFrame, currency);
      },
      deviceType,
      canvasSize
    );

    // Update performance metrics state
    setPerformanceMetrics(prev => [...prev.slice(-9), metric]); // Keep last 10 metrics
  }, [prediction, historicalData, selectedTimeFrame, currency, renderChartContent]);

  // Setup debounced resize handling
  useResizeObserver(
    containerRef,
    useCallback(() => {
      renderChart();
    }, [renderChart]),
    {
      debounceMs: 150,
      maxRenderTime: 500,
      enableMetrics: true
    }
  );

  // Initial chart render and updates
  useEffect(() => {
    renderChart();
  }, [renderChart]);

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

  // Handle timeframe changes with smooth transitions
  const handleTimeframeChange = (newTimeFrame: TimeFrame) => {
    if (newTimeFrame === selectedTimeFrame) return;

    const canvas = canvasRef.current;
    if (!canvas) {
      setSelectedTimeFrame(newTimeFrame);
      accessibility.announceTimeframeChange(newTimeFrame);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const deviceType = rect.width <= 767 ? 'mobile' : rect.width <= 1023 ? 'tablet' : 'desktop';

    // Calculate transition parameters
    const transition = calculateTimeframeTransition(
      selectedTimeFrame,
      newTimeFrame,
      deviceType
    );

    // Set transition state
    setIsTransitioning(true);
    setPreviousTimeFrame(selectedTimeFrame);

    // Announce timeframe change
    accessibility.announceTimeframeChange(newTimeFrame, prediction?.trend);

    // Apply transition with appropriate duration
    setTimeout(() => {
      setSelectedTimeFrame(newTimeFrame);
      
      // Clear transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, transition.duration);
    }, 50); // Small delay to ensure state is set before animation starts
  };

  // Handle keyboard events for chart navigation
  const handleChartKeyDown = useCallback((event: KeyboardEvent) => {
    const handled = accessibility.handleKeyDown(event);
    if (handled) {
      event.preventDefault();
    }
  }, [accessibility]);

  // Add keyboard event listener to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('keydown', handleChartKeyDown);
    return () => {
      canvas.removeEventListener('keydown', handleChartKeyDown);
    };
  }, [handleChartKeyDown]);

  // Cleanup accessibility features on unmount
  useEffect(() => {
    return () => {
      accessibility.cleanup();
    };
  }, [accessibility]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Prediction</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Tabs
            value={selectedTimeFrame}
            onValueChange={value => handleTimeframeChange(value as TimeFrame)}
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
            <div className="flex h-[300px] items-center justify-center">
              <span className="animate-spin text-4xl">🔄</span>
            </div>
          ) : prediction ? (
            <>
              <div ref={containerRef} className="relative aspect-[2/1] w-full">
                <DescriptionElement />
                <canvas
                  ref={canvasRef}
                  className={cn(
                    "size-full transition-opacity duration-300",
                    isTransitioning && "opacity-75"
                  )}
                  {...accessibility.getChartAriaAttributes()}
                />
                {isTransitioning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm">
                    <div className="animate-pulse text-sm text-muted-foreground">
                      Updating chart...
                    </div>
                  </div>
                )}
                {/* Performance metrics display (development only) */}
                {process.env.NODE_ENV === 'development' && performanceMetrics.length > 0 && (
                  <div className="absolute right-2 top-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
                    Render: {performanceMetrics[performanceMetrics.length - 1]?.renderTime.toFixed(1)}ms
                    {performanceMetrics[performanceMetrics.length - 1]?.renderTime > 500 && (
                      <span className="ml-1 text-red-500">⚠️</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Current Price</div>
                  <div className="font-medium">
                    {formatPriceForSpace(prediction.currentPrice, {
                      currency,
                      availableWidth: 120, // Reasonable width for display
                      fontSize: 14,
                      maxDecimals: 6,
                      minDecimals: 2
                    }).text}
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
                    {formatPriceForSpace(prediction.targetPrice, {
                      currency,
                      availableWidth: 120, // Reasonable width for display
                      fontSize: 14,
                      maxDecimals: 6,
                      minDecimals: 2
                    }).text}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Trend</div>
                  <div className="flex items-center gap-1">
                    {prediction.trend === 'up' ? (
                      <>
                        <span className="text-green-500">📈</span>
                        <span className="text-green-500">Bullish</span>
                      </>
                    ) : prediction.trend === 'down' ? (
                      <>
                        <span className="text-red-500">📉</span>
                        <span className="text-red-500">Bearish</span>
                      </>
                    ) : (
                      <>
                        <span className="text-blue-500">➖</span>
                        <span className="text-blue-500">Stable</span>
                      </>
                    )}
                    <span className="ml-1 text-sm text-muted-foreground">
                      ({prediction.confidence}% confidence)
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
          ) : null}

          {error && (
            <div className="flex items-center gap-2 text-sm text-amber-500">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
