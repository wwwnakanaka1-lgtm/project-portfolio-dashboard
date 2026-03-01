"use client";

import { motion } from "framer-motion";

interface TechBadgeProps {
  name: string;
  delay?: number;
}

export function TechBadge({ name, delay = 0 }: TechBadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="inline-block px-3 py-1 text-xs font-mono font-medium rounded-full
                 bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)]
                 text-[var(--foreground)] shadow-sm"
    >
      {name}
    </motion.span>
  );
}
