import { InMemoryCacheStore } from '../lib/cache-store';
import { InMemoryTokenBucket } from '../lib/rate-limiter';

describe('InMemoryCacheStore', () => {
  test('set and get within TTL is a hit', async () => {
    let now = 1_000_000;
    const nowFn = () => now;
    const cache = new InMemoryCacheStore(nowFn);

    await cache.set('k', { v: 1 }, 1000);
    const res1 = await cache.get<{ v: number }>('k');
    expect(res1.value).toEqual({ v: 1 });
    expect(res1.lastUpdated).toBe(now);

    now += 500;
    const res2 = await cache.get<{ v: number }>('k');
    expect(res2.value).toEqual({ v: 1 });
  });

  test('expired entry is a miss and returns lastUpdated', async () => {
    let now = 1_000_000;
    const nowFn = () => now;
    const cache = new InMemoryCacheStore(nowFn);

    await cache.set('k', 123, 1000);
    now += 1500; // expire
    const res = await cache.get<number>('k');
    expect(res.value).toBeNull();
    expect(res.lastUpdated).not.toBeNull();
  });
});

describe('InMemoryTokenBucket', () => {
  test('allows within capacity and blocks bursts beyond capacity', async () => {
    let now = 1_000_000;
    const nowFn = () => now;
    const limiter = new InMemoryTokenBucket({ capacity: 3, refillRatePerSec: 1, nowFn });

    // consume 3 tokens
    expect((await limiter.take()).allowed).toBe(true);
    expect((await limiter.take()).allowed).toBe(true);
    expect((await limiter.take()).allowed).toBe(true);

    // 4th token immediately should be blocked
    const r4 = await limiter.take();
    expect(r4.allowed).toBe(false);
    expect(r4.cooldownUntil).toBeDefined();

    // advance 1s -> 1 token refilled
    now += 1000;
    const r5 = await limiter.take();
    expect(r5.allowed).toBe(true);
  });
});
