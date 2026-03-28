"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <button
        className="rounded-full border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        disabled
      >
        Theme
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}