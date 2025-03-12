"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, Users, Globe, Zap } from "lucide-react"

interface NetworkStats {
  activeUsers: number
  totalNodes: number
  blockHeight: number
  transactionsPerSecond: number
  consensusRate: number
}

export default function NetworkStats() {
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Simulate fetching network stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)

      try {
        // In a real app, you would fetch from an API
        await new Promise((resolve) => setTimeout(resolve, 1200))

        // Mock data - replace with actual API call
        const mockStats: NetworkStats = {
          activeUsers: 35000000 + Math.floor(Math.random() * 500000),
          totalNodes: 12000 + Math.floor(Math.random() * 500),
          blockHeight: 1250000 + Math.floor(Math.random() * 1000),
          transactionsPerSecond: 150 + Math.floor(Math.random() * 50),
          consensusRate: 98.5 + Math.random() * 1.5,
        }

        setStats(mockStats)
      } catch (error) {
        console.error("Error fetching network stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Update stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)

    return () => clearInterval(interval)
  }, [])

  const formatNumber = (num: number) => {
    return num >= 1000000
      ? (num / 1000000).toFixed(1) + "M"
      : num >= 1000
        ? (num / 1000).toFixed(1) + "K"
        : num.toString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !stats ? (
          <div className="flex items-center justify-center h-[200px]">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active Users</span>
                </div>
                <span className="text-2xl font-bold">{formatNumber(stats.activeUsers)}</span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Nodes</span>
                </div>
                <span className="text-2xl font-bold">{formatNumber(stats.totalNodes)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Block Height</span>
                <span className="text-sm font-medium">{stats.blockHeight.toLocaleString()}</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span className="text-sm">TPS</span>
                </div>
                <span className="text-sm font-medium">{stats.transactionsPerSecond}</span>
              </div>
              <Progress value={(stats.transactionsPerSecond / 300) * 100} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Consensus Rate</span>
                <span className="text-sm font-medium">{stats.consensusRate.toFixed(1)}%</span>
              </div>
              <Progress value={stats.consensusRate} className="h-2" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

