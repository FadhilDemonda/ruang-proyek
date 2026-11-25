"use client";

import { useEffect, useRef, useState } from "react";

export type StepMotionScene = "intake" | "blueprint" | "kanban";

export interface WorkflowMotionStep {
  step: string;
  title: string;
  body: string;
  scene: StepMotionScene;
  ariaLabel: string;
}

const SCENE_TAGS: Record<StepMotionScene, string> = {
  intake: "INTAKE",
  blueprint: "STRUCT",
  kanban: "FLOW",
};

export default function WorkflowMotionCards({ steps }: { steps: WorkflowMotionStep[] }) {
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleMap, setVisibleMap] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(steps.map((_, idx) => [idx, true])),
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleMap((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const entry of entries) {
            const indexAttr = (entry.target as HTMLElement).dataset.index;
            if (indexAttr === undefined) continue;
            const index = Number(indexAttr);
            if (next[index] !== entry.isIntersecting) {
              next[index] = entry.isIntersecting;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { threshold: 0.08 },
    );

    for (const el of stageRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [steps.length]);

  return (
    <ol className="rp-steps">
      {steps.map((item, index) => {
        const isActive = visibleMap[index] !== false;
        return (
          <li key={item.step} className="rp-step-card">
            <div
              ref={(el) => {
                stageRefs.current[index] = el;
              }}
              data-index={index}
              data-scene={item.scene}
              data-active={isActive ? "true" : "false"}
              className="rp-step-stage"
            >
              <span className="rp-step-num" aria-hidden="true">
                {item.step}
              </span>
              <span className="rp-step-telemetry" aria-hidden="true">
                <i />
                {SCENE_TAGS[item.scene]}
              </span>

              <div className="rp-mg-canvas" role="img" aria-label={item.ariaLabel}>
                <div className="rp-mg-grid" aria-hidden="true" />

                {item.scene === "intake" && (
                  <div className="rp-mg-intake" aria-hidden="true">
                    <div className="rp-mg-scanbeam" />
                    <div className="rp-mg-rail" />
                    <div className="rp-mg-chip rp-mg-chip-a">
                      <span className="rp-mg-dot" />
                      <div className="rp-mg-lines">
                        <i />
                        <i className="short" />
                      </div>
                      <span className="rp-mg-badge">Jum</span>
                    </div>
                    <div className="rp-mg-chip rp-mg-chip-b">
                      <span className="rp-mg-dot" />
                      <div className="rp-mg-lines">
                        <i />
                        <i className="short" />
                      </div>
                      <span className="rp-mg-badge">Baru</span>
                    </div>
                  </div>
                )}

                {item.scene === "blueprint" && (
                  <div className="rp-mg-blueprint" aria-hidden="true">
                    <svg className="rp-mg-wires" viewBox="0 0 260 130" fill="none">
                      <path
                        d="M72 65 C106 65, 114 36, 152 36"
                        className="rp-wire-base"
                      />
                      <path
                        d="M72 65 C106 65, 114 36, 152 36"
                        className="rp-wire-pulse"
                      />
                      <path
                        d="M72 65 C106 65, 114 94, 152 94"
                        className="rp-wire-base"
                      />
                      <path
                        d="M72 65 C106 65, 114 94, 152 94"
                        className="rp-wire-pulse is-delayed"
                      />
                    </svg>
                    <div className="rp-mg-hub">
                      <span className="rp-mg-dot" />
                      <strong>Proyek</strong>
                    </div>
                    <div className="rp-mg-node rp-mg-node-top">
                      <span>Tautan</span>
                      <i />
                    </div>
                    <div className="rp-mg-node rp-mg-node-bot">
                      <span>Catatan</span>
                      <i />
                    </div>
                  </div>
                )}

                {item.scene === "kanban" && (
                  <div className="rp-mg-kanban" aria-hidden="true">
                    <div className="rp-mg-kcol">
                      <span className="rp-mg-khead" />
                      <span className="rp-mg-kslot" />
                      <span className="rp-mg-kslot" />
                    </div>
                    <div className="rp-mg-kcol">
                      <span className="rp-mg-khead is-warm" />
                      <span className="rp-mg-kslot" />
                      <span className="rp-mg-kslot" />
                    </div>
                    <div className="rp-mg-kcol">
                      <span className="rp-mg-khead is-done" />
                      <span className="rp-mg-kslot is-done-slot" />
                      <span className="rp-mg-kslot" />
                    </div>
                    <div className="rp-mg-krunner">
                      <span className="rp-mg-dot" />
                      <i />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
