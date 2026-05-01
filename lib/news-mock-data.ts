export interface NewsItem {
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

export function getMockNewsItems(): NewsItem[] {
  return [
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
}
