"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Logo from "../Logo";

const REEL_DURATION_MS = 10_000;
const PHASE_COUNT = 4;
const PHASE_DURATION_MS = REEL_DURATION_MS / PHASE_COUNT;

const NAV_MODULES = [
  {
    id: "request",
    label: "Request",
    iconPath: "M3 14l3-9h12l3 9v5H3zM3 14h5l2 3h4l2-3h5",
  },
  {
    id: "proyek",
    label: "Proyek",
    iconPath:
      "M3 7V5a1 1 0 0 1 1-1h5l3 3h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7ZM3 9h18",
  },
  {
    id: "todo",
    label: "To-do",
    iconPath: "M4 4h16v16H4zM9 4v16m5-16v16",
  },
  {
    id: "notes",
    label: "Notes",
    iconPath: "M6 3h9l3 3v15H6zM15 3v4h4M9 11h6M9 15h6",
  },
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

      const dtMs =
        lastTimestamp > 0 ? Math.max(0, Math.min(50, now - lastTimestamp)) : 16.67;
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

    const activeModule = NAV_MODULES[phase] ?? NAV_MODULES[0];

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

  const activeModule = NAV_MODULES[phase] ?? NAV_MODULES[0];

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
        aria-label="Pratinjau animasi antarmuka Ruang Proyek meliputi Request, Proyek, To-do Kanban, dan Notes"
      >
        <div className="rp-reel-chip rp-reel-chip-top" aria-hidden="true">
          <span className="rp-reel-dot" />
          <span>4 MODUL · AKTIF</span>
        </div>

        <div className="rp-reel-frame" aria-hidden="true">
          <div className="rp-reel-sheen" />

          <div className="rp-ws-shell">
            <div className="rp-ws-sidebar">
              <div className="rp-ws-brand">
                <Logo />
                <span>Ruang Proyek</span>
              </div>
              <span className="rp-ws-section-label">RUANG KERJA</span>
              <div className="rp-ws-nav">
                <span className="rp-ws-nav-pill" />
                {NAV_MODULES.map((item, idx) => (
                  <div key={item.id} className="rp-ws-nav-item" data-idx={idx}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={item.iconPath} />
                    </svg>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rp-ws-main">
              <div className="rp-ws-crumb">
                <span>
                  Ruang kerja / <strong>{activeModule.label}</strong>
                </span>
                <span className="rp-reel-dot" />
              </div>

              <div className="rp-reel-viewport">
                {/* Phase 0: Daftar request (request.png parity) */}
                <div className="rp-reel-scene rp-reel-scene-0">
                  <div className="rp-ws-head">
                    <strong>Daftar request</strong>
                    <span className="rp-ws-add-pill">+ Tambah</span>
                  </div>
                  <div className="rp-ws-card">
                    <div className="rp-ws-card-top">
                      <span className="rp-ws-pill-new">
                        <i /> Baru
                      </span>
                      <span className="rp-ws-date">2026-11-26</span>
                    </div>
                    <strong className="rp-ws-card-title">
                      Rekap performa kanal bulanan
                    </strong>
                    <span className="rp-ws-card-sub">
                      Rina Pratiwi · Tim Bisnis
                    </span>
                    <div className="rp-ws-card-actions">
                      <span className="rp-ws-btn rp-ws-btn-convert">
                        Jadikan proyek
                      </span>
                      <span className="rp-ws-btn">Jadikan to-do</span>
                    </div>
                  </div>
                </div>

                {/* Phase 1: Proyek saya (proyek.png parity) */}
                <div className="rp-reel-scene rp-reel-scene-1">
                  <div className="rp-ws-head">
                    <strong>Proyek saya</strong>
                    <span className="rp-ws-stats">Dikerjakan 1 · Selesai 1</span>
                  </div>
                  <div className="rp-ws-card">
                    <div className="rp-ws-card-top">
                      <div className="rp-ws-badges">
                        <span className="rp-ws-pill-wip">
                          <i /> Dikerjakan
                        </span>
                        <span className="rp-ws-pill-chip">Folder lokal</span>
                        <span className="rp-ws-pill-chip">2 Link</span>
                      </div>
                    </div>
                    <strong className="rp-ws-card-title">
                      Dashboard Analisis Retensi Q2
                    </strong>
                    <div className="rp-ws-prog-row">
                      <div className="rp-ws-prog-track">
                        <span className="rp-ws-prog-fill" />
                      </div>
                      <span className="rp-ws-prog-label">2/3 selesai</span>
                      <span className="rp-ws-btn">Kanban</span>
                    </div>
                  </div>
                </div>

                {/* Phase 2: To-do saya Kanban (tugas.png parity) */}
                <div className="rp-reel-scene rp-reel-scene-2">
                  <div className="rp-ws-head">
                    <strong>To-do saya</strong>
                    <span className="rp-ws-filter-pill">Semua 6</span>
                  </div>
                  <div className="rp-ws-kanban">
                    <div className="rp-ws-kcol">
                      <span className="rp-ws-ktitle">Belum</span>
                      <div className="rp-ws-kslot" />
                      <div className="rp-ws-kslot is-dim" />
                    </div>
                    <div className="rp-ws-kcol">
                      <span className="rp-ws-ktitle is-wip">
                        <i /> Dikerjakan
                      </span>
                      <div className="rp-ws-kslot" />
                      <div className="rp-ws-kslot is-dim" />
                    </div>
                    <div className="rp-ws-kcol">
                      <span className="rp-ws-ktitle is-done">
                        <i /> Selesai
                      </span>
                      <div className="rp-ws-kslot is-target" />
                      <div className="rp-ws-kslot is-dim" />
                    </div>
                    <div className="rp-ws-krunner">
                      <span className="rp-ws-krunner-proj">Retensi Q2</span>
                      <strong>Validasi data</strong>
                    </div>
                  </div>
                </div>

                {/* Phase 3: Notes (notes.png parity) */}
                <div className="rp-reel-scene rp-reel-scene-3">
                  <div className="rp-ws-head">
                    <strong>Notes</strong>
                    <span className="rp-ws-pill-chip">Total catatan 3</span>
                  </div>
                  <div className="rp-ws-notes-grid">
                    <div className="rp-ws-note-card is-highlight">
                      <span className="rp-ws-pill-new">
                        <i /> Baru diedit
                      </span>
                      <strong>Notulen Rapat Mingguan</strong>
                      <div className="rp-ws-note-lines">
                        <i />
                        <i className="short" />
                      </div>
                      <span className="rp-ws-note-foot">26 kata</span>
                    </div>
                    <div className="rp-ws-note-card">
                      <span className="rp-ws-pill-chip">Catatan</span>
                      <strong>Palet &amp; Tipografi Ruang</strong>
                      <div className="rp-ws-note-lines">
                        <i />
                        <i className="short" />
                      </div>
                      <span className="rp-ws-note-foot">24 kata</span>
                    </div>
                  </div>
                </div>
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
