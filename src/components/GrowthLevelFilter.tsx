"use client";

import { memo } from "react";
import { GrowthLevel } from "@/lib/types";
import { GROWTH_LEVELS } from "@/lib/growth-level";

interface GrowthLevelFilterProps {
  selectedLevel: GrowthLevel | null;
  onSelectLevel: (level: GrowthLevel | null) => void;
  levelCounts: Record<GrowthLevel, number>;
}

export const GrowthLevelFilter = memo(function GrowthLevelFilter({
  selectedLevel,
  onSelectLevel,
  levelCounts,
}: GrowthLevelFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GROWTH_LEVELS.map((gl) => {
        const isSelected = selectedLevel === gl.level;
        return (
          <button
            key={gl.level}
            onClick={() => onSelectLevel(isSelected ? null : gl.level)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: isSelected ? gl.color : `${gl.color}15`,
              color: isSelected ? "#fff" : gl.color,
              border: `1px solid ${isSelected ? gl.color : `${gl.color}30`}`,
            }}
          >
            <span>{gl.icon}</span>
            <span>{gl.labelJa}</span>
            <span
              className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]"
              style={{
                backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : `${gl.color}20`,
              }}
            >
              {levelCounts[gl.level] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
});
