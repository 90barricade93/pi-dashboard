'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Twitter, Info, BadgeCheck as CheckVerified } from 'lucide-react';
import type { RecentSearchResponse } from '@/lib/twitter-client';
import { logger } from '@/lib/logger';
import { getMockNewsItems, type NewsItem } from '@/lib/news-mock-data';
import { processTweets } from '@/lib/process-tweets';
import {
  NEWS_REFRESH_INTERVAL_MS,
  TWITTER_CACHE_MAX_AGE_HOURS,
  readRateLimitInfo,
  writeRateLimitInfo,
  clearRateLimitInfo,
  readCachedTweets,
  writeCachedTweets,
} from '@/lib/twitter-client-storage';
import { withViewTransition } from '@/lib/view-transition';

const RATE_LIMIT_FALLBACK_RETRY_MS = 15 * 60 * 1000;

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [twitterDisabled, setTwitterDisabled] = useState(false);
  const [rateLimitResetAt, setRateLimitResetAt] = useState<number | null>(null);
  const announcedMinutesRef = useRef<number | null>(null);

  // Check for stored rate limit status and cached tweets on component mount
  useEffect(() => {
    try {
      const now = Date.now();

      const rateLimitInfo = readRateLimitInfo();
      if (rateLimitInfo) {
        if (now < rateLimitInfo.resetTime) {
          setTwitterDisabled(true);
          setRateLimitResetAt(rateLimitInfo.resetTime);
          const timeRemaining = Math.ceil((rateLimitInfo.resetTime - now) / (60 * 1000));
          setNotice(
            `Twitter API is rate limited. Will try again in approximately ${timeRemaining} minutes.`
          );
        } else {
          clearRateLimitInfo();
        }
      }

      const cached = readCachedTweets();
      if (cached) {
        const hoursSinceCache = (now - cached.timestamp) / (60 * 60 * 1000);
        if (hoursSinceCache < TWITTER_CACHE_MAX_AGE_HOURS) {
          const twitterNews = processTweets(cached.data);
          setNews(prevNews => {
            const nonTwitterNews = prevNews.filter(item => item.category !== 'twitter');
            return [...twitterNews, ...nonTwitterNews];
          });
          setNotice('Using cached Twitter data');
          setLastUpdated(new Date(cached.timestamp));
        }
      }
    } catch (e) {
      logger.error('news_feed_storage_read_failed', { error: String(e) });
    }
  }, []);

  // Function to fetch news from multiple sources
  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Only clear notices when not in a rate-limited state
    if (!twitterDisabled) {
      setNotice(null);
    }

    // Start with mock news data that's always available
    const mockNews = getMockNewsItems();
    let allNews = [...mockNews];
    let serverSetLastUpdated = false;

    if (!twitterDisabled) {
      try {
        const twitterResponse = await fetch('/api/twitter-news', {
          cache: 'no-store',
          headers: {
            'X-Timestamp': Date.now().toString(),
          },
        });

        if (!twitterResponse.ok) {
          // Read as JSON if possible to extract retryAt; fallback to text
          let errorBody: unknown = null;
          let errorText = '';
          try {
            errorBody = await twitterResponse.json();
          } catch {
            try {
              errorText = await twitterResponse.text();
            } catch {
              // Ignore text parsing error
            }
          }

          // Use warn instead of error to avoid Next.js error overlay for handled states
          logger.warn('news_feed_twitter_api_warning', {
            status: twitterResponse.status,
            body: errorBody || errorText,
          });

          const bodyObj =
            errorBody && typeof errorBody === 'object'
              ? (errorBody as Record<string, unknown>)
              : null;
          const baseMessage =
            bodyObj && typeof bodyObj['error'] === 'string'
              ? (bodyObj['error'] as string)
              : bodyObj && typeof bodyObj['message'] === 'string'
                ? (bodyObj['message'] as string)
                : errorText
                  ? `Error: ${errorText}`
                  : 'Could not load Twitter data.';

          if (twitterResponse.status === 429) {
            setTwitterDisabled(true);

            // Prefer server-provided retryAt; fallback 15 minutes
            const retryAt =
              bodyObj && typeof bodyObj['retryAt'] === 'number'
                ? (bodyObj['retryAt'] as number)
                : Date.now() + RATE_LIMIT_FALLBACK_RETRY_MS;

            writeRateLimitInfo(retryAt);

            setRateLimitResetAt(retryAt);
            const mins = Math.max(1, Math.ceil((retryAt - Date.now()) / (60 * 1000)));
            setNotice(
              `Twitter API is rate limited. Will try again in approximately ${mins} minutes.`
            );
          } else {
            setNotice(baseMessage);
          }
        } else {
          const twitterData: RecentSearchResponse = await twitterResponse.json();

          // Persist raw payload for debugging and quick reloads
          writeCachedTweets(
            twitterData,
            typeof twitterData?.lastUpdated === 'number' ? twitterData.lastUpdated : Date.now()
          );

          // Always try to process what we received; this will yield [] if shape is missing
          const twitterNews = processTweets(twitterData);
          allNews = [...twitterNews, ...mockNews];

          if (twitterData?.stale) {
            setNotice(twitterData?.notice || 'Showing cached Twitter data (may be stale).');
          } else if (twitterData?.fromCache) {
            setNotice('Using cached Twitter data');
          } else if (Array.isArray(twitterData?.data) && twitterData.data.length === 0) {
            setNotice('No recent tweets found from @PiCoreTeam');
          } else if (twitterNews.length === 0) {
            // Keep a soft notice rather than an error to avoid confusing users when API omits includes
            setNotice('No Twitter items could be parsed at this time. Showing other sources only.');
          }

          // Any successful (non-429) response clears local rate limit state
          clearRateLimitInfo();

          // Use server-provided lastUpdated when available
          if (typeof twitterData?.lastUpdated === 'number') {
            setLastUpdated(new Date(twitterData.lastUpdated));
            serverSetLastUpdated = true;
          }
        }
      } catch (error) {
        // Non-fatal: log as warning and keep the rest of the feed working
        logger.warn('news_feed_fetch_twitter_failed', { error: String(error) });
        setNotice(
          `Error loading Twitter data: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Sort news by publication date (newest first)
    allNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    setNews(allNews);
    if (!serverSetLastUpdated) {
      setLastUpdated(new Date());
    }
    setLoading(false);
  }, [twitterDisabled]);

  // Initial fetch and setup refresh interval
  useEffect(() => {
    fetchNews();

    // Set up periodic refresh
    const interval = setInterval(fetchNews, NEWS_REFRESH_INTERVAL_MS);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [twitterDisabled, fetchNews]);

  // Live countdown for rate limit window; auto-clear and retry when done
  useEffect(() => {
    if (!twitterDisabled || rateLimitResetAt == null) return;
    announcedMinutesRef.current = null;
    const tick = () => {
      const remainingMs = rateLimitResetAt - Date.now();
      if (remainingMs <= 0) {
        clearRateLimitInfo();
        setTwitterDisabled(false);
        setRateLimitResetAt(null);
        announcedMinutesRef.current = null;
        setNotice('Retrying Twitter integration...');
        // trigger immediate retry
        fetchNews();
        return false;
      }
      // Throttle to minute precision so the aria-live region doesn't announce
      // a new string every second; the wait is on the order of ~15 minutes.
      const totalMins = Math.max(1, Math.ceil(remainingMs / 60_000));
      if (announcedMinutesRef.current !== totalMins) {
        announcedMinutesRef.current = totalMins;
        setNotice(
          `Twitter API is rate limited. Will try again in approximately ${totalMins} minute${totalMins !== 1 ? 's' : ''}.`
        );
      }
      return true;
    };
    // Run immediately to refresh UI, then every second
    tick();
    const id = setInterval(() => {
      const keep = tick();
      if (!keep) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [twitterDisabled, rateLimitResetAt, fetchNews]);

  const filteredNews =
    activeTab === 'all' ? news : news.filter(item => item.category === activeTab);

  const formatDate = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>News</CardTitle>
        <div className="w-full max-w-[300px]">
          <Tabs
            defaultValue="all"
            onValueChange={value => withViewTransition(() => setActiveTab(value))}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="announcements" className="text-xs">
                News
              </TabsTrigger>
              <TabsTrigger value="community" className="text-xs">
                Community
              </TabsTrigger>
              <TabsTrigger value="development" className="text-xs">
                Dev
              </TabsTrigger>
              <TabsTrigger value="twitter" className="text-xs">
                Official
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </div>
        </div>

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-500"
          >
            <Info className="size-4" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-500">
            <AlertCircle className="size-4" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'twitter' && !twitterDisabled && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-500">
            <Twitter className="size-4" />
            <span>Showing official tweets from @PiCoreTeam</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNews.length > 0 ? (
              filteredNews.map(item => (
                <div key={item.id} className="border-b pb-4 last:border-0">
                  <div className="flex gap-3">
                    {item.imageUrl && (
                      <div className="hidden shrink-0 sm:block">
                        <img
                          src={item.imageUrl || '/placeholder.svg'}
                          alt=""
                          className="h-[80px] w-[120px] rounded-md object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.category === 'twitter' && (
                          <div className="flex items-center">
                            <Twitter className="size-4 text-blue-400" />
                            <CheckVerified className="ml-1 size-3 text-blue-500" />
                          </div>
                        )}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-medium transition-colors hover:text-blue-600"
                        >
                          {item.title}
                        </a>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>

                      {item.category === 'twitter' && item.metrics && (
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          {item.metrics.likes !== undefined && (
                            <span>{item.metrics.likes} likes</span>
                          )}
                          {item.metrics.retweets !== undefined && (
                            <span>{item.metrics.retweets} retweets</span>
                          )}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {item.category === 'twitter' && item.author?.profileImageUrl ? (
                            <div className="flex items-center gap-1">
                              <img
                                src={item.author.profileImageUrl || '/placeholder.svg'}
                                alt={item.author.name}
                                className="size-4 rounded-full"
                              />
                              <span>{item.source}</span>
                            </div>
                          ) : (
                            <span>{item.source}</span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {formatDate(item.publishedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No news available in this category.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 border-t pt-3 text-center text-xs text-muted-foreground">
          <p>
            This news feed aggregates content from Pi Network official sources, community forums,
            and official Pi Network tweets.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
