export interface RollingWindowUsage {
  hasActiveWindow: boolean;
  windowStartMs: number | null;
  windowEndMs: number | null;
  usedMessages: number;
  resetMs: number;
}

export interface RollingWindowTimelineEntry {
  windowStartMs: number;
  windowEndMs: number;
  firstMessageAtMs: number;
  messageCount: number;
  isActive: boolean;
}

function getValidSortedTimestamps(timestampsMs: number[], nowMs: number): number[] {
  return timestampsMs
    .filter((value) => Number.isFinite(value) && value > 0 && value <= nowMs)
    .sort((a, b) => a - b);
}

export function calculateRollingWindowFromMessageTimestamps(
  timestampsMs: number[],
  nowMs: number,
  windowMs: number
): RollingWindowUsage {
  const valid = getValidSortedTimestamps(timestampsMs, nowMs);

  if (valid.length === 0) {
    return {
      hasActiveWindow: false,
      windowStartMs: null,
      windowEndMs: null,
      usedMessages: 0,
      resetMs: 0,
    };
  }

  let windowStartMs = valid[0];
  let usedMessages = 1;

  for (let i = 1; i < valid.length; i += 1) {
    const timestamp = valid[i];
    if (timestamp >= windowStartMs + windowMs) {
      windowStartMs = timestamp;
      usedMessages = 1;
    } else {
      usedMessages += 1;
    }
  }

  const windowEndMs = windowStartMs + windowMs;
  if (nowMs >= windowEndMs) {
    return {
      hasActiveWindow: false,
      windowStartMs: null,
      windowEndMs: null,
      usedMessages: 0,
      resetMs: 0,
    };
  }

  return {
    hasActiveWindow: true,
    windowStartMs,
    windowEndMs,
    usedMessages,
    resetMs: Math.max(0, windowEndMs - nowMs),
  };
}

export function buildRollingWindowTimeline(
  timestampsMs: number[],
  nowMs: number,
  windowMs: number,
  maxEntries = 6
): RollingWindowTimelineEntry[] {
  const valid = getValidSortedTimestamps(timestampsMs, nowMs);
  if (valid.length === 0) {
    return [];
  }

  const timeline: RollingWindowTimelineEntry[] = [];
  let currentStartMs = valid[0];
  let currentCount = 1;

  for (let i = 1; i < valid.length; i += 1) {
    const timestamp = valid[i];
    if (timestamp >= currentStartMs + windowMs) {
      const windowEndMs = currentStartMs + windowMs;
      timeline.push({
        windowStartMs: currentStartMs,
        windowEndMs,
        firstMessageAtMs: currentStartMs,
        messageCount: currentCount,
        isActive: nowMs < windowEndMs,
      });
      currentStartMs = timestamp;
      currentCount = 1;
      continue;
    }
    currentCount += 1;
  }

  const currentEndMs = currentStartMs + windowMs;
  timeline.push({
    windowStartMs: currentStartMs,
    windowEndMs: currentEndMs,
    firstMessageAtMs: currentStartMs,
    messageCount: currentCount,
    isActive: nowMs < currentEndMs,
  });

  return timeline.slice(Math.max(0, timeline.length - maxEntries));
}
