"use client";

import { flushSync } from "react-dom";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

let fadeTimer: number | undefined;

export function transitionTheme(
  nextDark: boolean,
  applyState: () => void,
  origin?: HTMLElement | null,
) {
  const root = document.documentElement;
  const nextTheme = nextDark ? "dark" : "light";

  const applyTheme = () => {
    flushSync(applyState);
    root.dataset.theme = nextTheme;
    try {
      localStorage.setItem("ruang-theme", nextTheme);
    } catch {}
  };

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as ViewTransitionDocument;

  if (!doc.startViewTransition || prefersReducedMotion) {
    window.clearTimeout(fadeTimer);
    root.classList.add("theme-fade");
    applyTheme();
    fadeTimer = window.setTimeout(() => {
      root.classList.remove("theme-fade");
    }, 320);
    return;
  }

  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 36;
  const y = rect ? rect.top + rect.height / 2 : 36;
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  root.classList.add("vt-theme");
  const transition = doc.startViewTransition(applyTheme);

  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 420,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});

  transition.finished.finally(() => {
    root.classList.remove("vt-theme");
  });
}
