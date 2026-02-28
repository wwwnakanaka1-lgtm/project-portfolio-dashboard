"use client";

import { useState, useEffect } from "react";
import { getExchangeRate } from "@/lib/exchange-rate";

const FALLBACK_RATE = 150;

/**
 * Custom hook for fetching and caching the USD/JPY exchange rate.
 * Replaces duplicated exchange rate fetching logic in ClaudeMonitor, UsageStats, and ProjectTable.
 */
export function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);
  const [rateSource, setRateSource] = useState<"api" | "fallback">("fallback");

  useEffect(() => {
    let cancelled = false;
    const fetchRate = async () => {
      try {
        const result = await getExchangeRate();
        if (!cancelled) {
          setExchangeRate(result.rate);
          setRateSource(result.source);
        }
      } catch {
        // Keep fallback
      }
    };
    fetchRate();
    return () => {
      cancelled = true;
    };
  }, []);

  return { exchangeRate, rateSource };
}
