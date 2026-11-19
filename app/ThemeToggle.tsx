"use client";

import { useEffect, useState } from "react";
import WorkspaceIcon from "./WorkspaceIcon";
import { transitionTheme } from "./themeTransition";

export default function ThemeToggle({ className = "rp-theme-btn" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        const stored = localStorage.getItem("ruang-theme");
        const isDark = stored === "dark" || document.documentElement.dataset.theme === "dark";
        setDark(isDark);
      } catch {}
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return (
    <button
      type="button"
      className={className}
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={dark ? "Mode terang" : "Mode gelap"}
      onClick={(event) => {
        const next = !dark;
        transitionTheme(next, () => setDark(next), event.currentTarget);
      }}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        <WorkspaceIcon name={dark ? "sun" : "moon"} />
      </span>
    </button>
  );
}
