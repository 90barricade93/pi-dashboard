import type { RecentSearchResponse, Tweet, User } from './twitter-client';
import type { NewsItem } from './news-mock-data';

export function processTweets(twitterData: RecentSearchResponse): NewsItem[] {
  const twitterNews: NewsItem[] = [];

  if (!twitterData.data || !twitterData.includes?.users) {
    return twitterNews;
  }

  // Map user IDs to user objects for quick lookup
  const usersMap = twitterData.includes.users.reduce(
    (acc: Record<string, User>, user: User) => {
      if (user && typeof user.id === 'string') {
        acc[user.id] = user;
      }
      return acc;
    },
    {} as Record<string, User>
  );

  twitterData.data.forEach((tweet: Tweet) => {
    if (!tweet.author_id) return;
    const author = usersMap[tweet.author_id];
    if (!author) return;

    const tweetUrl = `https://twitter.com/${author.username}/status/${tweet.id}`;
    const cleanText = tweet.text;

    const pm = tweet.public_metrics;
    const metrics: NewsItem['metrics'] | undefined = pm
      ? {
          ...(pm.like_count !== undefined ? { likes: pm.like_count } : {}),
          ...(pm.retweet_count !== undefined ? { retweets: pm.retweet_count } : {}),
          ...(pm.reply_count !== undefined ? { replies: pm.reply_count } : {}),
        }
      : undefined;

    twitterNews.push({
      id: tweet.id,
      title: `${author.name} (@${author.username})`,
      summary: cleanText,
      source: 'X (Twitter)',
      url: tweetUrl,
      publishedAt: tweet.created_at ?? new Date().toISOString(),
      category: 'twitter',
      author: {
        name: author.name,
        ...(author.username ? { username: author.username } : {}),
        ...(author.profile_image_url ? { profileImageUrl: author.profile_image_url } : {}),
      },
      ...(metrics ? { metrics } : {}),
    });
  });

  return twitterNews;
}
