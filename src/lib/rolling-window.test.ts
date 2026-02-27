import test from "node:test";
import assert from "node:assert/strict";
import { buildRollingWindowTimeline, calculateRollingWindowFromMessageTimestamps } from "./rolling-window";

test("returns empty usage when there are no messages", () => {
  const nowMs = Date.parse("2026-02-14T18:00:00.000Z");
  const result = calculateRollingWindowFromMessageTimestamps([], nowMs, 5 * 60 * 60 * 1000);
  assert.equal(result.hasActiveWindow, false);
  assert.equal(result.usedMessages, 0);
  assert.equal(result.resetMs, 0);
});

test("keeps messages in same 5h window", () => {
  const nowMs = Date.parse("2026-02-14T16:00:00.000Z");
  const timestamps = [
    Date.parse("2026-02-14T13:00:00.000Z"),
    Date.parse("2026-02-14T14:30:00.000Z"),
    Date.parse("2026-02-14T15:45:00.000Z"),
  ];
  const result = calculateRollingWindowFromMessageTimestamps(timestamps, nowMs, 5 * 60 * 60 * 1000);
  assert.equal(result.hasActiveWindow, true);
  assert.equal(result.usedMessages, 3);
  assert.equal(result.windowStartMs, Date.parse("2026-02-14T13:00:00.000Z"));
  assert.equal(result.windowEndMs, Date.parse("2026-02-14T18:00:00.000Z"));
  assert.equal(result.resetMs, 2 * 60 * 60 * 1000);
});

test("starts next window at first message after reset boundary", () => {
  const nowMs = Date.parse("2026-02-14T21:00:00.000Z");
  const timestamps = [
    Date.parse("2026-02-14T10:00:00.000Z"),
    Date.parse("2026-02-14T10:30:00.000Z"),
    Date.parse("2026-02-14T15:00:00.000Z"),
    Date.parse("2026-02-14T20:10:00.000Z"),
  ];
  const result = calculateRollingWindowFromMessageTimestamps(timestamps, nowMs, 5 * 60 * 60 * 1000);
  assert.equal(result.hasActiveWindow, true);
  assert.equal(result.usedMessages, 1);
  assert.equal(result.windowStartMs, Date.parse("2026-02-14T20:10:00.000Z"));
  assert.equal(result.windowEndMs, Date.parse("2026-02-15T01:10:00.000Z"));
});

test("auto resets after 5h with no new message", () => {
  const nowMs = Date.parse("2026-02-14T21:00:00.000Z");
  const timestamps = [
    Date.parse("2026-02-14T15:30:00.000Z"),
  ];
  const result = calculateRollingWindowFromMessageTimestamps(timestamps, nowMs, 5 * 60 * 60 * 1000);
  assert.equal(result.hasActiveWindow, false);
  assert.equal(result.usedMessages, 0);
  assert.equal(result.resetMs, 0);
});

test("buildRollingWindowTimeline returns recent windows", () => {
  const nowMs = Date.parse("2026-02-15T03:00:00.000Z");
  const timestamps = [
    Date.parse("2026-02-14T10:00:00.000Z"),
    Date.parse("2026-02-14T10:15:00.000Z"),
    Date.parse("2026-02-14T15:30:00.000Z"),
    Date.parse("2026-02-14T21:00:00.000Z"),
    Date.parse("2026-02-15T01:00:00.000Z"),
  ];
  const timeline = buildRollingWindowTimeline(timestamps, nowMs, 5 * 60 * 60 * 1000, 4);

  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].windowStartMs, Date.parse("2026-02-14T10:00:00.000Z"));
  assert.equal(timeline[0].messageCount, 2);
  assert.equal(timeline[2].windowStartMs, Date.parse("2026-02-14T21:00:00.000Z"));
  assert.equal(timeline[2].messageCount, 2);
  assert.equal(timeline[2].isActive, false);
});
