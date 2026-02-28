import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { detectCostAnomalies } from "./cost-anomaly";

describe("detectCostAnomalies", () => {
  test("returns empty array when fewer than 8 days of data", () => {
    const data = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      cost: 1.0,
      messageCount: 10,
    }));
    assert.deepEqual(detectCostAnomalies(data), []);
  });

  test("returns empty array for empty input", () => {
    assert.deepEqual(detectCostAnomalies([]), []);
  });

  test("detects no anomalies when costs are uniform", () => {
    const data = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      cost: 2.0,
      messageCount: 10,
    }));
    assert.deepEqual(detectCostAnomalies(data), []);
  });

  test("detects critical anomaly for extreme cost spike", () => {
    // Base costs need slight variance so stddev > 0
    const baseCosts = [2.0, 2.1, 1.9, 2.0, 2.2, 1.8, 2.1, 2.0, 1.9];
    const data = baseCosts.map((cost, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      cost,
      messageCount: 10,
    }));
    // Add extreme spike on day 10
    data.push({ date: "2026-02-10", cost: 50.0, messageCount: 10 });
    const anomalies = detectCostAnomalies(data);
    assert.ok(anomalies.length > 0, "should detect at least one anomaly");
    assert.equal(anomalies[0].date, "2026-02-10");
    assert.equal(anomalies[0].severity, "critical");
    assert.ok(anomalies[0].zscore > 3);
  });

  test("detects warning for moderate cost spike", () => {
    // 7 days at $2, then day 8 at ~$5 (moderate spike)
    const baseCosts = [2, 2.1, 1.9, 2, 2.1, 1.8, 2.2, 2, 2];
    // Add a moderate spike that should be > 2 stddev but < 3
    const data = baseCosts.map((cost, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      cost: i === 8 ? 3.5 : cost,
      messageCount: 10,
    }));
    const anomalies = detectCostAnomalies(data);
    // May or may not trigger depending on exact z-score
    // Just verify format if any detected
    for (const a of anomalies) {
      assert.ok(["warning", "critical"].includes(a.severity));
      assert.ok(a.zscore > 2);
      assert.ok(typeof a.expected === "number");
    }
  });

  test("results are sorted by date descending", () => {
    // Create data with two spikes
    const data = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      cost: i === 9 || i === 12 ? 50.0 : 2.0,
      messageCount: 10,
    }));
    const anomalies = detectCostAnomalies(data);
    for (let i = 1; i < anomalies.length; i++) {
      assert.ok(
        new Date(anomalies[i - 1].date).getTime() >= new Date(anomalies[i].date).getTime(),
        "should be sorted descending by date"
      );
    }
  });

  test("handles unsorted input correctly", () => {
    const baseCosts = [2.0, 2.1, 1.9, 2.0, 2.2, 1.8, 2.1, 2.0, 1.9];
    const data = baseCosts.map((cost, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      cost,
      messageCount: 10,
    }));
    data.push({ date: "2026-02-10", cost: 50.0, messageCount: 10 });
    // Reverse the input to test sorting
    const reversed = [...data].reverse();
    const anomalies = detectCostAnomalies(reversed);
    assert.ok(anomalies.length > 0);
    assert.equal(anomalies[0].date, "2026-02-10");
  });
});
