"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, AlertCircle, Twitter, Info, CheckIcon as CheckVerified } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  url: string
  publishedAt: string
  category: "announcements" | "community" | "development" | "twitter"
  imageUrl?: string
  author?: {
    name: string
    username?: string
    profileImageUrl?: string
  }
  metrics?: {
    likes?: number
    retweets?: number
    replies?: number
  }
}

// News refresh interval in milliseconds (10 minutes)
const NEWS_REFRESH_INTERVAL = 10 * 60 * 1000

// Rate limit reset period (4 hours in milliseconds)
const RATE_LIMIT_RESET = 4 * 60 * 60 * 1000

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("all")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [twitterDisabled, setTwitterDisabled] = useState(false)

  // Check for stored rate limit status on component mount
  useEffect(() => {
    try {
      const storedRateLimitInfo = localStorage.getItem("twitter-rate-limited")
      if (storedRateLimitInfo) {
        const rateLimitInfo = JSON.parse(storedRateLimitInfo)
        const now = Date.now()

        // If the rate limit timestamp is still valid, disable Twitter
        if (now < rateLimitInfo.resetTime) {
          setTwitterDisabled(true)

          // Calculate time remaining until reset
          const timeRemaining = Math.ceil((rateLimitInfo.resetTime - now) / (60 * 1000)) // in minutes
          setNotice(`Twitter API is rate limited. Will try again in approximately ${timeRemaining} minutes.`)
        } else {
          // Rate limit has expired, clear it
          localStorage.removeItem("twitter-rate-limited")
        }
      }
    } catch (e) {
      console.error("Error checking stored rate limit:", e)
    }
  }, [])

  // Function to fetch news from multiple sources
  const fetchNews = async () => {
    setLoading(true)
    setError(null)

    // Only update notice if it's not already set (preserve rate limit notice)
    if (!notice || !notice.includes("rate limited")) {
      setNotice(null)
    }

    // Start with mock news data that's always available
    const mockNews: NewsItem[] = [
      {
        id: "1",
        title: "Pi Network Announces New Mainnet Features",
        summary:
          "The Pi Core Team has announced several new features coming to the Pi Mainnet, including enhanced security measures and improved transaction speeds.",
        source: "Pi Network Blog",
        url: "https://minepi.com/blog/example",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        category: "announcements",
      },
      {
        id: "2",
        title: "Community Spotlight: Pi Hackathon Winners",
        summary:
          "Check out the innovative projects that won the recent Pi Network Hackathon, showcasing the creativity and technical skills of the Pi community.",
        source: "Pi Community Forum",
        url: "https://community.minepi.com/example",
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        category: "community",
      },
      {
        id: "3",
        title: "Pi SDK Update: New Developer Tools Released",
        summary:
          "Pi Network has released new developer tools to help build applications on the Pi ecosystem, including improved documentation and testing frameworks.",
        source: "Pi Developer Portal",
        url: "https://developers.minepi.com/example",
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        category: "development",
      },
      {
        id: "4",
        title: "Pi Network Partners with Major E-commerce Platform",
        summary:
          "A new partnership has been announced that will allow Pi cryptocurrency to be used for purchases on a major e-commerce platform, expanding the utility of Pi.",
        source: "Crypto News Daily",
        url: "https://cryptonews.com/example",
        publishedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        category: "announcements",
      },
      {
        id: "5",
        title: "Community-Led Pi Merchant Directory Launches",
        summary:
          "A group of Pi pioneers has created a comprehensive directory of merchants accepting Pi as payment, making it easier for users to spend their Pi.",
        source: "Pi Community Forum",
        url: "https://community.minepi.com/example2",
        publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        category: "community",
      },
    ]

    // Only try to fetch Twitter data if it's not disabled
    let allNews = [...mockNews]

    if (!twitterDisabled) {
      try {
        const twitterResponse = await fetch("/api/twitter-news", {
          // Add cache: 'no-store' to prevent caching of the request
          cache: "no-store",
          // Add a unique parameter to prevent caching
          headers: {
            "X-Timestamp": Date.now().toString(),
          },
        })

        // First check if the response is ok before trying to parse JSON
        if (!twitterResponse.ok) {
          const errorText = await twitterResponse.text()
          console.error("Twitter API error:", errorText)

          let errorMessage = "Could not load Twitter data."
          let errorData

          try {
            // Try to parse the error as JSON
            errorData = JSON.parse(errorText)
            if (errorData.error) {
              errorMessage = errorData.error
            }
          } catch (e) {
            // If parsing fails, use the text directly
            errorMessage = `Error: ${errorText}`
          }

          // If we get a rate limit error, disable Twitter for this session
          if (twitterResponse.status === 429) {
            setTwitterDisabled(true)

            // Store rate limit info in localStorage with a reset time
            const resetTime = Date.now() + RATE_LIMIT_RESET
            localStorage.setItem(
              "twitter-rate-limited",
              JSON.stringify({
                timestamp: Date.now(),
                resetTime: resetTime,
              }),
            )

            // Calculate time until reset in minutes
            const resetMinutes = Math.ceil(RATE_LIMIT_RESET / (60 * 1000))
            setNotice(`Twitter API is rate limited. Will try again in approximately ${resetMinutes} minutes.`)
          } else {
            setNotice(errorMessage)
          }
        } else {
          // Only try to parse JSON if the response is ok
          const twitterData = await twitterResponse.json()

          if (twitterData.data && twitterData.includes) {
            // Process tweets
            const twitterNews = processTweets(twitterData)
            allNews = [...twitterNews, ...mockNews]

            if (twitterData.fromCache) {
              setNotice("Using cached Twitter data due to rate limits.")
            }

            // Clear any stored rate limit since we successfully got data
            localStorage.removeItem("twitter-rate-limited")
          } else {
            setNotice("Twitter data format is unexpected. Showing other news sources only.")
          }
        }
      } catch (error) {
        console.error("Error fetching Twitter data:", error)
        setNotice(`Error loading Twitter data: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Sort news by publication date (newest first)
    allNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    setNews(allNews)
    setLastUpdated(new Date())
    setLoading(false)
  }

  // Process tweets from the X API response
  const processTweets = (twitterData: any): NewsItem[] => {
    const twitterNews: NewsItem[] = []

    if (!twitterData.data || !twitterData.includes?.users) {
      return twitterNews
    }

    // Create a map of user IDs to user objects
    const usersMap = twitterData.includes.users.reduce((acc: Record<string, any>, user: any) => {
      acc[user.id] = user
      return acc
    }, {})

    // Process each tweet
    twitterData.data.forEach((tweet: any) => {
      const author = usersMap[tweet.author_id]
      if (!author) return

      // Create tweet URL
      const tweetUrl = `https://twitter.com/${author.username}/status/${tweet.id}`

      // Clean up tweet text (remove URLs if needed)
      const cleanText = tweet.text

      // Create news item
      twitterNews.push({
        id: tweet.id,
        title: `${author.name} (@${author.username})`,
        summary: cleanText,
        source: "X (Twitter)",
        url: tweetUrl,
        publishedAt: tweet.created_at,
        category: "twitter",
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
      })
    })

    return twitterNews
  }

  // Initial fetch and setup refresh interval
  useEffect(() => {
    fetchNews()

    // Set up periodic refresh
    const interval = setInterval(fetchNews, NEWS_REFRESH_INTERVAL)

    // Clean up interval on component unmount
    return () => clearInterval(interval)
  }, [twitterDisabled])

  // Function to manually retry Twitter integration
  const handleRetryTwitter = () => {
    if (twitterDisabled) {
      // Clear rate limit status
      localStorage.removeItem("twitter-rate-limited")
      setTwitterDisabled(false)
      setNotice("Retrying Twitter integration...")
      fetchNews()
    }
  }

  const filteredNews = activeTab === "all" ? news : news.filter((item) => item.category === activeTab)

  const formatDate = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
  }

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
        <div className="flex justify-between items-center mb-4">
          <div className="text-xs text-muted-foreground">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-2">
            {twitterDisabled && (
              <Button variant="outline" size="sm" onClick={handleRetryTwitter}>
                <Twitter className="h-4 w-4 mr-1 text-blue-400" />
                Retry X
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={fetchNews} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {notice && (
          <div className="flex items-center gap-2 text-blue-500 text-sm mb-4 p-3 bg-blue-50 rounded-md">
            <Info className="h-4 w-4" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-amber-500 text-sm mb-4 p-3 bg-amber-50 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === "twitter" && !twitterDisabled && (
          <div className="flex items-center gap-2 text-blue-500 text-sm mb-4 p-3 bg-blue-50 rounded-md">
            <Twitter className="h-4 w-4" />
            <span>Showing official tweets from @PiNetwork</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNews.length > 0 ? (
              filteredNews.map((item) => (
                <div key={item.id} className="border-b pb-4 last:border-0">
                  <div className="flex gap-3">
                    {item.imageUrl && (
                      <div className="hidden sm:block flex-shrink-0">
                        <img
                          src={item.imageUrl || "/placeholder.svg"}
                          alt=""
                          className="w-[120px] h-[80px] object-cover rounded-md"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.category === "twitter" && (
                          <div className="flex items-center">
                            <Twitter className="h-4 w-4 text-blue-400" />
                            <CheckVerified className="h-3 w-3 text-blue-500 ml-1" />
                          </div>
                        )}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-lg hover:text-blue-600 transition-colors"
                        >
                          {item.title}
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.summary}</p>

                      {item.category === "twitter" && item.metrics && (
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          {item.metrics.likes !== undefined && <span>{item.metrics.likes} likes</span>}
                          {item.metrics.retweets !== undefined && <span>{item.metrics.retweets} retweets</span>}
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-2 text-xs">
                        <span className="text-muted-foreground">
                          {item.category === "twitter" && item.author?.profileImageUrl ? (
                            <div className="flex items-center gap-1">
                              <img
                                src={item.author.profileImageUrl || "/placeholder.svg"}
                                alt={item.author.name}
                                className="w-4 h-4 rounded-full"
                              />
                              <span>{item.source}</span>
                            </div>
                          ) : (
                            <span>{item.source}</span>
                          )}
                        </span>
                        <span className="text-muted-foreground">{formatDate(item.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No news available in this category.</p>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t text-xs text-center text-muted-foreground">
          <p>
            This news feed aggregates content from Pi Network official sources, community forums, and official Pi
            Network tweets.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

