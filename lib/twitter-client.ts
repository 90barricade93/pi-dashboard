/**
 * Minimal Twitter API v2 client used by the app.
 * - Server-side only: uses bearer auth from env by default.
 * - Provides a typed method for Recent Search (the only endpoint in use).
 */

export type PublicMetrics = {
  like_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count?: number;
};

export type Tweet = {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: PublicMetrics;
};

export type User = {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
};

export type RecentSearchResponse = {
  data?: Tweet[];
  includes?: {
    users?: User[];
  };
  meta?: unknown;
  // The server route may attach these in certain scenarios
  fromCache?: boolean;
  notice?: string;
  retryAt?: number;
  stale?: boolean;
  lastUpdated?: number;
};

export type RecentSearchParams = {
  query: string;
  'tweet.fields'?: string;
  expansions?: string;
  'user.fields'?: string;
  max_results?: number;
};

export class TwitterApiError extends Error {
  readonly status: number;
  readonly details?: unknown;
  readonly headers: Record<string, string> | undefined;

  constructor(
    message: string,
    status: number,
    details?: unknown,
    headers?: Record<string, string>
  ) {
    super(message);
    this.name = 'TwitterApiError';
    this.status = status;
    this.details = details;
    this.headers = headers;
  }
}

export type TwitterClientOptions = {
  bearerToken?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
};

export class TwitterClient {
  private readonly baseUrl: string;
  private readonly bearerToken: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: TwitterClientOptions = {}) {
    const token = options.bearerToken ?? process.env['TWITTER_BEARER_TOKEN'];
    if (!token) {
      throw new Error('TWITTER_BEARER_TOKEN is not set. Provide via env or constructor.');
    }

    this.baseUrl = options.baseUrl ?? 'https://api.twitter.com/2';
    this.bearerToken = token;
    this.fetchFn = options.fetchFn ?? (globalThis.fetch as typeof fetch);
  }

  /**
   * Calls Twitter v2 Recent Search.
   * Defaults replicate current app usage but can be overridden.
   */
  async searchRecent(params: RecentSearchParams): Promise<RecentSearchResponse> {
    const url = new URL(`${this.baseUrl}/tweets/search/recent`);

    // Apply defaults matching current usage if not provided
    const fullParams: Required<
      Pick<RecentSearchParams, 'tweet.fields' | 'expansions' | 'user.fields' | 'max_results'>
    > &
      Pick<RecentSearchParams, 'query'> = {
      query: params.query,
      'tweet.fields': params['tweet.fields'] ?? 'created_at,public_metrics',
      expansions: params.expansions ?? 'author_id',
      'user.fields': params['user.fields'] ?? 'name,username,profile_image_url',
      max_results: params.max_results ?? 10,
    };

    const searchParams = new URLSearchParams();
    Object.entries(fullParams).forEach(([k, v]) => {
      searchParams.set(k, String(v));
    });
    url.search = searchParams.toString();

    const res = await this.fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        Accept: 'application/json',
        'User-Agent': 'PiDashboard TwitterClient/1.0',
      },
    });

    if (!res.ok) {
      let details: unknown;
      try {
        details = await res.json();
      } catch {
        // ignore
      }
      const headersObj = Object.fromEntries(res.headers.entries());
      throw new TwitterApiError('Twitter API request failed', res.status, details, headersObj);
    }

    return (await res.json()) as RecentSearchResponse;
  }
}
