"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import Select from "./Select";
import WorkspaceIcon from "./WorkspaceIcon";
import { NOTE_COLORS, type Item, type Note, type NoteColor } from "./types";

type Draft = Pick<Note, "id" | "title" | "content" | "projectId" | "color">;
type Editor = { draft: Draft; saved: Draft; savedAt?: number };
type TimeRange = "all" | "today" | "week" | "month";

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
  onAddProject?: () => void;
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

const NOTE_COLOR_META: Record<NoteColor, { label: string; dot: string }> = {
  butter: { label: "Kuning", dot: "#e5cf52" },
  blush: { label: "Coral", dot: "#e8867c" },
  sky: { label: "Biru", dot: "#67b0d8" },
  sage: { label: "Sage", dot: "#87b36a" },
};

const FOLDER_TONES: NoteColor[] = ["sky", "blush", "butter", "sage"];

const emptyDraft = (projectId = "", color: NoteColor = "butter"): Draft => ({
  id: "",
  title: "",
  content: "",
  projectId,
  color,
});

const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;
const WEEK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

function resolveNoteColor(note: Pick<Note, "id" | "color">): NoteColor {
  if (note.color && NOTE_COLORS.includes(note.color)) return note.color;
  let hash = 0;
  for (let i = 0; i < note.id.length; i += 1) {
    hash = (hash * 31 + note.id.charCodeAt(i)) | 0;
  }
  return NOTE_COLORS[Math.abs(hash) % NOTE_COLORS.length];
}

function updatedLabel(updatedAt: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(updatedAt);
}

function shortDateLabel(updatedAt: number) {
  if (!updatedAt) return "Baru";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(updatedAt);
}

function chipTimeLabel(updatedAt?: number) {
  if (!updatedAt) return "Draf baru";
  const date = new Date(updatedAt);
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  if (isSameDay) return `Hari ini ${time}`;
  return updatedLabel(updatedAt);
}

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function textMetrics(content: string) {
  const words = countWords(content);
  const chars = content.length;
  const lines = content ? content.split(/\r?\n/).length : 0;
  const minutes =
    words === 0 ? "0 mnt" : words < 180 ? "< 1 mnt" : `${Math.ceil(words / 180)} mnt`;
  return { words, chars, lines, minutes };
}

function cleanPreview(content: string) {
  if (!content.trim()) return "Belum ada isi catatan.";
  return content
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^#{1,3}\s+/, "")
        .replace(/^[-*]\s+\[[ xX]\]\s+/, "☐ ")
        .replace(/^[-*]\s+/, "• ")
        .trim(),
    )
    .filter(Boolean)
    .join(" · ");
}

function matchesTimeRange(timestamp: number, range: TimeRange, now: number) {
  if (range === "all") return true;
  if (!timestamp) return range === "today";
  const diff = Math.max(0, now - timestamp);
  if (range === "today") return diff <= FRESH_WINDOW_MS;
  if (range === "week") return diff <= WEEK_WINDOW_MS;
  return diff <= MONTH_WINDOW_MS;
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
  onAddProject,
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
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [colorFilter, setColorFilter] = useState<NoteColor | "all">("all");
  const [pendingNewColor, setPendingNewColor] = useState<NoteColor>("butter");
  const [editorMode, setEditorMode] = useState<"write" | "read">("write");
  const [copiedNote, setCopiedNote] = useState(false);
  const [now] = useState(() => Date.now());
  const savePromiseRef = useRef<Promise<Note | null> | null>(null);
  const contentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  const noteCountByProject = useMemo(() => {
    const counts = new Map<string, { count: number; latest: number }>();
    for (const note of notes) {
      const key = note.projectId || "__none__";
      const existing = counts.get(key) ?? { count: 0, latest: 0 };
      counts.set(key, {
        count: existing.count + 1,
        latest: Math.max(existing.latest, note.updatedAt || 0),
      });
    }
    return counts;
  }, [notes]);

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
      if (colorFilter !== "all" && resolveNoteColor(note) !== colorFilter) {
        return false;
      }
      if (!matchesTimeRange(note.updatedAt, timeRange, now)) {
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
  }, [sorted, search, projectFilter, colorFilter, timeRange, now, projectMap]);

  const activeRecord = detailId ? notes.find((note) => note.id === detailId) : undefined;
  const editor = detailId == null ? undefined : editors.get(detailId);
  const dirty = Boolean(
    editor &&
      (editor.draft.title !== editor.saved.title ||
        editor.draft.content !== editor.saved.content ||
        (editor.draft.projectId || "") !== (editor.saved.projectId || "") ||
        (editor.draft.color || "butter") !== (editor.saved.color || "butter")),
  );
  const initialProjectId =
    projectFilter && projectFilter !== "__none__" && projectMap.has(projectFilter)
      ? projectFilter
      : "";
  const saved: Draft | null =
    !dirty && activeRecord && activeRecord.updatedAt >= (editor?.savedAt ?? 0)
      ? {
          id: activeRecord.id,
          title: activeRecord.title,
          content: activeRecord.content,
          projectId: activeRecord.projectId || "",
          color: resolveNoteColor(activeRecord),
        }
      : editor?.saved ??
        (detailId === "" ? emptyDraft(initialProjectId, pendingNewColor) : null);
  const draft = dirty ? editor!.draft : saved;

  useEffect(() => {
    const synced = notes.filter((note) => {
      const entry = editors.get(note.id);
      return (
        entry?.savedAt != null &&
        note.updatedAt >= entry.savedAt &&
        entry.draft === entry.saved
      );
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
            color: resolveNoteColor(note),
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
                (currentDraft.projectId || "") !== (snapshot.projectId || "") ||
                (currentDraft.color || "butter") !== (snapshot.color || "butter"));
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
      color: draft.color || "butter",
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
          color: draft.color || "butter",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveRequest]);

  useEffect(() => {
    setCopiedNote(false);
    setConfirm(null);
    setPendingLeave(null);
    setEditorMode("write");
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

  function setDraft(nextDraft: Draft) {
    if (detailId == null || !saved) return;
    updateEditor(detailId, { draft: nextDraft, saved, savedAt: editor?.savedAt });
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
        color: draft.color || "butter",
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

  function openNewWithColor(color: NoteColor) {
    setPendingNewColor(color);
    onOpen("");
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
      updateEditor(
        detailId,
        editor?.savedAt ? { draft: saved, saved, savedAt: editor.savedAt } : null,
      );
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
        color: draft.color || "butter",
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

  function insertMarkdownLine(prefix: string) {
    if (!draft) return;
    setEditorMode("write");
    const textarea = contentInputRef.current;
    const current = draft.content;
    if (!textarea) {
      const spacer = current && !current.endsWith("\n") ? "\n" : "";
      setDraft({ ...draft, content: `${current}${spacer}${prefix}` });
      return;
    }
    const start = textarea.selectionStart ?? current.length;
    const end = textarea.selectionEnd ?? current.length;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const needsNewline = before.length > 0 && !before.endsWith("\n");
    const insertion = `${needsNewline ? "\n" : ""}${prefix}`;
    const nextContent = `${before}${insertion}${after}`;
    setDraft({ ...draft, content: nextContent });
    const caret = before.length + insertion.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  function toggleChecklistLine(lineIndex: number) {
    if (!draft) return;
    const lines = draft.content.split(/\r?\n/);
    const target = lines[lineIndex];
    if (target == null) return;
    if (/^(\s*[-*]\s+)\[ \]/.test(target)) {
      lines[lineIndex] = target.replace(/^(\s*[-*]\s+)\[ \]/, "$1[x]");
    } else if (/^(\s*[-*]\s+)\[[xX]\]/.test(target)) {
      lines[lineIndex] = target.replace(/^(\s*[-*]\s+)\[[xX]\]/, "$1[ ]");
    }
    setDraft({ ...draft, content: lines.join("\n") });
  }

  if (!active) return null;

  if (draft) {
    const isNew = !draft.id;
    const activeColor: NoteColor = draft.color || "butter";
    const metrics = textMetrics(draft.content);
    const otherNotes = [...notes]
      .filter((n) => n.id !== draft.id)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 4);
    const saveState =
      saving || (dirty && Boolean(draft.title.trim()))
        ? "dirty"
        : dirty
          ? "new"
          : isNew
            ? "new"
            : "saved";
    const saveLabel =
      saving || (dirty && Boolean(draft.title.trim()))
        ? "Menyimpan…"
        : dirty
          ? "Isi judul untuk simpan"
          : isNew
            ? "Draf baru"
            : "Tersimpan";
    const contentLines = draft.content.split(/\r?\n/);

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
        {/* Minimal editorial top bar */}
        <div className="note-detail-actions">
          <div className="note-detail-actions-start">
            <button type="button" className="back-button note-back-pill" onClick={requestBack}>
              <WorkspaceIcon name="back" />
              <span>Kembali ke Notes</span>
            </button>
            <h1 id="note-title" className="note-top-title">
              {isNew ? "Catatan baru" : draft.title || "Tanpa judul"}
            </h1>
            <span className="note-save-pill" data-state={saveState} role="status">
              <span className="note-save-dot" aria-hidden="true" />
              <span>{saveLabel}</span>
            </span>
          </div>

          <div className="note-detail-actions-end">
            <button
              type="button"
              className="note-icon-pill"
              onClick={copyContent}
              disabled={!draft.title.trim() && !draft.content.trim()}
              aria-label={copiedNote ? "Catatan tersalin" : "Salin catatan"}
              title={copiedNote ? "Catatan tersalin" : "Salin catatan"}
            >
              <WorkspaceIcon name={copiedNote ? "check" : "share"} />
            </button>

            {!isNew && (
              <button
                type="button"
                className="danger-button note-delete-btn"
                onClick={() => setConfirm("delete")}
                disabled={deletingBusy}
              >
                <WorkspaceIcon name="trash" />
                <span>Hapus catatan</span>
              </button>
            )}
          </div>
        </div>

        <div className="note-detail-layout">
          {/* Neutral paper editorial sheet */}
          <div className="note-editor note-paper-sheet card" data-dirty={dirty}>
            <div className="note-paper-header">
              <label htmlFor="note-title-input" className="sr-only">
                Judul catatan
              </label>
              <input
                id="note-title-input"
                className="note-title-input note-editorial-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                placeholder="Tulis judul catatan…"
                autoFocus={isNew}
                disabled={deletingBusy}
              />

              {/* Rounded metadata pill chips */}
              <div className="note-meta-pills">
                <span className="note-meta-chip">
                  <WorkspaceIcon name="calendar" />
                  <span>{chipTimeLabel(activeRecord?.updatedAt)}</span>
                </span>

                <div className="note-meta-chip note-meta-project-chip">
                  <WorkspaceIcon name="folder" />
                  <Select
                    id="note-project-select"
                    aria-label="Proyek terkait catatan"
                    value={draft.projectId || ""}
                    disabled={deletingBusy}
                    onChange={(event) =>
                      setDraft({ ...draft, projectId: event.target.value })
                    }
                  >
                    <option value="">Tanpa proyek</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </Select>
                </div>

                {draft.projectId && projectMap.has(draft.projectId) && (
                  <button
                    type="button"
                    className="note-meta-chip note-meta-link-chip"
                    onClick={() => onOpenProject(draft.projectId!)}
                  >
                    <span>Buka proyek</span>
                    <WorkspaceIcon name="arrowRight" />
                  </button>
                )}

                <div
                  className="note-meta-chip note-color-chip-group"
                  role="group"
                  aria-label="Warna kartu catatan"
                >
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="note-color-dot-btn"
                      data-active={activeColor === c}
                      aria-label={`Warna ${NOTE_COLOR_META[c].label}`}
                      aria-pressed={activeColor === c}
                      title={`Warna kartu: ${NOTE_COLOR_META[c].label}`}
                      onClick={() => setDraft({ ...draft, color: c })}
                      disabled={deletingBusy}
                    >
                      <span
                        className="note-color-dot"
                        style={{ backgroundColor: NOTE_COLOR_META[c].dot }}
                      />
                    </button>
                  ))}
                </div>

                <div className="note-mode-switch" role="group" aria-label="Mode tampilan isi">
                  <button
                    type="button"
                    className="note-mode-btn"
                    aria-pressed={editorMode === "write"}
                    onClick={() => setEditorMode("write")}
                  >
                    Tulis
                  </button>
                  <button
                    type="button"
                    className="note-mode-btn"
                    aria-pressed={editorMode === "read"}
                    onClick={() => setEditorMode("read")}
                  >
                    Baca
                  </button>
                </div>
              </div>
            </div>

            {editorMode === "write" ? (
              <div className="note-field note-field-body">
                <label htmlFor="note-content-input" className="sr-only">
                  Isi catatan
                </label>
                <textarea
                  ref={contentInputRef}
                  id="note-content-input"
                  className="note-content-input note-editorial-textarea"
                  value={draft.content}
                  onChange={(event) =>
                    setDraft({ ...draft, content: event.target.value })
                  }
                  placeholder="Mulai menulis… Gunakan # untuk subjudul, - untuk poin, atau - [ ] untuk tugas."
                  rows={15}
                  autoFocus={!isNew}
                  disabled={deletingBusy}
                />

                <div className="note-format-dock" role="toolbar" aria-label="Bantuan format catatan">
                  <button
                    type="button"
                    className="note-format-btn"
                    onClick={() => insertMarkdownLine("# ")}
                    disabled={deletingBusy}
                  >
                    # Judul
                  </button>
                  <button
                    type="button"
                    className="note-format-btn"
                    onClick={() => insertMarkdownLine("- ")}
                    disabled={deletingBusy}
                  >
                    • Poin
                  </button>
                  <button
                    type="button"
                    className="note-format-btn"
                    onClick={() => insertMarkdownLine("- [ ] ")}
                    disabled={deletingBusy}
                  >
                    ☐ Tugas
                  </button>
                </div>
              </div>
            ) : (
              <div className="note-editorial-reader" aria-label="Pratinjau isi catatan">
                {!draft.content.trim() ? (
                  <p className="note-reader-empty">
                    Belum ada isi catatan. Pindah ke mode Tulis untuk mulai mengetik.
                  </p>
                ) : (
                  contentLines.map((line, index) => {
                    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
                    if (headingMatch) {
                      return (
                        <div key={index} className="note-reader-heading">
                          <span className="note-reader-hash" aria-hidden="true">
                            #
                          </span>
                          <h2>{headingMatch[1]}</h2>
                        </div>
                      );
                    }
                    const checkMatch = line.match(/^\s*[-*]\s+\[([ xX])\]\s*(.*)$/);
                    if (checkMatch) {
                      const checked = checkMatch[1].toLowerCase() === "x";
                      return (
                        <label
                          key={index}
                          className="note-reader-check"
                          data-checked={checked}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChecklistLine(index)}
                            disabled={deletingBusy}
                          />
                          <span>{checkMatch[2] || "Tugas"}</span>
                        </label>
                      );
                    }
                    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
                    if (bulletMatch) {
                      return (
                        <div key={index} className="note-reader-bullet">
                          <span className="note-reader-bullet-dot" aria-hidden="true">
                            •
                          </span>
                          <p>{bulletMatch[1]}</p>
                        </div>
                      );
                    }
                    if (!line.trim()) {
                      return <div key={index} className="note-reader-spacer" />;
                    }
                    return (
                      <p key={index} className="note-reader-paragraph">
                        {line}
                      </p>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Quiet editorial side rail */}
          <div className="note-detail-rail">
            <section
              className="card detail-section note-rail-card"
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
                className="card detail-section note-rail-card"
                aria-labelledby="note-switcher-heading"
              >
                <div className="detail-section-head">
                  <div className="detail-section-title">
                    <h2 id="note-switcher-heading">Catatan lainnya</h2>
                  </div>
                  <span className="count">{otherNotes.length}</span>
                </div>
                <nav className="note-switcher" aria-label="Beralih catatan">
                  {otherNotes.map((item) => {
                    const itemColor = resolveNoteColor(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="note-switcher-item"
                        onClick={() => requestSwitch(item)}
                      >
                        <span className="note-switcher-main">
                          <span
                            className="note-switcher-dot"
                            style={{ backgroundColor: NOTE_COLOR_META[itemColor].dot }}
                            aria-hidden="true"
                          />
                          <span className="note-switcher-title">{item.title}</span>
                        </span>
                        <small>{countWords(item.content)} kata</small>
                      </button>
                    );
                  })}
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
              <p>
                Catatan belum memiliki judul sehingga perubahan belum dapat disimpan otomatis.
              </p>
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

  const activeProjectTitle =
    projectFilter === "__none__"
      ? "Catatan mandiri"
      : projectFilter
        ? projectMap.get(projectFilter)?.title || ""
        : "";

  return (
    <section className="notes-page" aria-labelledby="notes-heading">
      <div className="heading">
        <div>
          <h1 id="notes-heading">Notes</h1>
          <p>Simpan ide, konteks, dan keputusan penting di satu tempat.</p>
        </div>
        <div className="notes-hero-right">
          <div className="notes-quick-dots" role="group" aria-label="Buat catatan cepat berdasarkan warna">
            <span className="notes-quick-dots-label">Quick:</span>
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="note-color-dot-btn"
                aria-label={`Buat catatan ${NOTE_COLOR_META[c].label}`}
                title={`Buat catatan baru warna ${NOTE_COLOR_META[c].label}`}
                onClick={() => openNewWithColor(c)}
              >
                <span
                  className="note-color-dot"
                  style={{ backgroundColor: NOTE_COLOR_META[c].dot }}
                />
              </button>
            ))}
          </div>

          {notes.length > 0 && (
            <div className="notes-count-pill">
              <span>Total catatan</span>
              <strong>{notes.length}</strong>
            </div>
          )}
          <button type="button" className="primary" onClick={() => openNewWithColor("butter")}>
            Tambah catatan
          </button>
        </div>
      </div>

      {/* Folder / Proyek Pastel Cards (MINO-inspired) */}
      {!loading && projects.length > 0 && (
        <section className="notes-folders-section" aria-labelledby="notes-folders-heading">
          <div className="notes-section-head">
            <h2 id="notes-folders-heading">Folder Proyek</h2>
            {projectFilter && (
              <button
                type="button"
                className="notes-clear-folder-btn"
                onClick={() => onProjectFilterChange("")}
              >
                Tampilkan semua
              </button>
            )}
          </div>

          <div className="notes-folders-grid">
            {projects.slice(0, 6).map((project, index) => {
              const tone = FOLDER_TONES[index % FOLDER_TONES.length];
              const stats = noteCountByProject.get(project.id) ?? { count: 0, latest: 0 };
              const selected = projectFilter === project.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  className="note-folder-card"
                  data-tone={tone}
                  data-selected={selected}
                  aria-pressed={selected}
                  onClick={() => onProjectFilterChange(selected ? "" : project.id)}
                >
                  <div className="note-folder-card-top">
                    <span className="note-folder-icon" aria-hidden="true">
                      <WorkspaceIcon name="folder" />
                    </span>
                    <span className="note-folder-dots" aria-hidden="true">
                      •••
                    </span>
                  </div>
                  <div className="note-folder-card-body">
                    <strong>{project.title}</strong>
                    <span>
                      {stats.count} catatan
                      {stats.latest ? ` · ${shortDateLabel(stats.latest)}` : ""}
                    </span>
                  </div>
                </button>
              );
            })}

            {onAddProject && (
              <button
                type="button"
                className="note-dashed-card note-folder-add-card"
                onClick={onAddProject}
              >
                <span className="note-dashed-icon" aria-hidden="true">
                  <WorkspaceIcon name="plus" />
                </span>
                <span>Proyek baru</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Notes Toolbar & Filters */}
      {notes.length > 0 && !loading && (
        <div className="notes-section-controls">
          <div className="notes-section-head">
            <div className="notes-section-title-group">
              <h2>Catatan Saya</h2>
              {activeProjectTitle && (
                <span className="notes-active-chip">
                  <span>{activeProjectTitle}</span>
                  <button
                    type="button"
                    aria-label="Hapus filter proyek"
                    onClick={() => onProjectFilterChange("")}
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <div className="notes-time-tabs" role="group" aria-label="Filter waktu catatan">
              {(
                [
                  ["all", "Semua"],
                  ["today", "Hari Ini"],
                  ["week", "Minggu Ini"],
                  ["month", "Bulan Ini"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="notes-time-tab"
                  aria-pressed={timeRange === key}
                  onClick={() => setTimeRange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

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

            <div className="notes-color-filter-row" role="group" aria-label="Filter warna catatan">
              <button
                type="button"
                className="notes-color-pill"
                aria-pressed={colorFilter === "all"}
                onClick={() => setColorFilter("all")}
              >
                Semua warna
              </button>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="notes-color-pill"
                  aria-pressed={colorFilter === c}
                  onClick={() => setColorFilter(colorFilter === c ? "all" : c)}
                >
                  <span
                    className="note-color-dot"
                    style={{ backgroundColor: NOTE_COLOR_META[c].dot }}
                    aria-hidden="true"
                  />
                  <span>{NOTE_COLOR_META[c].label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p role="status">Memuat catatan…</p>
      ) : visibleNotes.length ? (
        <div className="notes-grid-wrap">
          <div className="notes-grid" role="list" aria-label="Daftar catatan">
            {visibleNotes.map((note) => {
              const isFresh =
                note.updatedAt > 0 && now - note.updatedAt < FRESH_WINDOW_MS;
              const cardColor = resolveNoteColor(note);
              const linkedProject = note.projectId
                ? projectMap.get(note.projectId)
                : undefined;
              return (
                <article
                  key={note.id}
                  className="note-card card"
                  role="listitem"
                  data-fresh={isFresh}
                  data-color={cardColor}
                >
                  <button
                    type="button"
                    className="note-card-open"
                    onClick={() => onOpen(note.id)}
                    aria-label={`Buka catatan ${note.title}`}
                  >
                    <div className="note-card-top">
                      <time
                        className="note-card-date"
                        dateTime={new Date(note.updatedAt).toISOString()}
                      >
                        {shortDateLabel(note.updatedAt)}
                      </time>
                      <span className="note-card-edit-cue" aria-hidden="true">
                        <WorkspaceIcon name="edit" />
                      </span>
                    </div>

                    <div className="note-card-title-row">
                      <h2>{note.title}</h2>
                    </div>

                    <p>{cleanPreview(note.content)}</p>

                    <div className="note-card-foot">
                      <span className="note-card-project-label">
                        {linkedProject ? linkedProject.title : isFresh ? "Baru diedit" : "Catatan mandiri"}
                      </span>
                      <span className="note-card-words">
                        {countWords(note.content)} kata
                      </span>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            className="note-dashed-card note-add-inline-card"
            onClick={() =>
              openNewWithColor(colorFilter === "all" ? "butter" : colorFilter)
            }
          >
            <span className="note-dashed-icon" aria-hidden="true">
              <WorkspaceIcon name="edit" />
            </span>
            <span>Catatan baru</span>
          </button>
        </div>
      ) : notes.length ? (
        <div className="notes-empty card">
          <h2>Catatan tidak ditemukan</h2>
          <p>
            Coba kata kunci, warna, atau filter proyek lain untuk menemukan catatan yang kamu cari.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTimeRange("all");
              setColorFilter("all");
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
            onClick={() => openNewWithColor("butter")}
          >
            Tambah catatan
          </button>
        </div>
      )}
    </section>
  );
}
