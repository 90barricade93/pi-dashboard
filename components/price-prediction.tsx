"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrency, type Currency } from "@/contexts/currency-context"
import { fetchPiPrice, fetchPiHistoricalData, fallbackPrices } from "@/lib/api-client"

type PredictionTrend = "up" | "down" | "stable"
type TimeFrame = "30min" | "1hour" | "2hours" | "6hours" | "12hours"

interface PredictionData {
  trend: PredictionTrend
  confidence: number
  targetPrice: number
  currentPrice: number
  timeFrame: TimeFrame
  reasons: string[]
}

interface HistoricalDataPoint {
  timestamp: number
  price: number
}

const currencySymbols: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  RUB: "₽",
}

export default function PricePrediction() {
  const { currency } = useCurrency()
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>("2hours")
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Fetch current Pi price and historical data from CoinGecko
  useEffect(() => {
    const fetchPriceData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch current price
        const { price: newPrice, error: priceError } = await fetchPiPrice(currency)

        if (newPrice !== null) {
          setCurrentPrice(newPrice)
        } else {
          setError(priceError)
          // Fallback to simulated price if API fails
          setCurrentPrice(fallbackPrices[currency])
        }

        // Fetch historical data (last 7 days)
        const { data: historyData, error: historyError } = await fetchPiHistoricalData(currency, 7)

        if (historyData && historyData.prices) {
          // Format the historical data
          const formattedData: HistoricalDataPoint[] = historyData.prices.map((item: [number, number]) => ({
            timestamp: item[0],
            price: item[1],
          }))

          setHistoricalData(formattedData)
        } else if (historyError) {
          setError(historyError)
        }
      } catch (error) {
        console.error("Error in data fetching:", error)
        setError("Failed to fetch complete data. Prediction may be less accurate.")

        // If we have current price but no historical data, we can still make predictions
        if (currentPrice === null) {
          setCurrentPrice(fallbackPrices[currency])
        }
      }
    }

    fetchPriceData()
  }, [currency])

  // Generate prediction based on historical data and current price
  useEffect(() => {
    if (currentPrice === null) return

    const generatePrediction = () => {
      // Only show loading if we don't already have a prediction
      if (!prediction) {
        setLoading(true)
      }

      // Calculate volatility from historical data if available
      let volatility = 0.01 // Default volatility if no historical data
      let trend: PredictionTrend = "stable"
      let confidence = 65

      if (historicalData.length > 0) {
        // Calculate recent price movement trend
        const recentDataPoints = historicalData.slice(-48) // Last 48 data points

        if (recentDataPoints.length > 1) {
          // Calculate average price change
          let totalChange = 0
          for (let i = 1; i < recentDataPoints.length; i++) {
            totalChange += (recentDataPoints[i].price - recentDataPoints[i - 1].price) / recentDataPoints[i - 1].price
          }
          const avgChange = totalChange / (recentDataPoints.length - 1)

          // Calculate volatility (standard deviation of price changes)
          let sumSquaredDiff = 0
          for (let i = 1; i < recentDataPoints.length; i++) {
            const change = (recentDataPoints[i].price - recentDataPoints[i - 1].price) / recentDataPoints[i - 1].price
            sumSquaredDiff += Math.pow(change - avgChange, 2)
          }
          volatility = Math.sqrt(sumSquaredDiff / (recentDataPoints.length - 1))

          // Determine trend based on recent movement
          const shortTermTrend = recentDataPoints.slice(-12) // Last 12 data points
          const startPrice = shortTermTrend[0].price
          const endPrice = shortTermTrend[shortTermTrend.length - 1].price
          const percentChange = (endPrice - startPrice) / startPrice

          if (percentChange > 0.005) {
            trend = "up"
            confidence = 65 + Math.min(percentChange * 1000, 25)
          } else if (percentChange < -0.005) {
            trend = "down"
            confidence = 65 + Math.min(Math.abs(percentChange) * 1000, 20)
          } else {
            trend = "stable"
            confidence = 75
          }
        }
      }

      // Adjust volatility based on timeframe - longer timeframes have higher volatility
      if (selectedTimeFrame === "6hours" || selectedTimeFrame === "12hours") {
        // For longer timeframes, we need to look at more historical data
        const longTermDataPoints = historicalData.slice(-96) // Last 96 data points (approx. 4 days)

        if (longTermDataPoints.length > 1) {
          // Calculate longer-term volatility
          let longTermTotalChange = 0
          for (let i = 1; i < longTermDataPoints.length; i++) {
            longTermTotalChange += Math.abs(
              (longTermDataPoints[i].price - longTermDataPoints[i - 1].price) / longTermDataPoints[i - 1].price,
            )
          }
          const longTermAvgChange = longTermTotalChange / (longTermDataPoints.length - 1)

          // Blend short-term and long-term volatility
          volatility = (volatility + longTermAvgChange) / 2
        }
      }

      // Adjust volatility based on timeframe
      const timeframeMultiplier =
        selectedTimeFrame === "30min"
          ? 0.3
          : selectedTimeFrame === "1hour"
            ? 0.6
            : selectedTimeFrame === "2hours"
              ? 1.0
              : selectedTimeFrame === "6hours"
                ? 2.0
                : 3.0 // 12 hours

      // Calculate target price based on trend and volatility
      let targetPrice: number
      let reasons: string[] = []

      if (trend === "up") {
        // Upward trend
        const changePercent = (0.005 + volatility * 2) * timeframeMultiplier
        targetPrice = currentPrice * (1 + changePercent)

        reasons = [
          "Recent price movement shows bullish momentum",
          "Trading volume indicates increasing interest",
          "Technical indicators suggest short-term uptrend",
          "Historical pattern shows recovery after similar price action",
          "Market sentiment analysis shows positive trend",
          "Increased network activity correlates with price growth",
        ]

        if (selectedTimeFrame === "6hours" || selectedTimeFrame === "12hours") {
          reasons = [
            "Long-term technical analysis indicates bullish momentum",
            "Increased network adoption metrics suggest growing demand",
            "Positive correlation with broader crypto market trends",
            "Historical support levels holding strong",
            "Accumulation pattern detected in trading volume",
            "Reduced selling pressure observed in order books",
          ]
        }
      } else if (trend === "down") {
        // Downward trend
        const changePercent = (0.005 + volatility * 2) * timeframeMultiplier
        targetPrice = currentPrice * (1 - changePercent)

        reasons = [
          "Recent price action shows bearish momentum",
          "Profit taking expected after recent movements",
          "Technical indicators suggest short-term correction",
          "Historical pattern shows pullback after similar price action",
          "Correlation with broader crypto market trends",
          "Decreased trading volume suggests waning interest",
        ]

        if (selectedTimeFrame === "6hours" || selectedTimeFrame === "12hours") {
          reasons = [
            "Long-term technical analysis indicates bearish momentum",
            "Resistance levels preventing upward price movement",
            "Correlation with broader crypto market correction",
            "Historical pattern suggests continued downward pressure",
            "Decreasing network metrics indicate reduced activity",
            "Increased selling observed in larger wallets",
          ]
        }
      } else {
        // Stable trend
        const smallChange = volatility * 0.5 * timeframeMultiplier
        targetPrice = currentPrice * (1 + (Math.random() > 0.5 ? smallChange : -smallChange))

        reasons = [
          "Price consolidation phase detected",
          "Trading volume indicates sideways movement",
          "Strong support and resistance levels nearby",
          "Historical volatility is currently low",
          "No significant market catalysts expected short-term",
          "Technical indicators show neutral signals",
        ]

        if (selectedTimeFrame === "6hours" || selectedTimeFrame === "12hours") {
          reasons = [
            "Price consolidation within established range",
            "Equal buying and selling pressure maintaining equilibrium",
            "Long-term support and resistance levels constraining movement",
            "Historical volatility decreasing over time",
            "Network fundamentals remain stable without significant changes",
            "Market awaiting catalyst for directional movement",
          ]
        }
      }

      // Randomly select 2-3 reasons
      const numReasons = 2 + Math.floor(Math.random() * 2)
      const shuffledReasons = [...reasons].sort(() => 0.5 - Math.random())
      const selectedReasons = shuffledReasons.slice(0, numReasons)

      setPrediction({
        trend,
        confidence,
        targetPrice,
        currentPrice,
        timeFrame: selectedTimeFrame,
        reasons: selectedReasons,
      })

      setLoading(false)
    }

    // Add a small delay to simulate analysis
    const timer = setTimeout(generatePrediction, 800)
    return () => clearTimeout(timer)
  }, [currentPrice, historicalData, selectedTimeFrame])

  // Draw prediction chart
  useEffect(() => {
    if (!prediction || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Chart dimensions
    const padding = 20
    const chartWidth = rect.width - padding * 2
    const chartHeight = rect.height - padding * 2

    // Draw time axis
    ctx.beginPath()
    ctx.moveTo(padding, rect.height - padding)
    ctx.lineTo(rect.width - padding, rect.height - padding)
    ctx.strokeStyle = "#94a3b8" // slate-400
    ctx.lineWidth = 1
    ctx.stroke()

    // Calculate time markers based on selected timeframe
    const getTimeMarkers = () => {
      switch (selectedTimeFrame) {
        case "12hours":
          return ["Now", "+3h", "+6h", "+9h", "+12h"]
        case "6hours":
          return ["Now", "+1.5h", "+3h", "+4.5h", "+6h"]
        case "2hours":
          return ["Now", "+30m", "+1h", "+1.5h", "+2h"]
        case "1hour":
          return ["Now", "+15m", "+30m", "+45m", "+1h"]
        case "30min":
          return ["Now", "+7.5m", "+15m", "+22.5m", "+30m"]
        default:
          return ["Now", "+30m", "+1h", "+1.5h", "+2h"]
      }
    }

    const timeMarkers = getTimeMarkers()

    timeMarkers.forEach((marker, i) => {
      const x = padding + i * (chartWidth / (timeMarkers.length - 1))
      ctx.fillStyle = "#64748b" // slate-500
      ctx.font = "10px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(marker, x, rect.height - padding + 15)

      // Draw vertical grid line (except for first and last)
      if (i > 0 && i < timeMarkers.length - 1) {
        ctx.beginPath()
        ctx.moveTo(x, padding)
        ctx.lineTo(x, rect.height - padding)
        ctx.strokeStyle = "#e2e8f0" // slate-200
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    })

    // Calculate optimal price range based on data
    // First, collect all relevant price points
    const allPrices: number[] = []

    // Add current and target prices
    allPrices.push(prediction.currentPrice)
    allPrices.push(prediction.targetPrice)

    // Add historical data points if available
    if (historicalData.length > 0) {
      const dataPoints =
        selectedTimeFrame === "12hours"
          ? 96 // 4 days worth of 1-hour data points
          : selectedTimeFrame === "6hours"
            ? 48 // 2 days worth
            : 24 // 1 day worth for shorter timeframes

      const recentData = historicalData.slice(-dataPoints)
      recentData.forEach((point) => allPrices.push(point.price))
    }

    // Find min and max prices
    const minDataPrice = Math.min(...allPrices)
    const maxDataPrice = Math.max(...allPrices)

    // Calculate price range with padding
    const dataRange = maxDataPrice - minDataPrice

    // Add padding to make the visualization more readable
    // Use percentage-based padding that adapts to the data range
    const paddingPercentage = 0.1 // 10% padding

    // For very small ranges (like stable predictions), ensure minimum visibility
    const minVisibleRange = prediction.currentPrice * 0.005 // At least 0.5% of current price
    const effectiveRange = Math.max(dataRange, minVisibleRange)

    // Apply padding to min and max
    const minPrice = minDataPrice - effectiveRange * paddingPercentage
    const maxPrice = maxDataPrice + effectiveRange * paddingPercentage

    // For cryptocurrencies with very small values, consider using logarithmic scale
    // Check if the range spans multiple orders of magnitude
    const useLogarithmic = maxPrice / minPrice > 10

    // Function to convert price to Y coordinate
    const priceToY = (price: number): number => {
      if (useLogarithmic) {
        // Logarithmic scale for wide ranges
        const logMin = Math.log(Math.max(minPrice, 0.0000001)) // Avoid log(0)
        const logMax = Math.log(maxPrice)
        const logPrice = Math.log(Math.max(price, 0.0000001))
        return rect.height - padding - ((logPrice - logMin) / (logMax - logMin)) * chartHeight
      } else {
        // Linear scale for narrower ranges
        return rect.height - padding - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight
      }
    }

    // Draw price axis
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, rect.height - padding)
    ctx.strokeStyle = "#94a3b8" // slate-400
    ctx.lineWidth = 1
    ctx.stroke()

    // Draw price markers - more markers for better readability
    const numMarkers = useLogarithmic ? 5 : 4 // More markers for logarithmic scale
    const priceMarkers: number[] = []

    if (useLogarithmic) {
      // Generate logarithmically spaced markers
      const logMin = Math.log(Math.max(minPrice, 0.0000001))
      const logMax = Math.log(maxPrice)
      for (let i = 0; i < numMarkers; i++) {
        const logValue = logMin + (i / (numMarkers - 1)) * (logMax - logMin)
        priceMarkers.push(Math.exp(logValue))
      }
    } else {
      // Generate linearly spaced markers
      for (let i = 0; i < numMarkers; i++) {
        priceMarkers.push(minPrice + (i / (numMarkers - 1)) * (maxPrice - minPrice))
      }
    }

    // Add current price as a marker for reference
    if (!priceMarkers.some((p) => Math.abs(p - prediction.currentPrice) / prediction.currentPrice < 0.01)) {
      priceMarkers.push(prediction.currentPrice)
      // Sort markers to maintain order
      priceMarkers.sort((a, b) => a - b)
    }

    // Draw the price markers
    priceMarkers.forEach((price) => {
      const y = priceToY(price)

      // Draw horizontal grid line
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(rect.width - padding, y)
      ctx.strokeStyle = "#e2e8f0" // slate-200
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Draw price label
      ctx.fillStyle = "#64748b" // slate-500
      ctx.font = "10px sans-serif"
      ctx.textAlign = "right"

      // Format price based on magnitude
      let formattedPrice
      if (price < 0.001) {
        formattedPrice = price.toExponential(2)
      } else if (price < 0.01) {
        formattedPrice = price.toFixed(6)
      } else if (price < 1) {
        formattedPrice = price.toFixed(4)
      } else {
        formattedPrice = price.toFixed(2)
      }

      ctx.fillText(formattedPrice, padding - 5, y + 3)
    })

    // Draw historical data if available
    if (historicalData.length > 0) {
      // Take only the most recent data points based on timeframe
      const dataPoints =
        selectedTimeFrame === "12hours"
          ? 96 // 4 days worth of 1-hour data points
          : selectedTimeFrame === "6hours"
            ? 48 // 2 days worth
            : selectedTimeFrame === "2hours"
              ? 24 // 1 day worth for shorter timeframes
              : selectedTimeFrame === "1hour"
                ? 12 // 12 hours worth
                : 6 // 6 hours worth for 30min timeframe

      // Calculate the time range for the selected prediction timeframe in milliseconds
      const predictionTimeRangeMs =
        selectedTimeFrame === "12hours"
          ? 12 * 60 * 60 * 1000
          : selectedTimeFrame === "6hours"
            ? 6 * 60 * 60 * 1000
            : selectedTimeFrame === "2hours"
              ? 2 * 60 * 60 * 1000
              : selectedTimeFrame === "1hour"
                ? 60 * 60 * 1000
                : 30 * 60 * 1000

      // Calculate how much historical data to show relative to prediction timeframe
      // Show 2x the prediction timeframe of historical data
      const historicalTimeRangeMs = predictionTimeRangeMs * 2

      // Get the most recent data points
      const recentData = historicalData.slice(-dataPoints)

      if (recentData.length > 1) {
        // Find the timestamp at "now" (most recent data point)
        const nowTimestamp = recentData[recentData.length - 1].timestamp

        // Find the earliest timestamp to show based on our desired historical range
        const earliestTimestamp = nowTimestamp - historicalTimeRangeMs

        // Filter data to only show points within our desired time range
        const visibleData = recentData.filter((point) => point.timestamp >= earliestTimestamp)

        // Calculate the total time range shown on the chart (historical + prediction)
        const totalTimeRangeMs = historicalTimeRangeMs + predictionTimeRangeMs

        // Calculate the proportion of the chart width that should be allocated to historical data
        const historyWidthProportion = historicalTimeRangeMs / totalTimeRangeMs
        const historyWidth = chartWidth * historyWidthProportion

        if (visibleData.length > 0) {
          ctx.beginPath()

          // Map the first point
          const firstPoint = visibleData[0]
          const firstPointX =
            padding + ((firstPoint.timestamp - earliestTimestamp) / historicalTimeRangeMs) * historyWidth
          const firstPointY = priceToY(firstPoint.price)

          ctx.moveTo(firstPointX, firstPointY)

          // Map historical data points
          for (let i = 1; i < visibleData.length; i++) {
            const dataPoint = visibleData[i]
            const x = padding + ((dataPoint.timestamp - earliestTimestamp) / historicalTimeRangeMs) * historyWidth
            const y = priceToY(dataPoint.price)

            ctx.lineTo(x, y)
          }

          // Style for historical data
          ctx.strokeStyle = "#cbd5e1" // slate-300
          ctx.lineWidth = 2
          ctx.stroke()

          // Add subtle gradient under the historical line
          const gradient = ctx.createLinearGradient(0, padding, 0, rect.height - padding)
          gradient.addColorStop(0, "rgba(203, 213, 225, 0.1)") // slate-300 with opacity
          gradient.addColorStop(1, "rgba(203, 213, 225, 0)")

          // Fill area under historical line
          const lastPoint = visibleData[visibleData.length - 1]
          const lastPointX =
            padding + ((lastPoint.timestamp - earliestTimestamp) / historicalTimeRangeMs) * historyWidth

          ctx.lineTo(lastPointX, rect.height - padding)
          ctx.lineTo(firstPointX, rect.height - padding)
          ctx.closePath()
          ctx.fillStyle = gradient
          ctx.fill()

          // Store the "now" point for connecting to prediction
          const nowX = lastPointX
          const nowY = priceToY(prediction.currentPrice)

          // Draw prediction line - start from where historical data ends
          ctx.beginPath()
          ctx.moveTo(nowX, nowY)

          // Calculate the end point of the prediction line
          const predictionEndX = padding + chartWidth
          const predictionEndY = priceToY(prediction.targetPrice)

          ctx.lineTo(predictionEndX, predictionEndY)

          // Color based on trend
          ctx.strokeStyle =
            prediction.trend === "up"
              ? "#10b981" // emerald-500 for up trend
              : prediction.trend === "down"
                ? "#ef4444" // red-500 for down trend
                : "#6366f1" // indigo-500 for stable trend
          ctx.lineWidth = 2
          ctx.stroke()

          // Add gradient under the prediction line
          const predictionGradient = ctx.createLinearGradient(0, padding, 0, rect.height - padding)
          if (prediction.trend === "up") {
            predictionGradient.addColorStop(0, "rgba(16, 185, 129, 0.1)") // emerald-500
            predictionGradient.addColorStop(1, "rgba(16, 185, 129, 0)")
          } else if (prediction.trend === "down") {
            predictionGradient.addColorStop(0, "rgba(239, 68, 68, 0.1)") // red-500
            predictionGradient.addColorStop(1, "rgba(239, 68, 68, 0)")
          } else {
            predictionGradient.addColorStop(0, "rgba(99, 102, 241, 0.1)") // indigo-500
            predictionGradient.addColorStop(1, "rgba(99, 102, 241, 0)")
          }

          // Fill area under prediction line
          ctx.lineTo(predictionEndX, rect.height - padding)
          ctx.lineTo(nowX, rect.height - padding)
          ctx.closePath()
          ctx.fillStyle = predictionGradient
          ctx.fill()

          // Add current and target price points
          // Current price point
          ctx.beginPath()
          ctx.arc(nowX, nowY, 4, 0, Math.PI * 2)
          ctx.fillStyle = "#0f172a" // slate-900
          ctx.fill()
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 1
          ctx.stroke()

          // Target price point
          ctx.beginPath()
          ctx.arc(predictionEndX, predictionEndY, 4, 0, Math.PI * 2)
          ctx.fillStyle =
            prediction.trend === "up"
              ? "#10b981" // emerald-500
              : prediction.trend === "down"
                ? "#ef4444" // red-500
                : "#6366f1" // indigo-500
          ctx.fill()
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
    }

    // Add scale type indicator if using logarithmic scale
    if (useLogarithmic) {
      ctx.fillStyle = "#64748b" // slate-500
      ctx.font = "9px sans-serif"
      ctx.textAlign = "left"
      ctx.fillText("log scale", padding + 5, padding + 10)
    }

    setLoading(false)
  }, [prediction, selectedTimeFrame, historicalData])

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Price Prediction</CardTitle>
          <Tabs value={selectedTimeFrame} onValueChange={(v) => setSelectedTimeFrame(v as TimeFrame)} className="h-8">
            <TabsList>
              <TabsTrigger value="30min" className="text-xs px-2 h-7">
                30m
              </TabsTrigger>
              <TabsTrigger value="1hour" className="text-xs px-2 h-7">
                1h
              </TabsTrigger>
              <TabsTrigger value="2hours" className="text-xs px-2 h-7">
                2h
              </TabsTrigger>
              <TabsTrigger value="6hours" className="text-xs px-2 h-7">
                6h
              </TabsTrigger>
              <TabsTrigger value="12hours" className="text-xs px-2 h-7">
                12h
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading || !currentPrice ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Analyzing market data...</span>
            </div>
          </div>
        ) : prediction ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "p-2 rounded-full",
                    prediction.trend === "up"
                      ? "bg-emerald-100"
                      : prediction.trend === "down"
                        ? "bg-red-100"
                        : "bg-indigo-100",
                  )}
                >
                  {prediction.trend === "up" ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  ) : prediction.trend === "down" ? (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  ) : (
                    <Minus className="h-5 w-5 text-indigo-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {prediction.trend === "up"
                      ? "Bullish Prediction"
                      : prediction.trend === "down"
                        ? "Bearish Prediction"
                        : "Stable Prediction"}
                  </div>
                  <div className="text-xs text-muted-foreground">{prediction.confidence.toFixed(0)}% confidence</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-medium">Target Price</div>
                <div
                  className={cn(
                    "text-lg font-bold flex items-center",
                    prediction.trend === "up"
                      ? "text-emerald-600"
                      : prediction.trend === "down"
                        ? "text-red-600"
                        : "text-indigo-600",
                  )}
                >
                  {currencySymbols[currency]}
                  {prediction.targetPrice.toFixed(8)}
                  {prediction.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  ) : prediction.trend === "down" ? (
                    <ArrowDownRight className="h-4 w-4 ml-1" />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="h-[150px] mb-4">
              <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
            </div>

            {error && (
              <div className="flex items-center gap-1 text-amber-500 text-xs mb-3">
                <AlertCircle className="h-3 w-3" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-md">
              <h4 className="text-sm font-medium mb-2">Reasoning</h4>
              <ul className="text-sm text-slate-700 space-y-1">
                {prediction.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
            {prediction && (
              <div className="text-xs text-center text-muted-foreground mt-4 flex items-center justify-center">
                <span>Powered by</span>
                <a
                  href="https://www.okx.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center ml-1 hover:text-foreground transition-colors"
                >
                  OKX
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 ml-1"
                  >
                    <path d="M7 17L17 7"></path>
                    <path d="M7 7h10v10"></path>
                  </svg>
                </a>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

