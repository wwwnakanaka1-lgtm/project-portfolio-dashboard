// USD to JPY exchange rate utilities
// Uses free API (no API key required)

const EXCHANGE_RATE_API = "https://open.er-api.com/v6/latest/USD";
const FALLBACK_RATE = 150; // Fallback rate if API fails
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
  source: "api" | "fallback";
}

let cachedRate: ExchangeRateCache | null = null;

/**
 * Fetch current USD/JPY exchange rate from API
 * Returns cached value if still valid
 */
export async function getExchangeRate(): Promise<ExchangeRateCache> {
  // Return cached rate if still valid
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
    return cachedRate;
  }

  try {
    const response = await fetch(EXCHANGE_RATE_API, {
      next: { revalidate: CACHE_DURATION / 1000 }, // Next.js cache
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const rate = data.rates?.JPY;

    if (typeof rate !== "number" || rate <= 0) {
      throw new Error("Invalid rate received");
    }

    cachedRate = {
      rate: Math.round(rate * 100) / 100, // Round to 2 decimal places
      timestamp: Date.now(),
      source: "api",
    };

    return cachedRate;
  } catch (error) {
    console.warn("Failed to fetch exchange rate, using fallback:", error);

    // Use fallback rate
    cachedRate = {
      rate: FALLBACK_RATE,
      timestamp: Date.now(),
      source: "fallback",
    };

    return cachedRate;
  }
}

/**
 * Get exchange rate synchronously (returns cached or fallback)
 * Use this when async is not available
 */
export function getExchangeRateSync(): ExchangeRateCache {
  if (cachedRate) {
    return cachedRate;
  }

  return {
    rate: FALLBACK_RATE,
    timestamp: Date.now(),
    source: "fallback",
  };
}

/**
 * Format USD to JPY
 */
export function formatJPY(usd: number, rate: number): string {
  const jpy = Math.round(usd * rate);
  return `¥${jpy.toLocaleString()}`;
}

/**
 * Format USD amount
 */
export function formatUSD(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

/**
 * Format both currencies
 */
export function formatBothCurrencies(usd: number, rate: number): string {
  return `${formatUSD(usd)} (${formatJPY(usd, rate)})`;
}
