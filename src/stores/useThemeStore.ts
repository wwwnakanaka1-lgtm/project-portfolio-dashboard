"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

/** Lightweight theme preference store using localStorage */
export function useThemeStore() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("theme-preference") as Theme | null;
    if (saved) setThemeState(saved);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme-preference", newTheme);
  }, []);

  return { theme, setTheme };
}
