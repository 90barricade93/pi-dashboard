// API client to handle CoinGecko API requests and key management

// Fallback prices in case the API is unavailable
export const fallbackPrices = {
  USD: 0.00032,
  EUR: 0.00029,
  GBP: 0.00025,
  JPY: 0.048,
  RUB: 0.029,
}

/**
 * Get the CoinGecko API key from environment variables
 * Falls back to demo key if not set (not recommended for production)
 */
export const getCoinGeckoApiKey = (): string => {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY

  if (!apiKey) {
    // Only log this warning during development
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "NEXT_PUBLIC_COINGECKO_API_KEY environment variable is not set. Using fallback demo key. " +
          "This is not recommended for production use.",
      )
    }
    // Return a demo key (limited usage)
    return "CG-mLgtcXJ3Sof8g5thnCCosstx"
  }

  return apiKey
}

/**
 * Fetch current Pi price from CoinGecko
 */
export const fetchPiPrice = async (currency: string): Promise<{ price: number | null; error: string | null }> => {
  try {
    const apiKey = getCoinGeckoApiKey()
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=pi-network-iou&vs_currencies=${currency.toLowerCase()}&include_24hr_change=true&x_cg_demo_api_key=${apiKey}`,
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
        return { price: piData[currencyKey], error: null }
      } else {
        throw new Error(`Price data not available for ${currency}`)
      }
    } else {
      throw new Error("Pi Network price data not found")
    }
  } catch (error) {
    console.error("Error fetching Pi price:", error)
    return {
      price: null,
      error: "Failed to fetch price data. Using fallback data.",
    }
  }
}

/**
 * Fetch historical Pi price data from CoinGecko
 */
export const fetchPiHistoricalData = async (
  currency: string,
  days = 7,
): Promise<{ data: any; error: string | null }> => {
  try {
    const apiKey = getCoinGeckoApiKey()
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/pi-network-iou/market_chart?vs_currency=${currency.toLowerCase()}&days=${days}&x_cg_demo_api_key=${apiKey}`,
    )

    if (!response.ok) {
      throw new Error(`History API request failed with status ${response.status}`)
    }

    const data = await response.json()

    if (data && data.prices && Array.isArray(data.prices)) {
      return { data, error: null }
    } else {
      throw new Error("Historical price data not found")
    }
  } catch (error) {
    console.error("Error fetching historical data:", error)
    return {
      data: null,
      error: "Failed to fetch historical data. Prediction may be less accurate.",
    }
  }
}

