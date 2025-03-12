import { NextResponse } from "next/server"

// In-memory cache for tweets
let tweetCache: {
  data: any
  timestamp: number
} | null = null

// Cache duration in milliseconds (15 minutes)
const CACHE_DURATION = 15 * 60 * 1000

// Rate limit status
let isRateLimited = false
let rateLimitResetTime = 0

export async function GET() {
  try {
    const now = Date.now()

    // Check if we're currently rate limited
    if (isRateLimited && now < rateLimitResetTime) {
      console.log("Currently rate limited, skipping API call")

      // If we have cached data, return it
      if (tweetCache) {
        return NextResponse.json({
          ...tweetCache.data,
          fromCache: true,
          notice: "Using cached data due to API rate limits",
        })
      }

      // If no cache, return an error
      return NextResponse.json(
        { error: "Twitter API is rate limited", details: { resetTime: rateLimitResetTime } },
        { status: 429 },
      )
    }

    // If rate limit has expired, reset the flag
    if (isRateLimited && now >= rateLimitResetTime) {
      isRateLimited = false
    }

    // Check if we have valid cached data
    if (tweetCache && now - tweetCache.timestamp < CACHE_DURATION) {
      console.log("Returning cached tweets")
      return NextResponse.json({ ...tweetCache.data, fromCache: true })
    }

    // Get the bearer token from environment variables
    const token = process.env.TWITTER_BEARER_TOKEN

    if (!token) {
      console.error("Twitter Bearer Token is not configured")
      return NextResponse.json({ error: "Twitter Bearer Token is not configured" }, { status: 500 })
    }

    const endpointUrl = "https://api.twitter.com/2/tweets/search/recent"

    // Modified query to only get tweets from @PiNetwork
    const params = new URLSearchParams({
      query: "from:PiNetwork -is:retweet",
      "tweet.fields": "created_at,public_metrics",
      expansions: "author_id",
      "user.fields": "name,username,profile_image_url",
      max_results: "10",
    })

    // Construct the full URL with parameters
    const url = `${endpointUrl}?${params.toString()}`

    // Make the request using native fetch
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "v2RecentSearchJS",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("X API error status:", response.status, "Response:", errorText)

      let errorData
      try {
        // Try to parse as JSON if possible
        errorData = JSON.parse(errorText)
      } catch (e) {
        // If not valid JSON, use the text
        errorData = { message: errorText }
      }

      // If we hit rate limits, set the rate limit flag
      if (response.status === 429) {
        isRateLimited = true
        // Set reset time to 4 hours from now
        rateLimitResetTime = now + 4 * 60 * 60 * 1000
        console.log(`Rate limited until ${new Date(rateLimitResetTime).toLocaleTimeString()}`)
      }

      // If we have cached data and hit rate limits, return the cached data
      if (response.status === 429 && tweetCache) {
        console.log("Rate limited, returning cached tweets")
        return NextResponse.json({
          ...tweetCache.data,
          fromCache: true,
          notice: "Using cached data due to API rate limits",
        })
      }

      return NextResponse.json({ error: "Failed to fetch tweets", details: errorData }, { status: response.status })
    }

    // Parse the response as JSON
    const data = await response.json()

    // Update the cache
    tweetCache = {
      data,
      timestamp: now,
    }

    // Reset rate limit flag if we successfully got data
    isRateLimited = false

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching tweets:", error)

    // If we have cached data and encounter an error, return the cached data
    if (tweetCache) {
      console.log("Error occurred, returning cached tweets")
      return NextResponse.json({
        ...tweetCache.data,
        fromCache: true,
        notice: "Using cached data due to API error",
      })
    }

    return NextResponse.json(
      { error: "Failed to fetch tweets", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

