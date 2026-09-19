"use client";
import { useEffect, useState } from "react";
export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("davira-theme");
      const t = saved === "light" ? "light" : "dark";
      setTheme(t);
      document.documentElement.dataset.theme = t;
    } catch {}
  }, []);
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
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
