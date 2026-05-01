import { processTweets } from '../lib/process-tweets';
import type { RecentSearchResponse } from '../lib/twitter-client';

describe('processTweets', () => {
  it('returns empty array when data is missing', () => {
    expect(processTweets({})).toEqual([]);
  });

  it('returns empty array when includes.users is missing', () => {
    const input: RecentSearchResponse = {
      data: [{ id: '1', text: 'hello', author_id: 'u1' }],
    };
    expect(processTweets(input)).toEqual([]);
  });

  it('skips tweets without an author_id', () => {
    const input: RecentSearchResponse = {
      data: [{ id: '1', text: 'no author' }],
      includes: { users: [{ id: 'u1', name: 'Alice', username: 'alice' }] },
    };
    expect(processTweets(input)).toEqual([]);
  });

  it('skips tweets whose author is not in the users map', () => {
    const input: RecentSearchResponse = {
      data: [{ id: '1', text: 'orphan', author_id: 'u-missing' }],
      includes: { users: [{ id: 'u1', name: 'Alice', username: 'alice' }] },
    };
    expect(processTweets(input)).toEqual([]);
  });

  it('builds NewsItem with author, url, and metrics', () => {
    const input: RecentSearchResponse = {
      data: [
        {
          id: '42',
          text: 'Hello Pi',
          author_id: 'u1',
          created_at: '2025-01-01T00:00:00Z',
          public_metrics: { like_count: 5, retweet_count: 2, reply_count: 1, quote_count: 0 },
        },
      ],
      includes: {
        users: [
          {
            id: 'u1',
            name: 'Pi Core Team',
            username: 'PiCoreTeam',
            profile_image_url: 'https://example.com/pi.jpg',
          },
        ],
      },
    };

    const [item] = processTweets(input);
    expect(item.id).toBe('42');
    expect(item.title).toBe('Pi Core Team (@PiCoreTeam)');
    expect(item.summary).toBe('Hello Pi');
    expect(item.source).toBe('X (Twitter)');
    expect(item.url).toBe('https://twitter.com/PiCoreTeam/status/42');
    expect(item.publishedAt).toBe('2025-01-01T00:00:00Z');
    expect(item.category).toBe('twitter');
    expect(item.author).toEqual({
      name: 'Pi Core Team',
      username: 'PiCoreTeam',
      profileImageUrl: 'https://example.com/pi.jpg',
    });
    expect(item.metrics).toEqual({ likes: 5, retweets: 2, replies: 1 });
  });

  it('omits metrics when public_metrics is missing', () => {
    const input: RecentSearchResponse = {
      data: [{ id: '1', text: 'no metrics', author_id: 'u1' }],
      includes: { users: [{ id: 'u1', name: 'Alice', username: 'alice' }] },
    };
    const [item] = processTweets(input);
    expect(item.metrics).toBeUndefined();
  });
});
