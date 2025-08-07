'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertCircle, Twitter, Info, BadgeCheck as CheckVerified } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'announcements' | 'community' | 'development' | 'twitter';
  imageUrl?: string;
  author?: {
    name: string;
    username?: string;
    profileImageUrl?: string;
  };
  metrics?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
}

// News refresh interval in milliseconds (4 hours)
const NEWS_REFRESH_INTERVAL = 4 * 60 * 60 * 1000;

// Local storage keys
const TWITTER_CACHE_KEY = 'twitter-cache';
const TWITTER_RATE_LIMIT_KEY = 'twitter-rate-limited';

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [twitterDisabled, setTwitterDisabled] = useState(false);

  // Check for stored rate limit status and cached tweets on component mount
  useEffect(() => {
    try {
      // Check rate limit status
      const storedRateLimitInfo = localStorage.getItem(TWITTER_RATE_LIMIT_KEY);
      if (storedRateLimitInfo) {
        const rateLimitInfo = JSON.parse(storedRateLimitInfo);
        const now = Date.now();

        if (now < rateLimitInfo.resetTime) {
          setTwitterDisabled(true);
          const timeRemaining = Math.ceil((rateLimitInfo.resetTime - now) / (60 * 1000));
          setNotice(
            `Twitter API is rate limited. Will try again in approximately ${timeRemaining} minutes.`
          );
        } else {
          localStorage.removeItem(TWITTER_RATE_LIMIT_KEY);
        }
      }

      // Load cached tweets
      const cachedTwitterData = localStorage.getItem(TWITTER_CACHE_KEY);
      if (cachedTwitterData) {
        const { data, timestamp } = JSON.parse(cachedTwitterData);
        const now = Date.now();
        const hoursSinceCache = (now - timestamp) / (60 * 60 * 1000);

        // Only use cache if it's less than 4 hours old
        if (hoursSinceCache < 4) {
          const twitterNews = processTweets(data);
          setNews(prevNews => {
            const nonTwitterNews = prevNews.filter(item => item.category !== 'twitter');
            return [...twitterNews, ...nonTwitterNews];
          });
          setNotice('Using cached Twitter data');
        } else {
          localStorage.removeItem(TWITTER_CACHE_KEY);
        }
      }
    } catch (e) {
      console.error('Error checking stored data:', e);
    }
  }, []);

  // Function to fetch news from multiple sources
  const fetchNews = async () => {
    setLoading(true);
    setError(null);

    if (!notice || !notice.includes('rate limited')) {
      setNotice(null);
    }

    // Start with mock news data that's always available
    const mockNews: NewsItem[] = [
      {
        id: '1',
        title: 'Pi Network Announces New Mainnet Features',
        summary:
          'The Pi Core Team has announced several new features coming to the Pi Mainnet, including enhanced security measures and improved transaction speeds.',
        source: 'Pi Network Blog',
        url: 'https://minepi.com/blog/example',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        category: 'announcements',
      },
      {
        id: '2',
        title: 'Community Spotlight: Pi Hackathon Winners',
        summary:
          'Check out the innovative projects that won the recent Pi Network Hackathon, showcasing the creativity and technical skills of the Pi community.',
        source: 'Pi Community Forum',
        url: 'https://community.minepi.com/example',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        category: 'community',
      },
      {
        id: '3',
        title: 'Pi SDK Update: New Developer Tools Released',
        summary:
          'Pi Network has released new developer tools to help build applications on the Pi ecosystem, including improved documentation and testing frameworks.',
        source: 'Pi Developer Portal',
        url: 'https://developers.minepi.com/example',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        category: 'development',
      },
      {
        id: '4',
        title: 'Pi Network Partners with Major E-commerce Platform',
        summary:
          'A new partnership has been announced that will allow Pi cryptocurrency to be used for purchases on a major e-commerce platform, expanding the utility of Pi.',
        source: 'Crypto News Daily',
        url: 'https://cryptonews.com/example',
        publishedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        category: 'announcements',
      },
      {
        id: '5',
        title: 'Community-Led Pi Merchant Directory Launches',
        summary:
          'A group of Pi pioneers has created a comprehensive directory of merchants accepting Pi as payment, making it easier for users to spend their Pi.',
        source: 'Pi Community Forum',
        url: 'https://community.minepi.com/example2',
        publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        category: 'community',
      },
    ];

    let allNews = [...mockNews];

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
          let errorBody: any = null;
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
          console.warn('Twitter API warning:', errorBody || errorText);

          const baseMessage = (errorBody && (errorBody.error || errorBody.message))
            ? (errorBody.error || errorBody.message)
            : (errorText ? `Error: ${errorText}` : 'Could not load Twitter data.');

          if (twitterResponse.status === 429) {
            setTwitterDisabled(true);

            // Prefer server-provided retryAt; fallback 15 minutes; last fallback 4 hours
            const retryAt = typeof errorBody?.retryAt === 'number'
              ? errorBody.retryAt
              : Date.now() + 15 * 60 * 1000;

            localStorage.setItem(
              TWITTER_RATE_LIMIT_KEY,
              JSON.stringify({ timestamp: Date.now(), resetTime: retryAt })
            );

            const mins = Math.max(1, Math.ceil((retryAt - Date.now()) / (60 * 1000)));
            setNotice(`Twitter API is rate limited. Will try again in approximately ${mins} minutes.`);

            // Early return to avoid throwing handled 429s further
            allNews = [...mockNews];
            setNews(allNews);
            setLastUpdated(new Date());
            setLoading(false);
            return;
          } else {
            setNotice(baseMessage);
          }
        } else {
          const twitterData = await twitterResponse.json();

          if (twitterData.data && twitterData.includes) {
            // Store tweets in localStorage
            localStorage.setItem(
              TWITTER_CACHE_KEY,
              JSON.stringify({
                data: twitterData,
                timestamp: Date.now(),
              })
            );

            const twitterNews = processTweets(twitterData);
            allNews = [...twitterNews, ...mockNews];

            if (twitterData.fromCache) {
              setNotice('Using cached Twitter data');
            }

            localStorage.removeItem(TWITTER_RATE_LIMIT_KEY);
          } else {
            setNotice('Twitter data format is unexpected. Showing other news sources only.');
          }
        }
      } catch (error) {
        // Non-fatal: log as warning and keep the rest of the feed working
        console.warn('Error fetching Twitter data:', error);
        setNotice(
          `Error loading Twitter data: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Sort news by publication date (newest first)
    allNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    setNews(allNews);
    setLastUpdated(new Date());
    setLoading(false);
  };

  // Process tweets from the X API response
  const processTweets = (twitterData: any): NewsItem[] => {
    const twitterNews: NewsItem[] = [];

    if (!twitterData.data || !twitterData.includes?.users) {
      return twitterNews;
    }

    // Create a map of user IDs to user objects
    const usersMap = twitterData.includes.users.reduce((acc: Record<string, any>, user: any) => {
      acc[user.id] = user;
      return acc;
    }, {});

    // Process each tweet
    twitterData.data.forEach((tweet: any) => {
      const author = usersMap[tweet.author_id];
      if (!author) return;

      // Create tweet URL
      const tweetUrl = `https://twitter.com/${author.username}/status/${tweet.id}`;

      // Clean up tweet text (remove URLs if needed)
      const cleanText = tweet.text;

      // Create news item
      twitterNews.push({
        id: tweet.id,
        title: `${author.name} (@${author.username})`,
        summary: cleanText,
        source: 'X (Twitter)',
        url: tweetUrl,
        publishedAt: tweet.created_at,
        category: 'twitter',
        author: {
          name: author.name,
          username: author.username,
          profileImageUrl: author.profile_image_url,
        },
        metrics: {
          likes: tweet.public_metrics?.like_count,
          retweets: tweet.public_metrics?.retweet_count,
          replies: tweet.public_metrics?.reply_count,
        },
      });
    });

    return twitterNews;
  };

  // Initial fetch and setup refresh interval
  useEffect(() => {
    fetchNews();

    // Set up periodic refresh
    const interval = setInterval(fetchNews, NEWS_REFRESH_INTERVAL);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [twitterDisabled]);

  // Function to manually retry Twitter integration
  const handleRetryTwitter = () => {
    if (twitterDisabled) {
      // Clear rate limit status
      localStorage.removeItem(TWITTER_RATE_LIMIT_KEY);
      setTwitterDisabled(false);
      setNotice('Retrying Twitter integration...');
      fetchNews();
    }
  };

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
        <CardTitle>Pi News</CardTitle>
        <div className="w-full max-w-[300px]">
          <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
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
          <div className="flex gap-2">
            {twitterDisabled && (
              <Button variant="outline" size="sm" onClick={handleRetryTwitter}>
                <Twitter className="mr-1 size-4 text-blue-400" />
                Retry X
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={fetchNews} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {notice && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-500">
            <Info className="size-4" />
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
            <span>Showing official tweets from @PiNetwork</span>
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
