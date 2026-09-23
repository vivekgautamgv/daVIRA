"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
export default function ThemeToggle({
  defaultTheme = "light",
}: {
  defaultTheme?: "light" | "dark";
}) {
  const [theme, setTheme] = useState(defaultTheme);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("davira-theme");
      const t = saved === "light" || saved === "dark" ? saved : defaultTheme;
      setTheme(t);
      document.documentElement.dataset.theme = t;
    } catch {}
  }, [defaultTheme]);
  return (
    <button
      className="button theme-toggle"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      onClick={() => {
        const t = theme === "dark" ? "light" : "dark";
        setTheme(t);
        document.documentElement.dataset.theme = t;
        try {
          localStorage.setItem("davira-theme", t);
        } catch {}
      }}
    >
      {theme === "dark" ? (
        <Sun aria-hidden="true" />
      ) : (
        <Moon aria-hidden="true" />
      )}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
