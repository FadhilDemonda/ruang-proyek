"use client";

import { useState, type FormEvent } from "react";
import type { ChecklistItem, Item, TodoPriority } from "./types";
import WorkspaceIcon from "./WorkspaceIcon";

type Props = {
  section: "todos" | "requests";
  item: Item;
  projectName: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: (target: "projects" | "todos") => void;
  onUpdateChecklist?: (checklist: ChecklistItem[]) => Promise<void> | void;
};

function priorityTone(priority?: TodoPriority | null) {
  if (priority === "Tinggi") return "high";
  if (priority === "Sedang") return "medium";
  if (priority === "Rendah") return "low";
  return "";
}

export default function ItemDetail({
  section,
  item,
  projectName,
  onBack,
  onEdit,
  onDelete,
  onConvert,
  onUpdateChecklist,
}: Props) {
  const isTask = section === "todos";
  const [newStep, setNewStep] = useState("");
  const [savingStep, setSavingStep] = useState(false);

  const checklist = item.checklist || [];
  const doneCount = checklist.filter((entry) => entry.done).length;
  const checklistPercent = checklist.length
    ? Math.round((doneCount / checklist.length) * 100)
    : 0;

  async function saveChecklist(next: ChecklistItem[]) {
    if (!onUpdateChecklist || savingStep) return;
    setSavingStep(true);
    try {
      await onUpdateChecklist(next);
    } finally {
      setSavingStep(false);
    }
  }

  async function handleAddStep(event: FormEvent) {
    event.preventDefault();
    const text = newStep.trim();
    if (!text || !onUpdateChecklist) return;
    const next: ChecklistItem[] = [
      ...checklist,
      { id: crypto.randomUUID(), text, done: false },
    ];
    setNewStep("");
    await saveChecklist(next);
  }

  async function toggleStep(id: string) {
    const next = checklist.map((entry) =>
      entry.id === id ? { ...entry, done: !entry.done } : entry,
    );
    await saveChecklist(next);
  }

  async function removeStep(id: string) {
    const next = checklist.filter((entry) => entry.id !== id);
    await saveChecklist(next);
  }

  return (
    <div className="project-detail-page">
      <div className="detail-nav">
        <button type="button" className="back-button" onClick={onBack}>
          <WorkspaceIcon name="back" /> Kembali ke {isTask ? "to-do" : "request"}
        </button>
      </div>
      <section className="detail-hero card" aria-labelledby="item-detail-title">
        <div className="detail-hero-top">
          <div className="detail-hero-main">
            <div className="detail-hero-icon"><WorkspaceIcon name={section} /></div>
            <div className="detail-hero-copy">
              <div className="detail-hero-badges">
                <span className="badge" data-status={item.status}>{item.status}</span>
                {isTask && item.priority && (
                  <span className={`priority-chip priority-${priorityTone(item.priority)}`}>
                    Prioritas {item.priority}
                  </span>
                )}
              </div>
              <h1 id="item-detail-title">{item.title}</h1>
              <p className="detail-hero-desc">{item.description || "Belum ada deskripsi."}</p>
            </div>
          </div>
          <div className="detail-hero-actions">
            <button type="button" onClick={onEdit}>Edit</button>
            <button type="button" className="danger-button" onClick={onDelete}>
              <WorkspaceIcon name="trash" /> Hapus
            </button>
          </div>
        </div>
        <dl className="detail-hero-meta">
          <div className="detail-meta-item">
            <dt>Tenggat</dt>
            <dd>{item.date || "Belum diatur"}</dd>
          </div>
          {isTask ? (
            <>
              <div className="detail-meta-item">
                <dt>Proyek</dt>
                <dd>{projectName}</dd>
              </div>
              <div className="detail-meta-item">
                <dt>Prioritas</dt>
                <dd>{item.priority || "Belum diatur"}</dd>
              </div>
            </>
          ) : (
            <>
              <div className="detail-meta-item"><dt>Peminta</dt><dd>{item.requester || "Belum diisi"}</dd></div>
              <div className="detail-meta-item"><dt>Tanggal masuk</dt><dd>{item.requestDate || "Belum diatur"}</dd></div>
            </>
          )}
        </dl>
      </section>

      {isTask && (
        <section className="card detail-section" aria-labelledby="task-checklist-title">
          <div className="detail-section-head">
            <div className="detail-section-title">
              <WorkspaceIcon name="checklist" />
              <h2 id="task-checklist-title">Checklist sub-tugas</h2>
            </div>
            {checklist.length > 0 && (
              <span className="detail-progress-label">
                {doneCount}/{checklist.length} selesai ({checklistPercent}%)
              </span>
            )}
          </div>

          {checklist.length > 0 && (
            <div
              className="checklist-progress-bar"
              role="progressbar"
              aria-valuenow={checklistPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progres sub-tugas"
            >
              <span style={{ width: `${checklistPercent}%` }} />
            </div>
          )}

          {checklist.length > 0 ? (
            <ul className="checklist-list" aria-label="Daftar sub-tugas">
              {checklist.map((entry) => (
                <li
                  key={entry.id}
                  className="checklist-row"
                  data-done={entry.done}
                >
                  <label className="checklist-item-label">
                    <input
                      type="checkbox"
                      checked={entry.done}
                      disabled={savingStep}
                      onChange={() => void toggleStep(entry.id)}
                    />
                    <span>{entry.text}</span>
                  </label>
                  <button
                    type="button"
                    className="checklist-remove-btn"
                    aria-label={`Hapus sub-tugas ${entry.text}`}
                    disabled={savingStep}
                    onClick={() => void removeStep(entry.id)}
                  >
                    <WorkspaceIcon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="detail-muted-copy">
              Pecah tugas ini menjadi langkah-langkah kecil agar lebih mudah diselesaikan.
            </p>
          )}

          <form className="checklist-add-form" onSubmit={(e) => void handleAddStep(e)}>
            <input
              aria-label="Tambah sub-tugas baru"
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder="Tulis langkah sub-tugas baru…"
              disabled={savingStep}
            />
            <button
              type="submit"
              className="primary"
              disabled={savingStep || !newStep.trim()}
            >
              + Tambah sub-tugas
            </button>
          </form>
        </section>
      )}

      {!isTask && (
        <section className="card detail-section" aria-labelledby="request-conversion-title">
          <div className="detail-section-head">
            <div className="detail-section-title"><h2 id="request-conversion-title">Tindak lanjut</h2></div>
          </div>
          <div className="detail-hero-actions">
            {item.convertedId ? (
              <button type="button" onClick={() => onConvert("projects")}>Lihat hasil konversi</button>
            ) : (
              <>
                <button type="button" onClick={() => onConvert("projects")}>Jadikan proyek</button>
                <button type="button" onClick={() => onConvert("todos")}>Jadikan to-do</button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
