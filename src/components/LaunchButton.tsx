"use client";

import { useState, useCallback } from "react";

interface LaunchButtonProps {
  launchCommand: string;
  projectPath: string;
  projectName: string;
}

export default function LaunchButton({
  launchCommand,
  projectPath,
  projectName,
}: LaunchButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const fullCommand = `cd "${projectPath}" && ${launchCommand}`;
      await navigator.clipboard.writeText(fullCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  }, [launchCommand, projectPath]);

  return (
    <div className="relative inline-block">
      <button
        onClick={handleCopy}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
          font-medium text-sm transition-all duration-200
          ${
            copied
              ? "bg-emerald-500 dark:bg-emerald-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white"
          }
          shadow-sm hover:shadow-md
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-900
        `}
        aria-label={`Copy launch command for ${projectName}`}
      >
        {/* Icon */}
        {copied ? (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}

        {/* Button Text */}
        <span>{copied ? "Copied!" : "Launch"}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && !copied && (
        <div
          className="
            absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2
            px-3 py-2 rounded-lg
            bg-gray-900 dark:bg-gray-700
            text-white text-xs
            whitespace-nowrap
            shadow-lg
            pointer-events-none
          "
          role="tooltip"
        >
          <div className="max-w-xs">
            <p className="font-medium mb-1">Click to copy launch command</p>
            <code className="text-emerald-300 dark:text-emerald-400 text-xs block truncate">
              {launchCommand}
            </code>
          </div>
          {/* Tooltip Arrow */}
          <div
            className="
              absolute top-full left-1/2 -translate-x-1/2
              border-4 border-transparent border-t-gray-900 dark:border-t-gray-700
            "
          />
        </div>
      )}
    </div>
  );
}
