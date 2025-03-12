"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useCurrency, type Currency } from "@/contexts/currency-context"
import { fetchPiPrice, fallbackPrices } from "@/lib/api-client"

const currencySymbols: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  RUB: "₽",
}

// Utility functie voor consistente number formatting
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(value)
}

export default function PiCalculator() {
  const { currency } = useCurrency()
  const [piAmount, setPiAmount] = useState<string>("1000")
  const [piPrice, setPiPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch current Pi price
  useEffect(() => {
    const getPiPrice = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch current price
        const { price: newPrice, error: priceError } = await fetchPiPrice(currency)

        if (newPrice !== null) {
          setPiPrice(newPrice)
        } else {
          setError(priceError)
          // Fallback to simulated price if API fails
          setPiPrice(fallbackPrices[currency])
        }
      } catch (error) {
        console.error("Error fetching Pi price:", error)
        setError("Failed to fetch price data. Using fallback data.")
        setPiPrice(fallbackPrices[currency])
      } finally {
        setLoading(false)
      }
    }

    getPiPrice()
  }, [currency])

  // Calculate value based on amount and price
  const calculateValue = () => {
    if (piPrice === null) return "0"

    const amount = Number.parseFloat(piAmount) || 0
    const value = amount * piPrice

    // Format based on currency and value size
    if (value < 0.01) {
      return value.toFixed(8)
    } else if (value < 1) {
      return value.toFixed(4)
    } else if (value < 1000) {
      return value.toFixed(2)
    } else {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }
  }

  // Handle input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setPiAmount(value)
    }
  }

  // Preset amount buttons
  const presetAmounts = [100, 1000, 10000, 100000]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pi Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pi-amount">Pi Amount</Label>
            <Input
              id="pi-amount"
              type="text"
              value={piAmount}
              onChange={handleAmountChange}
              placeholder="Enter Pi amount"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {presetAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setPiAmount(amount.toString())}
                className="flex-1"
              >
                {formatNumber(amount)}
              </Button>
            ))}
          </div>

          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-1">Estimated Value</div>
            <div className="text-3xl font-bold">
              {loading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                <>
                  {currencySymbols[currency]}
                  {calculateValue()}
                </>
              )}
            </div>
            {error && <div className="text-amber-500 text-xs mt-1">{error}</div>}
          </div>

          <div className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center">
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
        </div>
      </CardContent>
    </Card>
  )
}

