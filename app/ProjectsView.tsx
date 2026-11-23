"use client";

import { useEffect, useMemo, useState } from "react";
import Select from "./Select";
import WorkspaceIcon from "./WorkspaceIcon";
import { TODO_STATUSES, todoTone, type Item, type Note, type TodoPriority } from "./types";

type Props = {
  projects: Item[];
  visibleProjects: Item[];
  todos: Item[];
  notes: Note[];
  statuses: string[];
  loading: boolean;
  search: string;
  filter: string;
  detail: Item | null;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onSelectDetail: (project: Item | null) => void;
  onAddProject: () => void;
  onEditProject: (project: Item) => void;
  onDeleteProject: (project: Item) => void;
  onOpenKanban: (projectId: string) => void;
  onAddTaskForProject: (projectId: string) => void;
  onOpenTask: (task: Item) => void;
  onOpenNote: (noteId: string) => void;
  onAddNoteForProject: (projectId: string) => void;
  onChangeTaskStatus: (task: Item, status: string) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
};

function priorityTone(priority?: TodoPriority | null) {
  if (priority === "Tinggi") return "high";
  if (priority === "Sedang") return "medium";
  if (priority === "Rendah") return "low";
  return "";
}

type ProjectTone = "plan" | "progress" | "done" | "archived";

const TONE_BY_STATUS: Record<string, ProjectTone> = {
  Direncanakan: "plan",
  Dikerjakan: "progress",
  Selesai: "done",
  Diarsipkan: "archived",
};

function projectTone(status: string): ProjectTone {
  return TONE_BY_STATUS[status] ?? "plan";
}

function formatDateLabel(timestamp?: number) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function formatHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function ProjectsView({
  projects,
  visibleProjects,
  todos,
  notes,
  statuses,
  loading,
  search,
  filter,
  detail,
  onSearchChange,
  onFilterChange,
  onSelectDetail,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onOpenKanban,
  onAddTaskForProject,
  onOpenTask,
  onOpenNote,
  onAddNoteForProject,
  onChangeTaskStatus,
  onNotice,
  onError,
}: Props) {
  const [copiedFolder, setCopiedFolder] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "title" | "date">("recent");

  useEffect(() => {
    setCopiedFolder(false);
  }, [detail?.id, detail?.folder]);

  useEffect(() => {
    if (!copiedFolder) return;
    const timer = setTimeout(() => setCopiedFolder(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedFolder]);

  const sortedProjects = useMemo(() => {
    const copy = [...visibleProjects];
    if (sortBy === "title") {
      return copy.sort((a, b) => a.title.localeCompare(b.title, "id"));
    }
    if (sortBy === "date") {
      return copy.sort((a, b) => {
        if (!a.date && !b.date) return (b.updatedAt || 0) - (a.updatedAt || 0);
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
    }
    return copy;
  }, [visibleProjects, sortBy]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const status of statuses) byStatus[status] = 0;
    for (const project of projects) {
      byStatus[project.status] = (byStatus[project.status] || 0) + 1;
    }
    return {
      total: projects.length,
      planned: byStatus["Direncanakan"] || 0,
      working: byStatus["Dikerjakan"] || 0,
      done: byStatus["Selesai"] || 0,
      byStatus,
    };
  }, [projects, statuses]);

  const todoStatsByProject = useMemo(() => {
    const map = new Map<string, { total: number; done: number; percent: number }>();
    for (const todo of todos) {
      if (!todo.projectId) continue;
      const entry = map.get(todo.projectId) || { total: 0, done: 0, percent: 0 };
      entry.total += 1;
      if (todo.status === "Selesai") entry.done += 1;
      entry.percent = Math.round((entry.done / entry.total) * 100);
      map.set(todo.projectId, entry);
    }
    return map;
  }, [todos]);

  const noteCountByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notes) {
      if (!note.projectId) continue;
      map.set(note.projectId, (map.get(note.projectId) || 0) + 1);
    }
    return map;
  }, [notes]);

  if (detail) {
    const tone = projectTone(detail.status);
    const relatedTodos = todos
      .filter((t) => t.projectId === detail.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    const relatedNotes = notes
      .filter((n) => n.projectId === detail.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const doneTodos = relatedTodos.filter((t) => t.status === "Selesai").length;
    const progressPercent = relatedTodos.length
      ? Math.round((doneTodos / relatedTodos.length) * 100)
      : 0;
    const today = new Date().toLocaleDateString("en-CA");

    async function copyFolder() {
      if (!detail?.folder) return;
      try {
        await navigator.clipboard.writeText(detail.folder);
        setCopiedFolder(true);
        onNotice("Lokasi disalin.");
      } catch {
        onError("Gagal menyalin. Pilih dan salin lokasi secara manual.");
      }
    }

    return (
      <div className="project-detail-page">
        <div className="detail-nav">
          <button
            type="button"
            className="back-button"
            onClick={() => onSelectDetail(null)}
          >
            <WorkspaceIcon name="back" />
            <span>Kembali ke proyek</span>
          </button>
          {detail.updatedAt && (
            <span className="detail-updated">
              Diperbarui {formatDateLabel(detail.updatedAt)}
            </span>
          )}
        </div>

        <section className="detail-hero card" data-tone={tone}>
          <div className="detail-hero-top">
            <div className="detail-hero-main">
              <div className="detail-hero-icon" data-tone={tone} aria-hidden="true">
                <WorkspaceIcon name="projects" />
              </div>
              <div className="detail-hero-copy">
                <span className="badge" data-status={detail.status}>
                  {detail.status}
                </span>
                <h1>{detail.title}</h1>
                <p className="detail-hero-desc">
                  {detail.description || "Belum ada deskripsi proyek."}
                </p>
                <div className="project-mode-switch" role="group" aria-label="Tampilan proyek">
                  <button
                    type="button"
                    className="project-mode-btn"
                    onClick={() => onOpenKanban(detail.id)}
                  >
                    <WorkspaceIcon name="todos" />
                    <span>Kanban To-do</span>
                  </button>
                  <button
                    type="button"
                    className="project-mode-btn is-active"
                    aria-current="page"
                  >
                    <WorkspaceIcon name="projects" />
                    <span>Isi Proyek</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="detail-hero-actions">
              <button type="button" onClick={() => onOpenKanban(detail.id)}>
                Buka Kanban proyek
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => onEditProject(detail)}
              >
                Edit proyek
              </button>
              <button
                type="button"
                className="danger-button"
                aria-label={`Hapus ${detail.title}`}
                onClick={() => onDeleteProject(detail)}
              >
                <WorkspaceIcon name="trash" />
                <span>Hapus</span>
              </button>
            </div>
          </div>

          <dl className="detail-hero-meta">
            <div className="detail-meta-item">
              <dt>Tanggal target</dt>
              <dd>{detail.date || "Belum diatur"}</dd>
            </div>
            <div className="detail-meta-item">
              <dt>Tautan deliverable</dt>
              <dd>{detail.links?.length || 0} link</dd>
            </div>
            <div className="detail-meta-item detail-meta-progress">
              <dt>Progres To-do</dt>
              <dd>
                {relatedTodos.length ? (
                  <div className="detail-progress-wrap">
                    <div
                      className="project-progress-track"
                      role="progressbar"
                      aria-valuenow={progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Progres penyelesaian tugas proyek"
                    >
                      <span style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="detail-progress-label">
                      {progressPercent}% ({doneTodos}/{relatedTodos.length})
                    </span>
                  </div>
                ) : (
                  <span>Belum ada tugas</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <div className="detail-grid">
          <div className="detail-main-column">
            <section
              className="card detail-section"
              aria-labelledby="detail-todos-heading"
            >
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <h2 id="detail-todos-heading">To-do terkait</h2>
                  <span className="count">{relatedTodos.length}</span>
                </div>
                <button
                  type="button"
                  className="detail-inline-add"
                  onClick={() => onAddTaskForProject(detail.id)}
                >
                  <WorkspaceIcon name="plus" />
                  <span>Tambah tugas</span>
                </button>
              </div>

              {relatedTodos.length ? (
                <div className="detail-todo-list">
                  {relatedTodos.map((task) => {
                    const overdue = Boolean(
                      task.date && task.status !== "Selesai" && task.date < today,
                    );
                    const checklist = task.checklist || [];
                    const checklistDone = checklist.filter((c) => c.done).length;
                    return (
                      <article
                        key={task.id}
                        className="detail-todo-row"
                        data-done={task.status === "Selesai"}
                      >
                        <div className="detail-todo-main">
                          <div className="todo-card-tags">
                            <span
                              className={`todo-status-chip tone-${todoTone(task.status)}`}
                            >
                              {task.status}
                            </span>
                            {task.priority && (
                              <span
                                className={`priority-chip priority-${priorityTone(task.priority)}`}
                              >
                                {task.priority}
                              </span>
                            )}
                            {checklist.length > 0 && (
                              <span className="todo-card-checklist-inline">
                                <WorkspaceIcon name="checklist" />
                                <span>
                                  {checklistDone}/{checklist.length}
                                </span>
                              </span>
                            )}
                            {overdue && (
                              <span className="todo-overdue-chip">Terlambat</span>
                            )}
                            {task.date && (
                              <span
                                className={
                                  "detail-todo-date " +
                                  (overdue ? "is-overdue" : "")
                                }
                              >
                                {task.date}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="detail-todo-title"
                            onClick={() => onOpenTask(task)}
                          >
                            {task.title}
                          </button>
                        </div>
                        <div className="detail-todo-controls">
                          <Select
                            aria-label={`Status ${task.title}`}
                            value={task.status}
                            onChange={(e) =>
                              onChangeTaskStatus(task, e.target.value)
                            }
                          >
                            {TODO_STATUSES.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </Select>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="detail-empty-box">
                  <p>Belum ada to-do yang terhubung ke proyek ini.</p>
                  <button
                    type="button"
                    onClick={() => onAddTaskForProject(detail.id)}
                  >
                    + Tambah tugas pertama
                  </button>
                </div>
              )}
            </section>

            <section
              className="card detail-section"
              aria-labelledby="detail-notes-heading"
            >
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <WorkspaceIcon name="notes" />
                  <h2 id="detail-notes-heading">Catatan proyek</h2>
                  <span className="count">{relatedNotes.length}</span>
                </div>
                <button
                  type="button"
                  className="detail-inline-add"
                  onClick={() => onAddNoteForProject(detail.id)}
                >
                  <WorkspaceIcon name="plus" />
                  <span>Tambah catatan</span>
                </button>
              </div>

              {relatedNotes.length ? (
                <div className="detail-notes-list">
                  {relatedNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      className="detail-note-row"
                      onClick={() => onOpenNote(note.id)}
                    >
                      <div className="detail-note-copy">
                        <strong>{note.title}</strong>
                        <p>{note.content || "Belum ada isi catatan."}</p>
                      </div>
                      <span className="detail-note-date">
                        {formatDateLabel(note.updatedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="detail-empty-box">
                  <p>Belum ada catatan yang terhubung ke proyek ini.</p>
                  <button
                    type="button"
                    onClick={() => onAddNoteForProject(detail.id)}
                  >
                    + Tambah catatan proyek
                  </button>
                </div>
              )}
            </section>
          </div>

          <div className="detail-rail">
            <section
              className="card detail-section"
              aria-labelledby="detail-folder-heading"
            >
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <WorkspaceIcon name="folder" />
                  <h2 id="detail-folder-heading">Lokasi folder</h2>
                </div>
              </div>
              {detail.folder ? (
                <div className="detail-folder-wrap">
                  <div className="detail-folder-box">
                    <code className="path">{detail.folder}</code>
                  </div>
                  <button
                    type="button"
                    className="detail-copy-btn"
                    onClick={copyFolder}
                  >
                    <WorkspaceIcon name={copiedFolder ? "check" : "copy"} />
                    <span>{copiedFolder ? "Tersalin" : "Salin lokasi"}</span>
                  </button>
                </div>
              ) : (
                <p className="detail-muted-copy">
                  Lokasi folder lokal belum ditambahkan.
                </p>
              )}
            </section>

            <section
              className="card detail-section"
              aria-labelledby="detail-links-heading"
            >
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <WorkspaceIcon name="link" />
                  <h2 id="detail-links-heading">Link proyek</h2>
                </div>
                <span className="count">{detail.links?.length || 0}</span>
              </div>
              {detail.links?.length ? (
                <div className="detail-links-list">
                  {detail.links.map((link, index) => (
                    <a
                      key={`${link.url}-${index}`}
                      className="detail-link-card"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="detail-link-text">
                        <strong>{link.label}</strong>
                        <small>{formatHostname(link.url)}</small>
                      </div>
                      <WorkspaceIcon name="external" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="detail-muted-copy">
                  Belum ada tautan deliverable atau repositori.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="todo-hero projects-hero">
        <div className="todo-hero-main">
          <div className="todo-hero-copy">
            <h1>Proyek saya</h1>
            <p className="todo-hero-sub">
              Arsip proyek, folder lokal, dan tautanmu.
            </p>
          </div>
        </div>

        <div className="todo-hero-right">
          <dl className="todo-stats" aria-label="Ringkasan status proyek">
            <div className="todo-stat">
              <dt>DIRENCANAKAN</dt>
              <dd className="tone-todo">
                <span className="todo-stat-dot" aria-hidden="true" />
                <span>{counts.planned}</span>
              </dd>
            </div>
            <div className="todo-stat">
              <dt>DIKERJAKAN</dt>
              <dd className="tone-progress">
                <span className="todo-stat-dot" aria-hidden="true" />
                <span>{counts.working}</span>
              </dd>
            </div>
            <div className="todo-stat">
              <dt>SELESAI</dt>
              <dd className="tone-done">
                <span className="todo-stat-dot" aria-hidden="true" />
                <span>{counts.done}</span>
              </dd>
            </div>
          </dl>

          <button
            type="button"
            className="primary todo-add-btn"
            onClick={onAddProject}
          >
            + Tambah proyek
          </button>
        </div>
      </div>

      <section className="projects-section" aria-label="Proyek">
        <div className="projects-toolbar card">
          <div
            className="todo-filter-pills projects-filter-pills"
            role="group"
            aria-label="Filter status proyek"
          >
            <button
              type="button"
              className="todo-pill-btn"
              aria-pressed={filter === "Semua"}
              onClick={() => onFilterChange("Semua")}
            >
              <span>Semua</span>
              <span className="todo-pill-count">{counts.total}</span>
            </button>
            {statuses.map((status) => (
              <button
                key={status}
                type="button"
                className="todo-pill-btn"
                aria-pressed={filter === status}
                onClick={() => onFilterChange(status)}
              >
                <span>{status}</span>
                <span className="todo-pill-count">
                  {counts.byStatus[status] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="projects-toolbar-right">
            <div className="todo-search projects-search">
              <span className="todo-search-icon" aria-hidden="true">
                <WorkspaceIcon name="search" />
              </span>
              <input
                aria-label="Cari proyek"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari proyek…"
              />
              {search && (
                <button
                  type="button"
                  className="todo-search-clear"
                  aria-label="Hapus pencarian proyek"
                  onClick={() => onSearchChange("")}
                >
                  ×
                </button>
              )}
            </div>

            <Select
              aria-label="Urutan proyek"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "recent" | "title" | "date")
              }
            >
              <option value="recent">Terbaru</option>
              <option value="title">Nama A–Z</option>
              <option value="date">Target terdekat</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="archive-loading card" role="status">
            <p>Memuat data…</p>
          </div>
        ) : (
          <div className="projects-list">
            {sortedProjects.length === 0 && (
              <div className="archive-empty card">
                <div className="archive-art" aria-hidden="true">
                  <div className="folder-back" />
                  <div className="paper">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="folder-front">
                    <i />
                  </div>
                </div>
                <h3>
                  {projects.length
                    ? "Tidak ada hasil yang cocok"
                    : "Belum ada proyek"}
                </h3>
                <p>
                  {projects.length
                    ? "Coba kata kunci atau status lain."
                    : "Mulai dengan nama proyek. Folder dan link bisa menyusul."}
                </p>
                {projects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange("");
                      onFilterChange("Semua");
                    }}
                  >
                    Reset pencarian dan filter
                  </button>
                )}
              </div>
            )}

            {sortedProjects.map((item) => {
              const tone = projectTone(item.status);
              const stats = todoStatsByProject.get(item.id);
              const linkCount = item.links?.length || 0;
              const noteCount = noteCountByProject.get(item.id) || 0;
              return (
                <article
                  key={item.id}
                  className="entry project-card card"
                  data-tone={tone}
                >
                  <div className="row project-entry-meta">
                    <div className="project-entry-badges">
                      <span className="badge" data-status={item.status}>
                        {item.status}
                      </span>
                      {item.folder && (
                        <span className="project-meta-chip">
                          <WorkspaceIcon name="folder" />
                          <span>Folder lokal</span>
                        </span>
                      )}
                      {linkCount > 0 && (
                        <span className="project-meta-chip">
                          <WorkspaceIcon name="link" />
                          <span>{linkCount} Link</span>
                        </span>
                      )}
                      {noteCount > 0 && (
                        <span className="project-meta-chip">
                          <WorkspaceIcon name="notes" />
                          <span>{noteCount} Catatan</span>
                        </span>
                      )}
                    </div>
                    <div className="project-entry-right-meta">
                      {(item.date || item.updatedAt) && (
                        <span className="project-entry-date">
                          {item.date
                            ? `Target ${item.date}`
                            : `Diperbarui ${formatDateLabel(item.updatedAt)}`}
                        </span>
                      )}
                      <span className="project-open-cue" aria-hidden="true">
                        <span>Buka detail</span>
                        <WorkspaceIcon name="arrowRight" />
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="itemtitle project-entry-title"
                    onClick={() => onSelectDetail(item)}
                  >
                    {item.title}
                  </button>

                  {item.description && (
                    <p className="project-entry-desc">{item.description}</p>
                  )}

                  <div className="project-entry-foot">
                    <div className="project-progress-area">
                      {stats ? (
                        <div className="project-progress">
                          <div className="project-progress-track" aria-hidden="true">
                            <span style={{ width: `${stats.percent}%` }} />
                          </div>
                          <span className="project-progress-text">
                            {stats.done}/{stats.total} To-do selesai ({stats.percent}%)
                          </span>
                        </div>
                      ) : (
                        <span className="project-progress-empty">
                          Belum ada to-do terkait
                        </span>
                      )}
                    </div>

                    <div className="row actions">
                      <button
                        type="button"
                        onClick={() => onOpenKanban(item.id)}
                      >
                        Kanban
                        <span className="visually-hidden"> {item.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditProject(item)}
                      >
                        Edit
                        <span className="visually-hidden"> {item.title}</span>
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => onDeleteProject(item)}
                      >
                        Hapus
                        <span className="visually-hidden"> {item.title}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
