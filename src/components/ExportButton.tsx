"use client";

import { useState, useRef, useEffect } from "react";
import { Project, Categories } from "@/lib/types";
import { exportToCSV, exportToJSON } from "@/lib/export";
import { exportToHTML } from "@/lib/export-html";

interface ExportButtonProps {
  projects: Project[];
  categories: Categories;
}

type ExportFormat = "html" | "csv" | "json";

export default function ExportButton({
  projects,
  categories,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      switch (format) {
        case "html":
          exportToHTML(projects, categories);
          break;
        case "csv":
          exportToCSV(projects, categories);
          break;
        case "json":
          exportToJSON(projects, categories);
          break;
      }
    } catch (error) {
      console.error(`Export failed:`, error);
      alert(`エクスポート失敗: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions: { format: ExportFormat; label: string; description: string; icon: string }[] = [
    { format: "html", label: "HTML レポート", description: "プレゼン形式", icon: "html" },
    { format: "csv", label: "CSV", description: "Excel用", icon: "csv" },
    { format: "json", label: "JSON", description: "データ形式", icon: "json" },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
          {exportOptions.map((option, index) => (
            <button
              key={option.format}
              onClick={() => handleExport(option.format)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors ${
                index === 0 ? "border-b dark:border-gray-700" : ""
              }`}
            >
              <ExportIcon type={option.icon} />
              <div>
                <div className="text-gray-700 dark:text-gray-200 font-medium">
                  {option.label}
                  {index === 0 && (
                    <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded">
                      推奨
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExportIcon({ type }: { type: string }) {
  const iconClasses = "w-5 h-5 text-gray-500 dark:text-gray-400";

  switch (type) {
    case "html":
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 17.56L16.07 16.43L16.62 10.33H9.38L9.2 8.3H16.8L17 6.31H7L7.56 12.32H14.45L14.22 14.9L12 15.5L9.78 14.9L9.64 13.24H7.64L7.93 16.43L12 17.56M4.07 3H19.93L18.5 19.2L12 21L5.5 19.2L4.07 3Z" />
        </svg>
      );
    case "csv":
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 17v-1h2v-2H8v-1h3v4H8zm6-4h-2v1h2v1h-2v1h-1v-4h3v1zm3 2v2h-1v-2h-1v-1h1v-1h1v1h1v1h-1z" />
        </svg>
      );
    case "json":
      return (
        <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 3h2v2H5v5a2 2 0 01-2 2 2 2 0 012 2v5h2v2H5c-1.07-.27-2-.9-2-2v-4a2 2 0 00-2-2H0v-2h1a2 2 0 002-2V5a2 2 0 012-2m14 0a2 2 0 012 2v4a2 2 0 002 2h1v2h-1a2 2 0 00-2 2v4a2 2 0 01-2 2h-2v-2h2v-5a2 2 0 012-2 2 2 0 01-2-2V5h-2V3h2m-7 12a1 1 0 011 1 1 1 0 01-1 1 1 1 0 01-1-1 1 1 0 011-1m-4 0a1 1 0 011 1 1 1 0 01-1 1 1 1 0 01-1-1 1 1 0 011-1m8 0a1 1 0 011 1 1 1 0 01-1 1 1 1 0 01-1-1 1 1 0 011-1z" />
        </svg>
      );
    default:
      return null;
  }
}
