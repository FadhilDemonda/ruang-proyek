"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import Select from "./Select";
import WorkspaceIcon from "./WorkspaceIcon";
import type { Item, Note } from "./types";

type Draft = Pick<Note, "id" | "title" | "content" | "projectId">;
type Editor = { draft: Draft; saved: Draft; savedAt?: number };

type Props = {
  notes: Note[];
  projects: Item[];
  projectFilter: string;
  active: boolean;
  detailId: string | null;
  loading: boolean;
  storageLabel: string;
  onProjectFilterChange: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpen: (id: string) => void;
  onBack: () => void;
  onCreated: (id: string) => void;
  onSave: (draft: Draft) => Promise<Note>;
  onDelete: (note: Note) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
  leaveRequest: number;
  onLeaveResolved: (discarded: boolean) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
};

type PendingLeave =
  | { kind: "back" }
  | { kind: "leave" }
  | { kind: "switch"; id: string };

const emptyDraft = (projectId = ""): Draft => ({
  id: "",
  title: "",
  content: "",
  projectId,
});

const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

function updatedLabel(updatedAt: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(updatedAt);
}

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function textMetrics(content: string) {
  const words = countWords(content);
  const chars = content.length;
  const lines = content ? content.split(/\r?\n/).length : 0;
  const minutes = words === 0 ? "0 mnt" : words < 180 ? "< 1 mnt" : `${Math.ceil(words / 180)} mnt`;
  return { words, chars, lines, minutes };
}

export default function NotesView({
  notes,
  projects,
  projectFilter,
  active,
  detailId,
  loading,
  storageLabel,
  onProjectFilterChange,
  onOpenProject,
  onOpen,
  onBack,
  onCreated,
  onSave,
  onDelete,
  onDirtyChange,
  leaveRequest,
  onLeaveResolved,
  onNotice,
  onError,
}: Props) {
  const [editors, setEditors] = useState(() => new Map<string, Editor>());
  const [saving, setSaving] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [confirm, setConfirm] = useState<"discard" | "delete" | null>(null);
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "title">("recent");
  const [copiedNote, setCopiedNote] = useState(false);
  const [now] = useState(() => Date.now());
  const savePromiseRef = useRef<Promise<Note | null> | null>(null);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  const sorted = useMemo(() => {
    const copy = [...notes];
    if (sortBy === "title") {
      return copy.sort((a, b) => a.title.localeCompare(b.title, "id"));
    }
    return copy.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, sortBy]);

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sorted.filter((note) => {
      if (projectFilter === "__none__" && note.projectId) return false;
      if (
        projectFilter &&
        projectFilter !== "__none__" &&
        note.projectId !== projectFilter
      ) {
        return false;
      }
      if (!query) return true;
      const linkedProject = note.projectId ? projectMap.get(note.projectId)?.title || "" : "";
      return (
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        linkedProject.toLowerCase().includes(query)
      );
    });
  }, [sorted, search, projectFilter, projectMap]);

  const activeRecord = detailId ? notes.find((note) => note.id === detailId) : undefined;
  const editor = detailId == null ? undefined : editors.get(detailId);
  const dirty = Boolean(editor && (
    editor.draft.title !== editor.saved.title ||
    editor.draft.content !== editor.saved.content ||
    (editor.draft.projectId || "") !== (editor.saved.projectId || "")
  ));
  const initialProjectId =
    projectFilter && projectFilter !== "__none__" && projectMap.has(projectFilter)
      ? projectFilter
      : "";
  const saved = !dirty && activeRecord && activeRecord.updatedAt >= (editor?.savedAt ?? 0)
    ? activeRecord
    : editor?.saved ?? (detailId === "" ? emptyDraft(initialProjectId) : null);
  const draft = dirty ? editor!.draft : saved;

  useEffect(() => {
    const synced = notes.filter((note) => {
      const entry = editors.get(note.id);
      return entry?.savedAt != null && note.updatedAt >= entry.savedAt && entry.draft === entry.saved;
    });
    if (!synced.length) return;
    setEditors((previous) => {
      const next = new Map(previous);
      for (const note of synced) {
        if (previous.get(note.id) === editors.get(note.id)) next.delete(note.id);
      }
      return next;
    });
  }, [notes, editors]);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const performSave = useCallback(
    async (
      snapshot: Draft,
      sourceDetailId: string,
      navigateAfter = false,
    ): Promise<Note | null> => {
      if (!snapshot.title.trim()) return null;
      const run = async (): Promise<Note | null> => {
        setSaving(true);
        try {
          const note = await onSave(snapshot);
          const next: Draft = {
            id: note.id,
            title: note.title,
            content: note.content,
            projectId: note.projectId || "",
          };
          setEditors((previous) => {
            const map = new Map(previous);
            const existingEntry =
              previous.get(note.id) ?? previous.get(sourceDetailId);
            const currentDraft = existingEntry?.draft;
            const hasNewerEdits =
              currentDraft &&
              (currentDraft.title !== snapshot.title ||
                currentDraft.content !== snapshot.content ||
                (currentDraft.projectId || "") !== (snapshot.projectId || ""));
            const latestDraft: Draft = hasNewerEdits
              ? { ...currentDraft, id: note.id }
              : next;
            if (sourceDetailId === "" && note.id !== "") {
              map.delete("");
            }
            if (!navigateAfter) {
              map.set(note.id, {
                draft: latestDraft,
                saved: next,
                savedAt: note.updatedAt,
              });
            } else if (hasNewerEdits) {
              map.set(note.id, {
                draft: latestDraft,
                saved: next,
                savedAt: note.updatedAt,
              });
            } else {
              map.delete(note.id);
            }
            return map;
          });
          if (sourceDetailId === "" && !navigateAfter) {
            onCreated(note.id);
          }
          return note;
        } catch {
          return null;
        } finally {
          savePromiseRef.current = null;
          setSaving(false);
        }
      };
      const promise = run();
      savePromiseRef.current = promise;
      return promise;
    },
    [onSave, onCreated],
  );

  useEffect(() => {
    if (!active || !draft || !dirty || !draft.title.trim() || saving || deletingBusy) {
      return;
    }
    const snapshot: Draft = {
      id: draft.id,
      title: draft.title,
      content: draft.content,
      projectId: draft.projectId || "",
    };
    const sourceId = detailId ?? "";
    const timer = window.setTimeout(() => {
      void performSave(snapshot, sourceId);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [active, draft, dirty, detailId, saving, deletingBusy, performSave]);

  useEffect(() => {
    if (!leaveRequest) return;
    if (dirty) {
      if (draft?.title.trim()) {
        const snapshot: Draft = {
          id: draft.id,
          title: draft.title,
          content: draft.content,
          projectId: draft.projectId || "",
        };
        const sourceId = detailId ?? "";
        void (async () => {
          if (savePromiseRef.current) await savePromiseRef.current;
          const savedNote = await performSave(snapshot, sourceId, true);
          if (savedNote) onLeaveResolved(true);
          else {
            setPendingLeave({ kind: "leave" });
            setConfirm("discard");
          }
        })();
      } else {
        setPendingLeave({ kind: "leave" });
        setConfirm("discard");
      }
    } else onLeaveResolved(true);
  }, [leaveRequest]);

  useEffect(() => {
    setCopiedNote(false);
    setConfirm(null);
    setPendingLeave(null);
  }, [detailId]);

  useEffect(() => {
    if (!copiedNote) return;
    const timer = setTimeout(() => setCopiedNote(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedNote]);

  function updateEditor(id: string, value: Editor | null) {
    setEditors((previous) => {
      const next = new Map(previous);
      if (value) next.set(id, value);
      else next.delete(id);
      return next;
    });
  }

  function setDraft(draft: Draft) {
    if (detailId == null || !saved) return;
    updateEditor(detailId, { draft, saved, savedAt: editor?.savedAt });
  }

  async function flushBeforeLeave(proceed: () => void, leaveTarget: PendingLeave) {
    if (!dirty) {
      if (savePromiseRef.current) await savePromiseRef.current;
      proceed();
      return;
    }
    if (draft?.title.trim()) {
      if (savePromiseRef.current) await savePromiseRef.current;
      const snapshot: Draft = {
        id: draft.id,
        title: draft.title,
        content: draft.content,
        projectId: draft.projectId || "",
      };
      const savedNote = await performSave(snapshot, detailId ?? "", true);
      if (savedNote) {
        proceed();
        return;
      }
    }
    setPendingLeave(leaveTarget);
    setConfirm("discard");
  }

  function requestBack() {
    void flushBeforeLeave(onBack, { kind: "back" });
  }

  function requestSwitch(note: Note) {
    if (note.id === draft?.id) return;
    void flushBeforeLeave(() => onOpen(note.id), { kind: "switch", id: note.id });
  }

  function resolveDiscard(discarded: boolean) {
    const action = pendingLeave;
    setConfirm(null);
    setPendingLeave(null);
    if (!discarded) {
      if (action?.kind === "leave") onLeaveResolved(false);
      return;
    }
    if (detailId != null && saved) {
      updateEditor(detailId, editor?.savedAt ? { draft: saved, saved, savedAt: editor.savedAt } : null);
    }
    if (action?.kind === "switch") {
      onOpen(action.id);
    } else if (action?.kind === "leave") {
      onLeaveResolved(true);
    } else {
      onBack();
    }
  }

  async function saveImmediate() {
    if (!draft || detailId == null || saving || deletingBusy || !draft.title.trim()) return;
    await performSave(
      {
        id: draft.id,
        title: draft.title,
        content: draft.content,
        projectId: draft.projectId || "",
      },
      detailId,
    );
  }

  async function remove() {
    if (!draft?.id) return;
    setDeletingBusy(true);
    try {
      await onDelete({ ...draft, updatedAt: 0 });
      setConfirm(null);
      setPendingLeave(null);
      updateEditor(draft.id, null);
      onBack();
    } catch {
      // Keep the editor open after a failed delete.
    } finally {
      setDeletingBusy(false);
    }
  }

  async function copyContent() {
    if (!draft) return;
    const body = draft.content.trim()
      ? `${draft.title.trim() ? `${draft.title.trim()}\n\n` : ""}${draft.content}`
      : draft.title;
    if (!body.trim()) return;
    try {
      await navigator.clipboard.writeText(body);
      setCopiedNote(true);
      onNotice("Isi catatan disalin.");
    } catch {
      onError("Gagal menyalin isi catatan.");
    }
  }

  if (!active) return null;

  if (draft) {
    const isNew = !draft.id;
    const metrics = textMetrics(draft.content);
    const otherNotes = [...notes]
      .filter((n) => n.id !== draft.id)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 4);
    const saveState = saving || (dirty && Boolean(draft.title.trim()))
      ? "dirty"
      : dirty
        ? "new"
        : isNew
          ? "new"
          : "saved";
    const saveLabel = saving || (dirty && Boolean(draft.title.trim()))
      ? "Menyimpan…"
      : dirty
        ? "Isi judul untuk simpan"
        : isNew
          ? "Draf baru"
          : "Tersimpan";

    return (
      <section
        className="notes-detail"
        aria-labelledby="note-title"
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            void saveImmediate();
          }
        }}
      >
        <div className="note-detail-actions">
          <div className="note-detail-actions-start">
            <button type="button" className="back-button" onClick={requestBack}>
              <WorkspaceIcon name="back" />
              <span>Kembali ke Notes</span>
            </button>
            <span className="note-save-pill" data-state={saveState} role="status">
              <span className="note-save-dot" aria-hidden="true" />
              <span>{saveLabel}</span>
            </span>
          </div>

          {!isNew && (
            <div className="note-detail-actions-end">
              <button
                type="button"
                className="danger-button note-delete-btn"
                onClick={() => setConfirm("delete")}
                disabled={deletingBusy}
              >
                <WorkspaceIcon name="trash" />
                <span>Hapus catatan</span>
              </button>
            </div>
          )}
        </div>

        <div className="note-detail-layout">
          <div className="note-editor card" data-dirty={dirty}>
            <div className="note-editor-head">
              <h1 id="note-title">
                {isNew ? "Catatan baru" : draft.title || "Tanpa judul"}
              </h1>
              <span className="note-editor-hint">
                Ketik langsung · Tersimpan otomatis
              </span>
            </div>

            <div className="note-field">
              <label htmlFor="note-title-input">Judul catatan</label>
              <input
                id="note-title-input"
                className="note-title-input"
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                placeholder="Tulis judul catatan"
                autoFocus={isNew}
                disabled={deletingBusy}
              />
            </div>

            <div className="note-field">
              <label htmlFor="note-project-select">Proyek terkait</label>
              <div className="note-project-field-row">
                <Select
                  id="note-project-select"
                  aria-label="Proyek terkait catatan"
                  value={draft.projectId || ""}
                  disabled={deletingBusy}
                  onChange={(event) =>
                    setDraft({ ...draft, projectId: event.target.value })
                  }
                >
                  <option value="">Catatan mandiri (tanpa proyek)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </Select>
                {draft.projectId && projectMap.has(draft.projectId) && (
                  <button
                    type="button"
                    className="note-open-project-btn"
                    onClick={() => onOpenProject(draft.projectId!)}
                  >
                    <span>Buka proyek</span>
                    <WorkspaceIcon name="arrowRight" />
                  </button>
                )}
              </div>
            </div>

            <div className="note-field note-field-body">
              <label htmlFor="note-content-input">Isi catatan</label>
              <textarea
                id="note-content-input"
                className="note-content-input"
                value={draft.content}
                onChange={(event) =>
                  setDraft({ ...draft, content: event.target.value })
                }
                placeholder="Mulai menulis langsung di sini…"
                rows={16}
                autoFocus={!isNew}
                disabled={deletingBusy}
              />
            </div>
          </div>

          <div className="note-detail-rail">
            <section
              className="card detail-section"
              aria-labelledby="note-info-heading"
            >
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <WorkspaceIcon name="notes" />
                  <h2 id="note-info-heading">Info catatan</h2>
                </div>
              </div>

              <dl className="note-stat-grid">
                <div className="note-stat-cell">
                  <dt>Kata</dt>
                  <dd>{metrics.words}</dd>
                </div>
                <div className="note-stat-cell">
                  <dt>Karakter</dt>
                  <dd>{metrics.chars}</dd>
                </div>
                <div className="note-stat-cell">
                  <dt>Baris</dt>
                  <dd>{metrics.lines}</dd>
                </div>
                <div className="note-stat-cell">
                  <dt>Waktu baca</dt>
                  <dd>{metrics.minutes}</dd>
                </div>
              </dl>

              <div className="note-rail-meta">
                <div>
                  <span>Terakhir diedit</span>
                  <strong>
                    {activeRecord
                      ? updatedLabel(activeRecord.updatedAt)
                      : "Belum disimpan"}
                  </strong>
                </div>
                <div>
                  <span>Penyimpanan</span>
                  <strong>{storageLabel}</strong>
                </div>
              </div>

              <button
                type="button"
                className="detail-copy-btn"
                onClick={copyContent}
                disabled={!draft.title.trim() && !draft.content.trim()}
              >
                <WorkspaceIcon name={copiedNote ? "check" : "copy"} />
                <span>{copiedNote ? "Isi tersalin" : "Salin isi catatan"}</span>
              </button>
            </section>

            {otherNotes.length > 0 && (
              <section
                className="card detail-section"
                aria-labelledby="note-switcher-heading"
              >
                <div className="detail-section-head">
                  <div className="detail-section-title">
                    <h2 id="note-switcher-heading">Catatan lainnya</h2>
                  </div>
                  <span className="count">{otherNotes.length}</span>
                </div>
                <nav className="note-switcher" aria-label="Beralih catatan">
                  {otherNotes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="note-switcher-item"
                      onClick={() => requestSwitch(item)}
                    >
                      <span className="note-switcher-title">{item.title}</span>
                      <small>{countWords(item.content)} kata</small>
                    </button>
                  ))}
                </nav>
              </section>
            )}
          </div>
        </div>

        {confirm === "discard" && (
          <Modal
            labelledBy="discard-note-heading"
            onClose={() => resolveDiscard(false)}
          >
            <div className="dialog card">
              <h2 id="discard-note-heading">Buang perubahan?</h2>
              <p>Catatan belum memiliki judul sehingga perubahan belum dapat disimpan otomatis.</p>
              <div className="row">
                <button type="button" onClick={() => resolveDiscard(false)}>
                  Tetap edit
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => resolveDiscard(true)}
                >
                  Buang perubahan
                </button>
              </div>
            </div>
          </Modal>
        )}

        {confirm === "delete" && (
          <Modal
            labelledBy="delete-note-heading"
            onClose={() => setConfirm(null)}
          >
            <div className="dialog card">
              <h2 id="delete-note-heading">Hapus {draft.title}?</h2>
              <p>Tindakan ini tidak dapat dibatalkan.</p>
              <div className="row">
                <button
                  type="button"
                  onClick={() => setConfirm(null)}
                  disabled={deletingBusy}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={remove}
                  disabled={deletingBusy}
                >
                  Hapus
                </button>
              </div>
            </div>
          </Modal>
        )}
      </section>
    );
  }

  if (detailId != null) {
    return (
      <section className="notes-detail">
        <div className="detail-nav">
          <button type="button" className="back-button" onClick={onBack}>
            <WorkspaceIcon name="back" /> Kembali ke Notes
          </button>
        </div>
        {loading ? <p role="status">Memuat catatan…</p> : <h1>Catatan tidak ditemukan</h1>}
      </section>
    );
  }

  return (
    <section className="notes-page" aria-labelledby="notes-heading">
      <div className="heading">
        <div>
          <h1 id="notes-heading">Notes</h1>
          <p>Simpan ide, konteks, dan keputusan penting di satu tempat.</p>
        </div>
        <div className="notes-hero-right">
          {notes.length > 0 && (
            <div className="notes-count-pill">
              <span>Total catatan</span>
              <strong>{notes.length}</strong>
            </div>
          )}
          <button type="button" className="primary" onClick={() => onOpen("")}>
            Tambah catatan
          </button>
        </div>
      </div>

      {notes.length > 0 && !loading && (
        <div className="notes-toolbar card">
          <div className="todo-search notes-search">
            <span className="todo-search-icon" aria-hidden="true">
              <WorkspaceIcon name="search" />
            </span>
            <input
              aria-label="Cari catatan"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul atau isi catatan…"
            />
            {search && (
              <button
                type="button"
                className="todo-search-clear"
                aria-label="Hapus pencarian catatan"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="notes-toolbar-right">
            {projects.length > 0 && (
              <div className="todo-project-picker">
                <WorkspaceIcon name="folder" />
                <Select
                  aria-label="Filter proyek catatan"
                  value={projectFilter}
                  onChange={(event) => onProjectFilterChange(event.target.value)}
                >
                  <option value="">Semua Proyek</option>
                  <option value="__none__">Catatan mandiri</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div
              className="todo-filter-pills notes-sort-pills"
              role="group"
              aria-label="Urutan catatan"
            >
              <button
                type="button"
                className="todo-pill-btn"
                aria-pressed={sortBy === "recent"}
                onClick={() => setSortBy("recent")}
              >
                Terbaru
              </button>
              <button
                type="button"
                className="todo-pill-btn"
                aria-pressed={sortBy === "title"}
                onClick={() => setSortBy("title")}
              >
                Judul A–Z
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p role="status">Memuat catatan…</p>
      ) : visibleNotes.length ? (
        <div className="notes-grid" role="list" aria-label="Daftar catatan">
          {visibleNotes.map((note) => {
            const isFresh =
              note.updatedAt > 0 && now - note.updatedAt < FRESH_WINDOW_MS;
            const linkedProject = note.projectId
              ? projectMap.get(note.projectId)
              : undefined;
            return (
              <article
                key={note.id}
                className="note-card card"
                role="listitem"
                data-fresh={isFresh}
              >
                <button
                  type="button"
                  className="note-card-open"
                  onClick={() => onOpen(note.id)}
                  aria-label={`Buka catatan ${note.title}`}
                >
                  <div className="note-card-head">
                    <div className="note-card-badges">
                      <span className="note-card-badge">
                        {isFresh ? "Baru diedit" : "Catatan"}
                      </span>
                      {linkedProject && (
                        <span className="note-project-chip">
                          <WorkspaceIcon name="folder" />
                          <span>{linkedProject.title}</span>
                        </span>
                      )}
                    </div>
                    <span className="note-card-icon" aria-hidden="true">
                      <WorkspaceIcon name="notes" />
                    </span>
                  </div>
                  <h2>{note.title}</h2>
                  <p>{note.content || "Belum ada isi catatan."}</p>
                  <div className="note-card-foot">
                    <time dateTime={new Date(note.updatedAt).toISOString()}>
                      Diedit {updatedLabel(note.updatedAt)}
                    </time>
                    <span className="note-card-words">
                      {countWords(note.content)} kata
                    </span>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      ) : notes.length ? (
        <div className="notes-empty card">
          <h2>Catatan tidak ditemukan</h2>
          <p>Coba kata kunci atau filter proyek lain untuk menemukan catatan yang kamu cari.</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              onProjectFilterChange("");
            }}
          >
            Reset pencarian
          </button>
        </div>
      ) : (
        <div className="notes-empty card">
          <h2>Belum ada catatan</h2>
          <p>
            Buat catatan pertama untuk menyimpan ide, konteks, atau keputusan
            penting.
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => onOpen("")}
          >
            Tambah catatan
          </button>
        </div>
      )}
    </section>
  );
}
