import { TwitterClient } from "../lib/twitter-client";

describe("TwitterClient", () => {
  const REAL_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...REAL_ENV };
  });

  afterAll(() => {
    process.env = REAL_ENV;
  });

  test("adds Authorization header with bearer token from env", async () => {
    process.env.TWITTER_BEARER_TOKEN = "test-token";

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], includes: { users: [] } }),
    } as unknown as Response);

    const client = new TwitterClient({ fetchFn: fetchMock });

    await client.searchRecent({ query: "from:PiCoreTeam -is:retweet" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];

    expect(String(url)).toContain("/tweets/search/recent");
    expect(init?.headers?.Authorization).toBe("Bearer test-token");
    expect(init?.method).toBe("GET");
  });

  test("returns parsed JSON on happy-path response", async () => {
    process.env.TWITTER_BEARER_TOKEN = "test-token";

    const payload = {
      data: [
        {
          id: "1",
          text: "Hello World",
          author_id: "42",
          created_at: new Date().toISOString(),
          public_metrics: { like_count: 1, retweet_count: 0, reply_count: 0 },
        },
      ],
      includes: { users: [{ id: "42", name: "Pi", username: "PiCoreTeam" }] },
    };

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as unknown as Response);

    const client = new TwitterClient({ fetchFn: fetchMock });
    const res = await client.searchRecent({ query: "from:PiCoreTeam -is:retweet" });

    expect(res).toEqual(payload);
  });
});
