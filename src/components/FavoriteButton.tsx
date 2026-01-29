"use client";

import { useEffect, useState, useCallback } from "react";

const FAVORITES_KEY = "portfolio-favorites";

// Custom hook for managing favorites
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setFavorites(new Set(parsed));
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(newFavorites)));
    } catch (error) {
      console.error("Failed to save favorites:", error);
    }
  }, []);

  const toggleFavorite = useCallback(
    (projectId: string) => {
      setFavorites((prev) => {
        const newFavorites = new Set(prev);
        if (newFavorites.has(projectId)) {
          newFavorites.delete(projectId);
        } else {
          newFavorites.add(projectId);
        }
        saveFavorites(newFavorites);
        return newFavorites;
      });
    },
    [saveFavorites]
  );

  const isFavorite = useCallback(
    (projectId: string) => favorites.has(projectId),
    [favorites]
  );

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    mounted,
  };
}

interface FavoriteButtonProps {
  projectId: string;
  isFavorite: boolean;
  onToggle: (projectId: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FavoriteButton({
  projectId,
  isFavorite,
  onToggle,
  size = "md",
  className = "",
}: FavoriteButtonProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    onToggle(projectId);
  };

  return (
    <button
      onClick={handleClick}
      className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      {isFavorite ? (
        // Filled star
        <svg
          className={`${sizeClasses[size]} text-yellow-400`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ) : (
        // Outline star
        <svg
          className={`${sizeClasses[size]} text-gray-400 hover:text-yellow-400`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      )}
    </button>
  );
}

// Favorites filter toggle component
interface FavoritesFilterProps {
  showFavoritesOnly: boolean;
  onToggle: () => void;
  favoritesCount: number;
}

export function FavoritesFilter({
  showFavoritesOnly,
  onToggle,
  favoritesCount,
}: FavoritesFilterProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        showFavoritesOnly
          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
      }`}
      aria-label={showFavoritesOnly ? "Show all projects" : "Show favorites only"}
    >
      <svg
        className={`w-4 h-4 ${showFavoritesOnly ? "text-yellow-500" : ""}`}
        fill={showFavoritesOnly ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
      <span className="text-sm font-medium">
        Favorites
        {favoritesCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-200 dark:bg-yellow-800 rounded-full">
            {favoritesCount}
          </span>
        )}
      </span>
    </button>
  );
}
