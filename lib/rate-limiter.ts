/**
 * Token-bucket RateLimiter with in-memory implementation.
 */

export type RateLimiterResult = {
  allowed: boolean;
  tokensRemaining: number;
  cooldownUntil?: number; // epoch ms when tokens become available
};

export type RateLimiter = {
  take(tokens?: number): Promise<RateLimiterResult>;
  cooldownUntil(): number | undefined;
};

export type TokenBucketOptions = {
  capacity: number; // max tokens
  refillRatePerSec: number; // tokens per second
  nowFn?: () => number; // epoch ms
};

export class InMemoryTokenBucket implements RateLimiter {
  private tokens: number;
  private lastRefillMs: number;
  private readonly now: () => number;

  constructor(private readonly opts: TokenBucketOptions) {
    this.tokens = opts.capacity;
    this.now = opts.nowFn ?? (() => Date.now());
    this.lastRefillMs = this.now();
  }

  private refill(): void {
    const now = this.now();
    const elapsedSec = (now - this.lastRefillMs) / 1000;
    if (elapsedSec <= 0) return;
    const refillAmount = elapsedSec * this.opts.refillRatePerSec;
    this.tokens = Math.min(this.opts.capacity, this.tokens + refillAmount);
    this.lastRefillMs = now;
  }

  async take(tokens = 1): Promise<RateLimiterResult> {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return { allowed: true, tokensRemaining: this.tokens };
    }
    // compute cooldown
    const deficit = tokens - this.tokens;
    const secondsUntil = deficit / this.opts.refillRatePerSec;
    const cooldownUntil = this.now() + Math.ceil(secondsUntil * 1000);
    return { allowed: false, tokensRemaining: this.tokens, cooldownUntil };
  }

  cooldownUntil(): number | undefined {
    // approximate next-available time for 1 token
    const deficit = 1 - this.tokens;
    if (deficit <= 0) return undefined;
    const secondsUntil = deficit / this.opts.refillRatePerSec;
    return this.now() + Math.ceil(secondsUntil * 1000);
  }
}
