"use client";

import type { FormEvent } from "react";
import Modal from "./Modal";
import Select from "./Select";
import { SECTION_LABELS, SECTION_STATUSES } from "./workspaceConfig";
import { TODO_PRIORITIES, type Item, type Section, type TodoPriority } from "./types";

type Props = {
  editing: Item;
  editSection: Section;
  projects: Item[];
  isConversion: boolean;
  busy: boolean;
  error: string;
  onChange: (next: Item) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
};

export default function ItemFormModal({
  editing,
  editSection,
  projects,
  isConversion,
  busy,
  error,
  onChange,
  onSubmit,
  onClose,
}: Props) {
  return (
    <Modal
      labelledBy="edit-heading"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="dialog card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="row">
          <h2 id="edit-heading">
            {editing.id ? "Edit" : isConversion ? "Konversi ke" : "Tambah"}{" "}
            {SECTION_LABELS[editSection]}
          </h2>
          <button type="button" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <label>
          Judul
          <input
            required
            value={editing.title}
            onChange={(e) => onChange({ ...editing, title: e.target.value })}
          />
        </label>
        <label>
          Deskripsi
          <textarea
            rows={3}
            value={editing.description || ""}
            onChange={(e) => onChange({ ...editing, description: e.target.value })}
          />
        </label>
        <label>
          Status
          <Select
            aria-label="Status"
            value={editing.status}
            onChange={(e) => onChange({ ...editing, status: e.target.value })}
          >
            {SECTION_STATUSES[editSection].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </label>
        <label>
          {editSection === "projects" ? "Tanggal proyek" : "Tenggat"}
          <input
            type="date"
            value={editing.date || ""}
            onChange={(e) => onChange({ ...editing, date: e.target.value })}
          />
        </label>
        {editSection === "requests" && (
          <>
            <label>
              Tanggal masuk
              <input
                type="date"
                value={editing.requestDate || ""}
                onChange={(e) =>
                  onChange({ ...editing, requestDate: e.target.value })
                }
              />
            </label>
            <label>
              Nama peminta
              <input
                value={editing.requester || ""}
                onChange={(e) =>
                  onChange({ ...editing, requester: e.target.value })
                }
              />
            </label>
          </>
        )}
        {editSection === "todos" && (
          <>
            <label>
              Proyek
              <Select
                aria-label="Proyek tugas"
                value={editing.projectId || ""}
                onChange={(e) =>
                  onChange({ ...editing, projectId: e.target.value })
                }
              >
                <option value="">Tugas mandiri</option>
                {projects.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Prioritas
              <Select
                aria-label="Prioritas tugas"
                value={editing.priority || ""}
                onChange={(e) =>
                  onChange({
                    ...editing,
                    priority: (e.target.value || null) as TodoPriority | null,
                  })
                }
              >
                <option value="">Tanpa prioritas</option>
                {TODO_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </label>
            <div className="modal-checklist">
              <span className="modal-checklist-heading">Sub-tugas (Checklist)</span>
              {(editing.checklist || []).map((entry, idx) => (
                <div key={entry.id} className="modal-checklist-row">
                  <input
                    type="checkbox"
                    className="modal-checklist-check"
                    aria-label={`Tandai sub-tugas ${idx + 1} selesai`}
                    checked={entry.done}
                    onChange={(e) => {
                      const checklist = [...(editing.checklist || [])];
                      checklist[idx] = { ...entry, done: e.target.checked };
                      onChange({ ...editing, checklist });
                    }}
                  />
                  <input
                    aria-label={`Sub-tugas ${idx + 1}`}
                    placeholder="Langkah sub-tugas…"
                    value={entry.text}
                    onChange={(e) => {
                      const checklist = [...(editing.checklist || [])];
                      checklist[idx] = { ...entry, text: e.target.value };
                      onChange({ ...editing, checklist });
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Hapus sub-tugas ${idx + 1}`}
                    onClick={() =>
                      onChange({
                        ...editing,
                        checklist: (editing.checklist || []).filter((_, j) => j !== idx),
                      })
                    }
                  >
                    Hapus
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...editing,
                    checklist: [
                      ...(editing.checklist || []),
                      { id: crypto.randomUUID(), text: "", done: false },
                    ],
                  })
                }
              >
                + Tambah sub-tugas
              </button>
            </div>
          </>
        )}
        {editSection === "projects" && (
          <>
            <label>
              Lokasi folder komputer
              <input
                placeholder="D:\\Projects\\Nama proyek"
                value={editing.folder || ""}
                onChange={(e) => onChange({ ...editing, folder: e.target.value })}
              />
            </label>
            <h3>Link proyek</h3>
            {(editing.links || []).map((link, i) => (
              <div key={i} className="linkrow">
                <label>
                  Nama link
                  <input
                    required
                    value={link.label}
                    onChange={(e) => {
                      const links = [...(editing.links || [])];
                      links[i] = { ...link, label: e.target.value };
                      onChange({ ...editing, links });
                    }}
                  />
                </label>
                <label>
                  URL
                  <input
                    required
                    type="url"
                    value={link.url}
                    onChange={(e) => {
                      const links = [...(editing.links || [])];
                      links[i] = { ...link, url: e.target.value };
                      onChange({ ...editing, links });
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...editing,
                      links: editing.links?.filter((_, j) => j !== i),
                    })
                  }
                >
                  Hapus link
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...editing,
                  links: [...(editing.links || []), { label: "", url: "" }],
                })
              }
            >
              + Tambah link
            </button>
          </>
        )}
        <div className="row">
          <button type="button" onClick={onClose}>
            Batal
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
