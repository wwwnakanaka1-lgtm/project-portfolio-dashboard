import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MODEL_PRICING, getPricing, calculateCost } from "./usage-types";

describe("MODEL_PRICING", () => {
  test("contains all expected model keys", () => {
    const expectedKeys = [
      "claude-opus-4-5-20251101",
      "claude-opus-4-6",
      "claude-sonnet-4-5-20250929",
      "claude-haiku-4-5-20251001",
      "<synthetic>",
    ];
    for (const key of expectedKeys) {
      assert.ok(MODEL_PRICING[key], `missing pricing for ${key}`);
    }
  });

  test("all models have required pricing fields", () => {
    for (const [model, pricing] of Object.entries(MODEL_PRICING)) {
      assert.equal(typeof pricing.input, "number", `${model} missing input`);
      assert.equal(typeof pricing.output, "number", `${model} missing output`);
      assert.equal(typeof pricing.cacheRead, "number", `${model} missing cacheRead`);
      assert.equal(typeof pricing.cacheCreate, "number", `${model} missing cacheCreate`);
    }
  });

  test("synthetic model has zero costs", () => {
    const synthetic = MODEL_PRICING["<synthetic>"];
    assert.equal(synthetic.input, 0);
    assert.equal(synthetic.output, 0);
    assert.equal(synthetic.cacheRead, 0);
    assert.equal(synthetic.cacheCreate, 0);
  });

  test("opus is more expensive than sonnet", () => {
    const opus = MODEL_PRICING["claude-opus-4-5-20251101"];
    const sonnet = MODEL_PRICING["claude-sonnet-4-5-20250929"];
    assert.ok(opus.input > sonnet.input);
    assert.ok(opus.output > sonnet.output);
  });
});

describe("getPricing", () => {
  test("returns exact match for known models", () => {
    const pricing = getPricing("claude-opus-4-6");
    assert.equal(pricing.input, 15);
    assert.equal(pricing.output, 75);
  });

  test("falls back to opus pricing for unknown opus model", () => {
    const pricing = getPricing("claude-opus-999");
    assert.equal(pricing.input, MODEL_PRICING["claude-opus-4-5-20251101"].input);
  });

  test("falls back to haiku pricing for unknown haiku model", () => {
    const pricing = getPricing("claude-haiku-999");
    assert.equal(pricing.input, MODEL_PRICING["claude-haiku-4-5-20251001"].input);
  });

  test("falls back to sonnet pricing for completely unknown model", () => {
    const pricing = getPricing("unknown-model-v1");
    assert.equal(pricing.input, MODEL_PRICING["claude-sonnet-4-5-20250929"].input);
  });
});

describe("calculateCost", () => {
  test("calculates correct cost for opus model", () => {
    const cost = calculateCost(
      { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 0, cacheCreationTokens: 0 },
      "claude-opus-4-5-20251101"
    );
    // 1M input * 15/1M + 100K output * 75/1M = 15 + 7.5 = 22.5
    assert.equal(cost, 22.5);
  });

  test("calculates correct cost with cache tokens", () => {
    const cost = calculateCost(
      { inputTokens: 0, outputTokens: 0, cacheReadTokens: 1_000_000, cacheCreationTokens: 1_000_000 },
      "claude-opus-4-5-20251101"
    );
    // 1M cache read * 1.5/1M + 1M cache create * 18.75/1M = 1.5 + 18.75 = 20.25
    assert.ok(Math.abs(cost - 20.25) < 0.001);
  });

  test("returns zero for zero tokens", () => {
    const cost = calculateCost(
      { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
      "claude-opus-4-5-20251101"
    );
    assert.equal(cost, 0);
  });

  test("defaults to opus pricing when no model specified", () => {
    const cost = calculateCost({
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    });
    assert.equal(cost, 15);
  });

  test("synthetic model costs nothing", () => {
    const cost = calculateCost(
      { inputTokens: 10_000_000, outputTokens: 10_000_000, cacheReadTokens: 10_000_000, cacheCreationTokens: 10_000_000 },
      "<synthetic>"
    );
    assert.equal(cost, 0);
  });
});
