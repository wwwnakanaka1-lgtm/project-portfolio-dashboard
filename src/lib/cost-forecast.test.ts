import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { forecastMonthlyCost } from "./cost-forecast";

describe("forecastMonthlyCost", () => {
  /** Generate daily activity for the past N days ending today */
  function generateDays(n: number, costFn: (i: number) => number) {
    const now = new Date();
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (n - 1 - i));
      return {
        date: d.toISOString().split("T")[0],
        cost: costFn(i),
        messageCount: 10,
      };
    });
  }

  test("returns low confidence with current cost for empty data", () => {
    const forecast = forecastMonthlyCost([], 50);
    assert.equal(forecast.projectedMonthEnd, 50);
    assert.equal(forecast.confidence, "low");
    assert.equal(forecast.trend, "stable");
    assert.equal(forecast.dailyAverage, 0);
  });

  test("projects forward from constant daily cost", () => {
    const data = generateDays(10, () => 2.0);
    const forecast = forecastMonthlyCost(data, 20);
    assert.ok(forecast.projectedMonthEnd >= 20, "projected should be >= current month cost");
    assert.equal(forecast.trend, "stable");
    assert.ok(Math.abs(forecast.dailyAverage - 2.0) < 0.1);
  });

  test("detects increasing trend", () => {
    const data = generateDays(12, (i) => 1.0 + i * 0.5);
    const forecast = forecastMonthlyCost(data, 30);
    assert.equal(forecast.trend, "increasing");
  });

  test("detects decreasing trend", () => {
    const data = generateDays(12, (i) => 10.0 - i * 0.5);
    const forecast = forecastMonthlyCost(data, 30);
    assert.equal(forecast.trend, "decreasing");
  });

  test("remainingDays is non-negative", () => {
    const data = generateDays(5, () => 1.0);
    const forecast = forecastMonthlyCost(data, 10);
    assert.ok(forecast.remainingDays >= 0);
  });

  test("projected cost is never less than current cost", () => {
    const data = generateDays(14, () => 0.01);
    const forecast = forecastMonthlyCost(data, 100);
    assert.ok(forecast.projectedMonthEnd >= 100);
  });

  test("low confidence for very few data points", () => {
    const data = generateDays(3, () => 5.0);
    const forecast = forecastMonthlyCost(data, 15);
    assert.equal(forecast.confidence, "low");
  });
});
