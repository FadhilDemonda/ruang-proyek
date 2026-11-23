"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Modal from "./Modal";
import WorkspaceIcon from "./WorkspaceIcon";
import type { Item, Note } from "./types";
import type { WorkspaceSection } from "./workspaceRoute";

type Props = {
  projects: Item[];
  todos: Item[];
  requests: Item[];
  notes: Note[];
  dark: boolean;
  onClose: () => void;
  onNavigate: (section: WorkspaceSection, projectId?: string) => void;
  onOpenDetail: (section: "projects" | "todos" | "requests" | "notes", id: string) => void;
  onAddProject: () => void;
  onAddTask: () => void;
  onAddRequest: () => void;
  onAddNote: () => void;
  onToggleTheme: () => void;
  projectName: (id?: string) => string;
};

type CommandEntry = {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  badge?: string;
  icon: "overview" | "projects" | "todos" | "calendar" | "requests" | "notes" | "plus" | "sun" | "moon";
  keywords: string;
  run: () => void;
};

export default function CommandPalette({
  projects,
  todos,
  requests,
  notes,
  dark,
  onClose,
  onNavigate,
  onOpenDetail,
  onAddProject,
  onAddTask,
  onAddRequest,
  onAddNote,
  onToggleTheme,
  projectName,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.title])),
    [projects],
  );

  const actions = useMemo<CommandEntry[]>(
    () => [
      {
        id: "action:add-todo",
        group: "Aksi cepat",
        title: "Tambah tugas (To-do) baru",
        subtitle: "Buat tugas baru ke Kanban atau daftar",
        icon: "plus",
        keywords: "tambah buat todo tugas baru task",
        run: onAddTask,
      },
      {
        id: "action:add-project",
        group: "Aksi cepat",
        title: "Tambah proyek baru",
        subtitle: "Buat ruang proyek baru beserta folder & link",
        icon: "plus",
        keywords: "tambah buat proyek project baru",
        run: onAddProject,
      },
      {
        id: "action:add-note",
        group: "Aksi cepat",
        title: "Tambah catatan baru",
        subtitle: "Tulis catatan atau ide baru di Notes",
        icon: "plus",
        keywords: "tambah buat note catatan baru tulis",
        run: onAddNote,
      },
      {
        id: "action:add-request",
        group: "Aksi cepat",
        title: "Tambah request baru",
        subtitle: "Catat permintaan masuk untuk ditindaklanjuti",
        icon: "plus",
        keywords: "tambah buat request permintaan baru",
        run: onAddRequest,
      },
      {
        id: "action:theme",
        group: "Aksi cepat",
        title: dark ? "Aktifkan mode terang" : "Aktifkan mode gelap",
        subtitle: "Ubah tampilan warna ruang kerja",
        icon: dark ? "sun" : "moon",
        keywords: "tema theme dark light gelap terang",
        run: onToggleTheme,
      },
      {
        id: "nav:overview",
        group: "Navigasi",
        title: "Buka Hari Ini",
        subtitle: "Ringkasan tugas hari ini, proyek aktif, dan request baru",
        icon: "overview",
        keywords: "hari ini ringkasan overview dashboard beranda",
        run: () => onNavigate("overview"),
      },
      {
        id: "nav:projects",
        group: "Navigasi",
        title: "Buka Proyek",
        subtitle: `${projects.length} proyek tersimpan`,
        icon: "projects",
        keywords: "proyek projects daftar arsip",
        run: () => onNavigate("projects"),
      },
      {
        id: "nav:todos",
        group: "Navigasi",
        title: "Buka To-do",
        subtitle: `${todos.length} tugas di Kanban & daftar`,
        icon: "todos",
        keywords: "todo tugas kanban papan",
        run: () => onNavigate("todos"),
      },
      {
        id: "nav:calendar",
        group: "Navigasi",
        title: "Buka Kalender",
        subtitle: "Jadwal tenggat proyek, to-do, dan request",
        icon: "calendar",
        keywords: "kalender calendar jadwal tenggat deadline",
        run: () => onNavigate("calendar"),
      },
      {
        id: "nav:requests",
        group: "Navigasi",
        title: "Buka Request",
        subtitle: `${requests.length} permintaan tercatat`,
        icon: "requests",
        keywords: "request permintaan masuk konversi",
        run: () => onNavigate("requests"),
      },
      {
        id: "nav:notes",
        group: "Navigasi",
        title: "Buka Notes",
        subtitle: `${notes.length} catatan tersimpan`,
        icon: "notes",
        keywords: "notes catatan tulisan ide",
        run: () => onNavigate("notes"),
      },
    ],
    [
      dark,
      projects.length,
      todos.length,
      requests.length,
      notes.length,
      onAddTask,
      onAddProject,
      onAddNote,
      onAddRequest,
      onToggleTheme,
      onNavigate,
    ],
  );

  const records = useMemo<CommandEntry[]>(() => {
    const projectEntries: CommandEntry[] = projects.map((project) => ({
      id: `projects:${project.id}`,
      group: "Proyek",
      title: project.title,
      subtitle: project.description || project.folder || "Proyek",
      badge: project.status,
      icon: "projects",
      keywords: `${project.title} ${project.description || ""} ${project.folder || ""} ${project.status}`,
      run: () => onOpenDetail("projects", project.id),
    }));

    const todoEntries: CommandEntry[] = todos.map((task) => {
      const checklistText = (task.checklist || []).map((c) => c.text).join(" ");
      return {
        id: `todos:${task.id}`,
        group: "To-do",
        title: task.title,
        subtitle: `${projectName(task.projectId)}${task.date ? ` · ${task.date}` : ""}${task.priority ? ` · Prioritas ${task.priority}` : ""}`,
        badge: task.status,
        icon: "todos",
        keywords: `${task.title} ${task.description || ""} ${projectName(task.projectId)} ${task.priority || ""} ${task.status} ${checklistText}`,
        run: () => onOpenDetail("todos", task.id),
      };
    });

    const requestEntries: CommandEntry[] = requests.map((request) => ({
      id: `requests:${request.id}`,
      group: "Request",
      title: request.title,
      subtitle: `${request.requester || "Tanpa peminta"}${request.date ? ` · ${request.date}` : ""}`,
      badge: request.status,
      icon: "requests",
      keywords: `${request.title} ${request.description || ""} ${request.requester || ""} ${request.status}`,
      run: () => onOpenDetail("requests", request.id),
    }));

    const noteEntries: CommandEntry[] = notes.map((note) => {
      const linked = note.projectId ? projectMap.get(note.projectId) : "";
      return {
        id: `notes:${note.id}`,
        group: "Notes",
        title: note.title,
        subtitle: linked
          ? `${linked}${note.content ? ` · ${note.content.slice(0, 60)}` : ""}`
          : note.content.slice(0, 80) || "Catatan mandiri",
        badge: linked || undefined,
        icon: "notes",
        keywords: `${note.title} ${note.content} ${linked || ""}`,
        run: () => onOpenDetail("notes", note.id),
      };
    });

    return [...projectEntries, ...todoEntries, ...requestEntries, ...noteEntries];
  }, [projects, todos, requests, notes, projectMap, projectName, onOpenDetail]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...actions.slice(0, 5), ...actions.slice(5), ...records.slice(0, 5)];
    }
    const terms = q.split(/\s+/).filter(Boolean);
    const matches = (entry: CommandEntry) => {
      const haystack = `${entry.title} ${entry.subtitle || ""} ${entry.keywords}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    };
    return [...records.filter(matches), ...actions.filter(matches)].slice(0, 24);
  }, [query, actions, records]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, { entry: CommandEntry; index: number }[]>();
    results.forEach((entry, index) => {
      const list = map.get(entry.group) || [];
      list.push({ entry, index });
      map.set(entry.group, list);
    });
    return Array.from(map.entries());
  }, [results]);

  function execute(entry: CommandEntry) {
    onClose();
    entry.run();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length > 0) {
        setActiveIndex((prev) => (prev + 1) % results.length);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length > 0) {
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
      }
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      execute(results[activeIndex]);
    }
  }

  return (
    <Modal
      labelledBy="command-palette-heading"
      className="command-modal"
      onClose={onClose}
    >
      <div className="command-palette card" onKeyDown={handleKeyDown}>
        <h2 id="command-palette-heading" className="visually-hidden">
          Pencarian global dan perintah cepat
        </h2>
        <div className="command-search-row">
          <WorkspaceIcon name="search" />
          <input
            type="text"
            autoFocus
            aria-label="Cari di seluruh ruang kerja"
            placeholder="Cari proyek, to-do, request, catatan, atau perintah…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="command-clear-btn"
              aria-label="Bersihkan kata kunci"
              onClick={() => setQuery("")}
            >
              ×
            </button>
          )}
          <button
            type="button"
            className="command-close-btn"
            aria-label="Tutup pencarian cepat"
            onClick={onClose}
          >
            Esc
          </button>
        </div>

        <div className="command-results" role="listbox" aria-label="Hasil pencarian cepat">
          {grouped.length === 0 ? (
            <div className="command-empty">
              <p>Tidak ditemukan hasil untuk “{query}”.</p>
            </div>
          ) : (
            grouped.map(([groupName, groupItems]) => (
              <div key={groupName} className="command-group">
                <div className="command-group-label">{groupName}</div>
                {groupItems.map(({ entry, index }) => {
                  const selected = index === activeIndex;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={"command-item " + (selected ? "is-active" : "")}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => execute(entry)}
                    >
                      <span className="command-item-icon" aria-hidden="true">
                        <WorkspaceIcon name={entry.icon} />
                      </span>
                      <span className="command-item-copy">
                        <strong>{entry.title}</strong>
                        {entry.subtitle && <small>{entry.subtitle}</small>}
                      </span>
                      {entry.badge && (
                        <span className="command-item-badge">{entry.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="command-footer" aria-hidden="true">
          <span>↑↓ pilih</span>
          <span>Enter buka</span>
          <span>Esc tutup</span>
        </div>
      </div>
    </Modal>
  );
}
