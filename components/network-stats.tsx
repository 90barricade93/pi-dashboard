'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { logger } from '@/lib/logger';
import { formatCompactNumber } from '@/lib/format-helpers';
import { NETWORK_STATS_POLL_INTERVAL_MS } from '@/lib/constants';
// Removed lucide-react import

interface NetworkStatsData {
  activeUsers: number;
  totalNodes: number;
  blockHeight: number;
  transactionsPerSecond: number;
  consensusRate: number;
}

export default function NetworkStats() {
  const [stats, setStats] = useState<NetworkStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulate fetching network stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      try {
        // In a real app, you would fetch from an API
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Mock data - replace with actual API call
        const mockStats: NetworkStatsData = {
          activeUsers: 35000000 + Math.floor(Math.random() * 500000),
          totalNodes: 12000 + Math.floor(Math.random() * 500),
          blockHeight: 1250000 + Math.floor(Math.random() * 1000),
          transactionsPerSecond: 150 + Math.floor(Math.random() * 50),
          consensusRate: 98.5 + Math.random() * 1.5,
        };

        setStats(mockStats);
      } catch (error) {
        logger.error('network_stats_fetch_failed', { error: String(error) });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    const interval = setInterval(fetchStats, NETWORK_STATS_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !stats ? (
          <div className="flex h-[200px] items-center justify-center">
            <span className="animate-spin text-4xl">🔄</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">👥</span>
                  <span className="text-sm font-medium">Active Users</span>
                </div>
                <span className="text-2xl font-bold">{formatCompactNumber(stats.activeUsers)}</span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">🌐</span>
                  <span className="text-sm font-medium">Total Nodes</span>
                </div>
                <span className="text-2xl font-bold">{formatCompactNumber(stats.totalNodes)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Block Height</span>
                <span className="text-sm font-medium">{stats.blockHeight.toLocaleString()}</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">⚡</span>
                  <span className="text-sm">TPS</span>
                </div>
                <span className="text-sm font-medium">{stats.transactionsPerSecond}</span>
              </div>
              <Progress value={(stats.transactionsPerSecond / 300) * 100} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Consensus Rate</span>
                <span className="text-sm font-medium">{stats.consensusRate.toFixed(1)}%</span>
              </div>
              <Progress value={stats.consensusRate} className="h-2" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
