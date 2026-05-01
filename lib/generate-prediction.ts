export type PredictionTrend = 'up' | 'down' | 'stable';
export type TimeFrame = '30min' | '1hour' | '2hours' | '6hours' | '12hours';

export interface HistoricalDataPoint {
  timestamp: number;
  price: number;
}

export interface PredictionData {
  trend: PredictionTrend;
  confidence: number;
  targetPrice: number;
  currentPrice: number;
  timeFrame: TimeFrame;
  reasons: string[];
}

const SHORT_TERM_REASONS: Record<PredictionTrend, string[]> = {
  up: [
    'Recent price movement shows bullish momentum',
    'Trading volume indicates increasing interest',
    'Technical indicators suggest short-term uptrend',
    'Historical pattern shows recovery after similar price action',
    'Market sentiment analysis shows positive trend',
    'Increased network activity correlates with price growth',
  ],
  down: [
    'Recent price action shows bearish momentum',
    'Profit taking expected after recent movements',
    'Technical indicators suggest short-term correction',
    'Historical pattern shows pullback after similar price action',
    'Correlation with broader crypto market trends',
    'Decreased trading volume suggests waning interest',
  ],
  stable: [
    'Price consolidation phase detected',
    'Trading volume indicates sideways movement',
    'Strong support and resistance levels nearby',
    'Historical volatility is currently low',
    'No significant market catalysts expected short-term',
    'Technical indicators show neutral signals',
  ],
};

const LONG_TERM_REASONS: Record<PredictionTrend, string[]> = {
  up: [
    'Long-term technical analysis indicates bullish momentum',
    'Increased network adoption metrics suggest growing demand',
    'Positive correlation with broader crypto market trends',
    'Historical support levels holding strong',
    'Accumulation pattern detected in trading volume',
    'Reduced selling pressure observed in order books',
  ],
  down: [
    'Long-term technical analysis indicates bearish momentum',
    'Resistance levels preventing upward price movement',
    'Correlation with broader crypto market correction',
    'Historical pattern suggests continued downward pressure',
    'Decreasing network metrics indicate reduced activity',
    'Increased selling observed in larger wallets',
  ],
  stable: [
    'Price consolidation within established range',
    'Equal buying and selling pressure maintaining equilibrium',
    'Long-term support and resistance levels constraining movement',
    'Historical volatility decreasing over time',
    'Network fundamentals remain stable without significant changes',
    'Market awaiting catalyst for directional movement',
  ],
};

const TIMEFRAME_MULTIPLIER: Record<TimeFrame, number> = {
  '30min': 0.3,
  '1hour': 0.6,
  '2hours': 1.0,
  '6hours': 2.0,
  '12hours': 3.0,
};

function calculateVolatilityAndTrend(historicalData: HistoricalDataPoint[]): {
  volatility: number;
  trend: PredictionTrend;
  confidence: number;
} {
  let volatility = 0.01;
  let trend: PredictionTrend = 'stable';
  let confidence = 65;

  if (historicalData.length <= 1) return { volatility, trend, confidence };

  const recentDataPoints = historicalData.slice(-48);
  if (recentDataPoints.length <= 1) return { volatility, trend, confidence };

  let totalChange = 0;
  for (let i = 1; i < recentDataPoints.length; i++) {
    totalChange +=
      (recentDataPoints[i].price - recentDataPoints[i - 1].price) / recentDataPoints[i - 1].price;
  }
  const avgChange = totalChange / (recentDataPoints.length - 1);

  let sumSquaredDiff = 0;
  for (let i = 1; i < recentDataPoints.length; i++) {
    const change =
      (recentDataPoints[i].price - recentDataPoints[i - 1].price) / recentDataPoints[i - 1].price;
    sumSquaredDiff += (change - avgChange) ** 2;
  }
  volatility = Math.sqrt(sumSquaredDiff / (recentDataPoints.length - 1));

  const shortTerm = recentDataPoints.slice(-12);
  const startPrice = shortTerm[0].price;
  const endPrice = shortTerm[shortTerm.length - 1].price;
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

  return { volatility, trend, confidence };
}

function blendLongTermVolatility(
  shortTermVolatility: number,
  historicalData: HistoricalDataPoint[]
): number {
  const longTerm = historicalData.slice(-96);
  if (longTerm.length <= 1) return shortTermVolatility;

  let total = 0;
  for (let i = 1; i < longTerm.length; i++) {
    total += Math.abs((longTerm[i].price - longTerm[i - 1].price) / longTerm[i - 1].price);
  }
  const avg = total / (longTerm.length - 1);
  return (shortTermVolatility + avg) / 2;
}

function pickReasons(trend: PredictionTrend, timeFrame: TimeFrame): string[] {
  const isLongTerm = timeFrame === '6hours' || timeFrame === '12hours';
  const pool = (isLongTerm ? LONG_TERM_REASONS : SHORT_TERM_REASONS)[trend];
  const numReasons = 2 + Math.floor(Math.random() * 2);
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numReasons);
}

export function generatePrediction(
  currentPrice: number,
  historicalData: HistoricalDataPoint[],
  timeFrame: TimeFrame
): PredictionData {
  let { volatility, trend, confidence } = calculateVolatilityAndTrend(historicalData);

  if (timeFrame === '6hours' || timeFrame === '12hours') {
    volatility = blendLongTermVolatility(volatility, historicalData);
  }

  const multiplier = TIMEFRAME_MULTIPLIER[timeFrame];
  let targetPrice: number;

  if (trend === 'up') {
    const changePercent = (0.005 + volatility * 2) * multiplier;
    targetPrice = currentPrice * (1 + changePercent);
  } else if (trend === 'down') {
    const changePercent = (0.005 + volatility * 2) * multiplier;
    targetPrice = currentPrice * (1 - changePercent);
  } else {
    const smallChange = volatility * 0.5 * multiplier;
    targetPrice = currentPrice * (1 + (Math.random() > 0.5 ? smallChange : -smallChange));
  }

  return {
    trend,
    confidence,
    targetPrice,
    currentPrice,
    timeFrame,
    reasons: pickReasons(trend, timeFrame),
  };
}
