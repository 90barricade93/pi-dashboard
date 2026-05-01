import { NextResponse } from 'next/server';
import {
  metrics,
  CTR_TWITTER_RATE_LIMIT_HITS,
  CTR_TWITTER_API_ERRORS,
  isRateLimitAlerting,
} from '@/lib/metrics';
import { logger } from '@/lib/logger';

export async function GET() {
  const snapshot = metrics.snapshot();
  const alerting = isRateLimitAlerting();

  logger.info('metrics_snapshot', {
    counters: snapshot,
    alerting,
  });

  return NextResponse.json({
    counters: snapshot,
    alerting,
    known: {
      CTR_TWITTER_RATE_LIMIT_HITS,
      CTR_TWITTER_API_ERRORS,
    },
  });
}
