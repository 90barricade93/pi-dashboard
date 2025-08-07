type Labels = Record<string, string>;

class Counter {
  readonly name: string;
  readonly help?: string;
  private value = 0;
  private series: Map<string, number> = new Map();
  private timestamps: number[] = [];

  constructor(name: string, help?: string) {
    this.name = name;
    if (help !== undefined) {
      this.help = help;
    }
  }

  inc(by = 1, labels?: Labels) {
    const key = labels ? JSON.stringify(labels) : '';
    const prev = this.series.get(key) ?? 0;
    this.series.set(key, prev + by);
    this.value += by;
    // keep a timeline of increment timestamps for sliding-window checks
    const now = Date.now();
    for (let i = 0; i < by; i++) this.timestamps.push(now);
  }

  get(labels?: Labels): number {
    if (!labels) return this.value;
    const key = JSON.stringify(labels);
    return this.series.get(key) ?? 0;
  }

  countSince(msAgo: number): number {
    const threshold = Date.now() - msAgo;
    // prune old timestamps to avoid unbounded growth
    let firstValidIdx = 0;
    while (firstValidIdx < this.timestamps.length && this.timestamps[firstValidIdx] < threshold) {
      firstValidIdx++;
    }
    if (firstValidIdx > 0) this.timestamps = this.timestamps.slice(firstValidIdx);
    return this.timestamps.length;
  }
}

class MetricsRegistry {
  private counters = new Map<string, Counter>();

  counter(name: string, help?: string): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, new Counter(name, help));
    }
    return this.counters.get(name)!;
  }

  snapshot(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, c] of this.counters.entries()) out[k] = c.get();
    return out;
  }
}

export const metrics = new MetricsRegistry();

// Predefined counters used in the Twitter flow
export const CTR_TWITTER_RATE_LIMIT_HITS = 'twitter_rate_limit_hits';
export const CTR_TWITTER_API_ERRORS = 'twitter_api_errors';

// Simple alert helpers for rate-limit hits within a window
const WINDOW_MS = Number(process.env['METRICS_ALERT_TWITTER_RATE_LIMIT_WINDOW_MS'] ?? 15 * 60 * 1000);
const THRESHOLD = Number(process.env['METRICS_ALERT_TWITTER_RATE_LIMIT_THRESHOLD'] ?? 5);

export function recordTwitterRateLimit(by = 1) {
  metrics.counter(CTR_TWITTER_RATE_LIMIT_HITS, 'Twitter rate limit responses').inc(by);
}

export function recordTwitterApiError(by = 1) {
  metrics.counter(CTR_TWITTER_API_ERRORS, 'Twitter API errors (non-429)').inc(by);
}

export function isRateLimitAlerting(): boolean {
  const c = metrics.counter(CTR_TWITTER_RATE_LIMIT_HITS);
  const count = c.countSince(WINDOW_MS);
  return count >= THRESHOLD;
}
