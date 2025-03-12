"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, RefreshCw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrency, type Currency } from "@/contexts/currency-context"

const currencySymbols: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  RUB: "₽",
}

export default function PriceTracker() {
  const { currency, setCurrency } = useCurrency()
  const [price, setPrice] = useState<number | null>(null)
  const [previousPrice, setPreviousPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch Pi price from CoinGecko API
  const getPiPrice = async () => {
    setLoading(true)
    setError(null)

    // Store previous price for comparison
    if (price !== null) {
      setPreviousPrice(price)
    }

    try {
      // CoinGecko API endpoint for Pi Network
      // Note: Pi Network's ID on CoinGecko is "pi-network-iou"
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=pi-network-iou&vs_currencies=${currency.toLowerCase()}&include_24hr_change=true&x_cg_demo_api_key=${process.env.NEXT_PUBLIC_COINGECKO_API_KEY}`,
      )

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = await response.json()

      // Check if we have data for Pi Network
      if (data && data["pi-network-iou"]) {
        const currencyKey = currency.toLowerCase()
        const piData = data["pi-network-iou"]

        if (piData[currencyKey]) {
          setPrice(piData[currencyKey])
          setLastUpdated(new Date())
        } else {
          throw new Error(`Price data not available for ${currency}`)
        }
      } else {
        throw new Error("Pi Network price data not found")
      }
    } catch (error) {
      console.error("Error fetching Pi price:", error)
      setError("Failed to fetch price data. Using fallback data.")

      // Fallback to simulated data if API fails
      const basePrice = 0.00032 // Approximate Pi price in USD as fallback

      // Apply currency conversion (simplified for fallback)
      const rates: Record<Currency, number> = {
        EUR: 0.92,
        USD: 1,
        GBP: 0.79,
        JPY: 150,
        RUB: 92,
      }

      const convertedPrice = basePrice * rates[currency]
      setPrice(convertedPrice)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and setup interval for updates
  useEffect(() => {
    getPiPrice()

    // Update price every 30 seconds
    const interval = setInterval(getPiPrice, 30000)

    return () => clearInterval(interval)
  }, [currency])

  // Calculate price change
  const priceChange = price !== null && previousPrice !== null ? price - previousPrice : null

  const priceChangePercent =
    price !== null && previousPrice !== null && previousPrice !== 0
      ? ((price - previousPrice) / previousPrice) * 100
      : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Pi Price</CardTitle>
        <div className="flex gap-1">
          {Object.keys(currencySymbols).map((curr) => (
            <Button
              key={curr}
              variant={currency === curr ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrency(curr as Currency)}
              className="w-12"
            >
              {currencySymbols[curr as Currency]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-4">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="text-4xl font-bold mb-2">
                {currencySymbols[currency]}
                {price?.toFixed(currency === "JPY" || currency === "RUB" ? 5 : 6)}
              </div>

              {priceChange !== null && (
                <div
                  className={cn(
                    "flex items-center text-sm",
                    priceChange > 0 ? "text-green-500" : priceChange < 0 ? "text-red-500" : "text-gray-500",
                  )}
                >
                  {priceChange > 0 ? (
                    <ArrowUp className="h-4 w-4 mr-1" />
                  ) : priceChange < 0 ? (
                    <ArrowDown className="h-4 w-4 mr-1" />
                  ) : null}
                  <span>
                    {priceChange > 0 ? "+" : ""}
                    {priceChange.toFixed(8)}(
                    {priceChangePercent !== null
                      ? (priceChangePercent > 0 ? "+" : "") + priceChangePercent.toFixed(2)
                      : 0}
                    %)
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-1 text-amber-500 text-xs mt-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{error}</span>
                </div>
              )}

              <div className="text-xs text-muted-foreground mt-4">
                Last updated: {lastUpdated?.toLocaleTimeString()}
              </div>

              <div className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center">
                <span>Powered by</span>
                <a
                  href="https://www.coingecko.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center ml-1 hover:text-foreground transition-colors"
                >
                  CoinGecko
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

