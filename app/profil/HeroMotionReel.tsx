"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Logo from "../Logo";

const REEL_DURATION_MS = 10_000;
const PHASE_COUNT = 4;
const PHASE_DURATION_MS = REEL_DURATION_MS / PHASE_COUNT;

const PHASE_LABELS = [
  "01 · Request",
  "02 · Proyek",
  "03 · Kanban",
  "04 · Sinkron",
] as const;

export default function HeroMotionReel() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const deckRef = useRef<HTMLDivElement | null>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [phase, setPhase] = useState(0);
  const [paused, setPaused] = useState(false);

  const pausedRef = useRef(false);
  const pointerHandlersRef = useRef<{
    move: (clientX: number, clientY: number) => void;
    leave: () => void;
  } | null>(null);
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
    wakeRef.current?.();
  }, [paused]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = bgCanvasRef.current;
    const deck = deckRef.current;
    if (!stage || !canvas || !deck) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isDarkTheme = () => document.documentElement.dataset.theme === "dark";

    let width = stage.clientWidth;
    let height = stage.clientHeight;
    let visible = true;
    let disposed = false;
    let rafId = 0;
    let lastTimestamp = 0;
    let reelClockMs = 0;
    let bgClockSec = 0;
    let activePhase = 0;

    // Smooth pointer parallax state
    let targetRx = 0;
    let targetRy = 0;
    let targetGx = 50;
    let targetGy = 35;
    let currentRx = 0;
    let currentRy = 0;
    let currentGx = 50;
    let currentGy = 35;

    const resizeCanvas = () => {
      if (width <= 0 || height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.max(1, Math.round(width * dpr));
      const ph = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();

    const updateScrubber = (clockMs: number) => {
      const currentP = Math.floor(clockMs / PHASE_DURATION_MS) % PHASE_COUNT;
      const segProgress = (clockMs % PHASE_DURATION_MS) / PHASE_DURATION_MS;
      for (let i = 0; i < PHASE_COUNT; i += 1) {
        const fill = fillRefs.current[i];
        if (!fill) continue;
        let ratio = 0;
        if (i < currentP) ratio = 1;
        else if (i === currentP) ratio = segProgress;
        fill.style.transform = `scaleX(${ratio.toFixed(4)})`;
      }
      if (currentP !== activePhase) {
        activePhase = currentP;
        setPhase(currentP);
      }
    };

    const drawLightField = (t: number) => {
      if (width <= 0 || height <= 0) return;
      const dark = isDarkTheme();

      ctx.clearRect(0, 0, width, height);

      // Ambient gradient base
      const baseGrad = ctx.createRadialGradient(
        width * 0.25,
        height * 0.18,
        width * 0.04,
        width * 0.55,
        height * 0.6,
        Math.max(width, height) * 0.9,
      );
      if (dark) {
        baseGrad.addColorStop(0, "#273020");
        baseGrad.addColorStop(0.55, "#1a2015");
        baseGrad.addColorStop(1, "#12160f");
      } else {
        baseGrad.addColorStop(0, "#faf6e6");
        baseGrad.addColorStop(0.55, "#eee7cd");
        baseGrad.addColorStop(1, "#e1dac0");
      }
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      // Orbiting volumetric light blooms
      const blobs = [
        {
          cx: width * (0.3 + 0.16 * Math.sin(t * 0.55)),
          cy: height * (0.34 + 0.14 * Math.cos(t * 0.42)),
          r: Math.min(width, height) * 0.46,
          color: dark ? "rgba(164, 198, 120, 0.17)" : "rgba(156, 179, 118, 0.28)",
        },
        {
          cx: width * (0.72 + 0.14 * Math.cos(t * 0.48 + 1.2)),
          cy: height * (0.64 + 0.15 * Math.sin(t * 0.38 + 0.7)),
          r: Math.min(width, height) * 0.42,
          color: dark ? "rgba(200, 169, 106, 0.12)" : "rgba(214, 190, 128, 0.28)",
        },
        {
          cx: width * (0.5 + 0.18 * Math.sin(t * 0.32 + 2.4)),
          cy: height * (0.22 + 0.12 * Math.cos(t * 0.5 + 1.8)),
          r: Math.min(width, height) * 0.34,
          color: dark ? "rgba(197, 216, 157, 0.1)" : "rgba(255, 252, 240, 0.55)",
        },
      ];

      for (const b of blobs) {
        const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.r);
        g.addColorStop(0, b.color);
        g.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Flowing translucent energy ribbons
      ctx.save();
      ctx.lineWidth = 1.25;
      for (let i = 0; i < 3; i += 1) {
        const phaseShift = i * 1.35;
        ctx.strokeStyle = dark
          ? `rgba(197, 216, 157, ${0.14 - i * 0.03})`
          : `rgba(91, 106, 67, ${0.15 - i * 0.03})`;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 14) {
          const nx = x / width;
          const y =
            height * (0.28 + i * 0.22) +
            Math.sin(nx * 5.2 + t * 0.95 + phaseShift) * (18 + i * 6) +
            Math.cos(nx * 2.6 - t * 0.6 + phaseShift) * 10;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Subtle orbital arc accent
      ctx.strokeStyle = dark ? "rgba(197, 216, 157, 0.09)" : "rgba(91, 106, 67, 0.09)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(
        width * 0.5,
        height * 0.5,
        width * 0.42,
        height * 0.3,
        -0.25 + Math.sin(t * 0.25) * 0.08,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    };

    const applyParallax = () => {
      deck.style.setProperty("--rx", `${currentRx.toFixed(2)}deg`);
      deck.style.setProperty("--ry", `${currentRy.toFixed(2)}deg`);
      deck.style.setProperty("--gx", `${currentGx.toFixed(1)}%`);
      deck.style.setProperty("--gy", `${currentGy.toFixed(1)}%`);
    };

    const tick = (now: number) => {
      rafId = 0;
      if (disposed || !visible || document.hidden) return;

      const dtMs = lastTimestamp > 0 ? Math.min(50, now - lastTimestamp) : 16.67;
      lastTimestamp = now;
      const dtSec = dtMs / 1000;

      const reduced = reducedMotionQuery.matches;
      const isPlaying = !pausedRef.current && !reduced;

      if (isPlaying) {
        reelClockMs = (reelClockMs + dtMs) % REEL_DURATION_MS;
        bgClockSec += dtSec;
      }

      const damp = reduced ? 1 : 1 - Math.exp(-8 * dtSec);
      currentRx += (targetRx - currentRx) * damp;
      currentRy += (targetRy - currentRy) * damp;
      currentGx += (targetGx - currentGx) * damp;
      currentGy += (targetGy - currentGy) * damp;

      applyParallax();
      updateScrubber(reelClockMs);
      drawLightField(bgClockSec);

      const parallaxSettled =
        Math.abs(targetRx - currentRx) < 0.02 &&
        Math.abs(targetRy - currentRy) < 0.02;

      if (isPlaying || !parallaxSettled) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        lastTimestamp = 0;
      }
    };

    const wake = () => {
      if (disposed || !visible || document.hidden) return;
      if (!rafId) {
        lastTimestamp = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    };
    wakeRef.current = wake;

    pointerHandlersRef.current = {
      move: (clientX: number, clientY: number) => {
        if (reducedMotionQuery.matches) return;
        const rect = stage.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const nx = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1));
        const ny = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1));
        targetRy = nx * 6.5;
        targetRx = -ny * 4.5;
        targetGx = 50 + nx * 32;
        targetGy = 42 + ny * 28;
        wake();
      },
      leave: () => {
        targetRx = 0;
        targetRy = 0;
        targetGx = 50;
        targetGy = 35;
        wake();
      },
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      resizeCanvas();
      drawLightField(bgClockSec);
      wake();
    });
    resizeObserver.observe(stage);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        visible = entry.isIntersecting;
        if (visible) {
          wake();
        } else if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
          lastTimestamp = 0;
        }
      },
      { threshold: 0.05 },
    );
    intersectionObserver.observe(stage);

    const themeObserver = new MutationObserver(() => {
      drawLightField(bgClockSec);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const handleVisibility = () => {
      if (document.hidden && rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
        lastTimestamp = 0;
      } else if (!document.hidden && visible) {
        wake();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const handleBlur = () => pointerHandlersRef.current?.leave();
    window.addEventListener("blur", handleBlur);

    const handleMotionChange = () => {
      if (reducedMotionQuery.matches) {
        targetRx = 0;
        targetRy = 0;
      }
      drawLightField(bgClockSec);
      wake();
    };
    reducedMotionQuery.addEventListener("change", handleMotionChange);

    updateScrubber(reelClockMs);
    drawLightField(bgClockSec);
    wake();

    return () => {
      disposed = true;
      wakeRef.current = null;
      pointerHandlersRef.current = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      reducedMotionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    pointerHandlersRef.current?.move(event.clientX, event.clientY);
  }

  function onPointerLeave() {
    pointerHandlersRef.current?.leave();
  }

  return (
    <div
      ref={stageRef}
      className="rp-still rp-reel-stage"
      data-phase={phase}
      data-paused={paused ? "true" : "false"}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
    >
      <canvas ref={bgCanvasRef} className="rp-reel-bg" aria-hidden="true" />
      <div className="rp-reel-grid" aria-hidden="true" />

      <div
        ref={deckRef}
        className="rp-reel-deck"
        role="img"
        aria-label="Pratinjau animasi alur Ruang Proyek dari permintaan, struktur proyek, papan Kanban, hingga sinkronisasi"
      >
        <div className="rp-reel-chip rp-reel-chip-top" aria-hidden="true">
          <span className="rp-reel-dot" />
          <span>4 MODUL · AKTIF</span>
        </div>

        <div className="rp-reel-frame" aria-hidden="true">
          <div className="rp-reel-sheen" />

          <div className="rp-reel-topbar">
            <span className="rp-reel-path">
              <span className="rp-reel-dot" />
              ruang-proyek / reel
            </span>
            <span className="rp-reel-phase-pill">{PHASE_LABELS[phase]}</span>
          </div>

          <div className="rp-reel-viewport">
            {/* Phase 0: Request Capture */}
            <div className="rp-reel-scene rp-reel-scene-0">
              <div className="rp-reel-scanline" />
              <div className="rp-glass-card rp-reel-req-card">
                <div className="rp-glass-meta">
                  <span className="rp-glass-tag">REQUEST MASUK</span>
                  <span className="rp-glass-time">Baru saja</span>
                </div>
                <strong className="rp-glass-title">Pembaruan halaman profil</strong>
                <div className="rp-glass-pills">
                  <span className="rp-pill-accent">Prioritas Tinggi</span>
                  <span className="rp-pill-soft">Tenggat · Jum</span>
                </div>
              </div>
              <div className="rp-reel-beam-row">
                <span className="rp-beam-node">Peminta: Tim Desain</span>
                <span className="rp-beam-line" />
                <span className="rp-beam-status">Siap dikonversi</span>
              </div>
            </div>

            {/* Phase 1: Project & Notes Structure */}
            <div className="rp-reel-scene rp-reel-scene-1">
              <div className="rp-glass-card rp-reel-proj-card">
                <div className="rp-proj-row">
                  <div>
                    <span className="rp-glass-tag">PROYEK TERSTRUKTUR</span>
                    <strong className="rp-glass-title">Portal Ruang Kerja Q4</strong>
                  </div>
                  <div className="rp-ring-wrap">
                    <svg viewBox="0 0 44 44" className="rp-ring-svg">
                      <circle cx="22" cy="22" r="17" className="rp-ring-track" />
                      <circle cx="22" cy="22" r="17" className="rp-ring-fill" />
                    </svg>
                    <span>78%</span>
                  </div>
                </div>
                <div className="rp-note-preview">
                  <span className="rp-note-label">CATATAN KERJA</span>
                  <div className="rp-note-bars">
                    <i className="is-done" />
                    <i className="is-done" />
                    <i />
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 2: Kanban Flow */}
            <div className="rp-reel-scene rp-reel-scene-2">
              <div className="rp-mini-kanban">
                <div className="rp-mini-col">
                  <span>Belum</span>
                  <div className="rp-mini-slot" />
                  <div className="rp-mini-slot is-dim" />
                </div>
                <div className="rp-mini-col">
                  <span>Jalan</span>
                  <div className="rp-mini-slot" />
                  <div className="rp-mini-slot is-dim" />
                </div>
                <div className="rp-mini-col">
                  <span>Selesai</span>
                  <div className="rp-mini-slot is-target" />
                  <div className="rp-mini-slot is-dim" />
                </div>
                <div className="rp-kanban-runner">
                  <span className="rp-runner-dot" />
                  <strong>Finalisasi UI</strong>
                </div>
              </div>
            </div>

            {/* Phase 3: Synced Overview */}
            <div className="rp-reel-scene rp-reel-scene-3">
              <div className="rp-sync-grid">
                <div className="rp-sync-tile">
                  <span>Proyek</span>
                  <strong>6 aktif</strong>
                </div>
                <div className="rp-sync-tile">
                  <span>To-do</span>
                  <strong>14 tugas</strong>
                </div>
                <div className="rp-sync-tile">
                  <span>Request</span>
                  <strong>3 masuk</strong>
                </div>
                <div className="rp-sync-tile">
                  <span>Notes</span>
                  <strong>Tersimpan</strong>
                </div>
              </div>
              <div className="rp-sync-banner">
                <span className="rp-reel-dot" />
                <span>Tersinkron otomatis ke akun pribadi</span>
              </div>
            </div>
          </div>

          <div className="rp-reel-scrubber">
            {[0, 1, 2, 3].map((idx) => (
              <span key={idx} className="rp-reel-seg">
                <span
                  ref={(el) => {
                    fillRefs.current[idx] = el;
                  }}
                  className="rp-reel-seg-fill"
                />
              </span>
            ))}
          </div>
        </div>

        <div className="rp-reel-chip rp-reel-chip-brand" aria-hidden="true">
          <Logo />
          <span>RP / 01</span>
        </div>
      </div>

      <button
        type="button"
        className="rp-reel-toggle"
        aria-label={paused ? "Putar animasi reel" : "Jeda animasi reel"}
        aria-pressed={paused}
        title={paused ? "Putar animasi" : "Jeda animasi"}
        onClick={() => setPaused((prev) => !prev)}
      >
        {paused ? (
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5.5v13l11-6.5-11-6.5Z" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        )}
      </button>
    </div>
  );
}
