import type { RecentSearchResponse } from './twitter-client';

export const TWITTER_CACHE_KEY = 'twitter-cache';
export const TWITTER_RATE_LIMIT_KEY = 'twitter-rate-limited';
export const NEWS_REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
export const TWITTER_CACHE_MAX_AGE_HOURS = 4;

interface RateLimitInfo {
  timestamp: number;
  resetTime: number;
}

interface CachedTweets {
  data: RecentSearchResponse;
  timestamp: number;
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readRateLimitInfo(): RateLimitInfo | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(TWITTER_RATE_LIMIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RateLimitInfo;
    if (typeof parsed?.resetTime !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeRateLimitInfo(resetTime: number): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(
      TWITTER_RATE_LIMIT_KEY,
      JSON.stringify({ timestamp: Date.now(), resetTime })
    );
  } catch {
    // Private mode / quota — ignore
  }
}

export function clearRateLimitInfo(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(TWITTER_RATE_LIMIT_KEY);
  } catch {
    // ignore
  }
}

export function readCachedTweets(): CachedTweets | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(TWITTER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTweets;
    if (typeof parsed?.timestamp !== 'number' || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedTweets(data: RecentSearchResponse, timestamp: number): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(TWITTER_CACHE_KEY, JSON.stringify({ data, timestamp }));
  } catch {
    // ignore
  }
}

export function clearCachedTweets(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(TWITTER_CACHE_KEY);
  } catch {
    // ignore
  }
}
