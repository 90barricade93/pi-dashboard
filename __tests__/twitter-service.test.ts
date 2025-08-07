import { TwitterService } from "../lib/twitter-service";
import { TwitterClient, TwitterApiError } from "../lib/twitter-client";
import { InMemoryCacheStore } from "../lib/cache-store";
import { InMemoryTokenBucket } from "../lib/rate-limiter";

describe("TwitterService", () => {
  const makeTweets = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: String(i + 1), text: `t${i + 1}` }));

  test("cache-first returns cached value when present", async () => {
    const cache = new InMemoryCacheStore(() => 1000);
    await cache.set("twitter:pi-recent", { data: makeTweets(3) }, 10_000);

    const client = new TwitterClient({ bearerToken: "TEST", fetchFn: (async () => {
      throw new Error("unused in tests");
    }) as unknown as typeof fetch });

    const limiter = new InMemoryTokenBucket({ capacity: 1, refillRatePerSec: 1, nowFn: () => 1000 });

    const svc = new TwitterService({ client, cache, limiter, ttlMs: 10_000, sliceCount: 3 });

    const res = await svc.getPiNetworkRecent();
    expect(res.fromCache).toBe(true);
    expect(res.stale).toBe(false);
    expect(res.data?.data?.length).toBe(3);
  });

  test("miss then fetch stores cache and returns fresh", async () => {
    let now = 1_000;
    const cache = new InMemoryCacheStore(() => now);

    const client = new TwitterClient({ bearerToken: "TEST" });
    jest
      .spyOn(client, "searchRecent")
      .mockResolvedValue({ data: makeTweets(5) });

    const limiter = new InMemoryTokenBucket({ capacity: 10, refillRatePerSec: 10, nowFn: () => now });

    const svc = new TwitterService({ client, cache, limiter, ttlMs: 10_000, sliceCount: 3 });

    const res = await svc.getPiNetworkRecent();
    expect(res.fromCache).toBe(false);
    expect(res.stale).toBe(false);
    expect(res.data?.data?.length).toBe(3); // sliced to 3

    // now cached
    const cached = await cache.get("twitter:pi-recent");
    expect(cached.value?.data?.length).toBe(3);
  });

  test("429 from Twitter returns stale when last good exists and includes retryAt", async () => {
    let now = 1_000;
    const cache = new InMemoryCacheStore(() => now);

    const client = new TwitterClient({ bearerToken: "TEST" });
    // Seed lastGood by a first successful call
    const searchSpy = jest
      .spyOn(client, "searchRecent")
      .mockResolvedValueOnce({ data: makeTweets(4) });

    const limiter = new InMemoryTokenBucket({ capacity: 10, refillRatePerSec: 10, nowFn: () => now });
    const svc = new TwitterService({ client, cache, limiter, ttlMs: 10_000, sliceCount: 3 });

    // First call succeeds and seeds cache/lastGood
    await svc.getPiNetworkRecent();

    // Now simulate 429 with headers
    searchSpy.mockRejectedValueOnce(
      new TwitterApiError("rate limited", 429, { title: "Too Many Requests" }, { "retry-after": "5" })
    );

    now += 1; // time shift
    const res = await svc.getPiNetworkRecent();
    expect(res.stale).toBe(true);
    expect(res.fromCache).toBe(true);
    expect(res.notice).toMatch(/rate limits|API error/i);
    expect(typeof res.retryAt === "number").toBe(true);
  });

  test("local limiter blocks and returns stale when available", async () => {
    let now = 1_000;
    const cache = new InMemoryCacheStore(() => now);
    const client = new TwitterClient({ bearerToken: "TEST" });
    // First call resolves to seed lastGoodValue
    jest
      .spyOn(client, "searchRecent")
      .mockResolvedValueOnce({ data: makeTweets(4) });

    // Capacity 1, do two consecutive calls without refill
    const limiter = new InMemoryTokenBucket({ capacity: 1, refillRatePerSec: 0, nowFn: () => now });

    const svc = new TwitterService({ client, cache, limiter, ttlMs: 10_000, sliceCount: 3 });

    // First call: miss -> fetch -> seed lastGood and cache
    const first = await svc.getPiNetworkRecent();
    expect(first.fromCache).toBe(false);
    expect(first.stale).toBe(false);

    // Second call: limiter blocks -> return stale
    const res = await svc.getPiNetworkRecent();
    expect(res.stale).toBe(true);
    expect(res.fromCache).toBe(true);
    expect(res.notice).toMatch(/rate limiter/i);
  });
});
