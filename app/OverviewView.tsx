"use client";

import { useMemo } from "react";
import Select from "./Select";
import WorkspaceIcon from "./WorkspaceIcon";
import { TODO_STATUSES, todoTone, type Item, type Note, type TodoPriority } from "./types";
import type { WorkspaceSection } from "./workspaceRoute";

type Props = {
  userName: string;
  projects: Item[];
  todos: Item[];
  requests: Item[];
  notes: Note[];
  loading: boolean;
  onNavigate: (section: WorkspaceSection, projectId?: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenTask: (task: Item) => void;
  onOpenRequest: (request: Item) => void;
  onOpenNote: (noteId: string) => void;
  onChangeTaskStatus: (task: Item, status: string) => void;
  onConvertRequest: (request: Item, target: "projects" | "todos") => void;
  onAddTaskToday: (today: string) => void;
  onAddProject: () => void;
  onAddNote: () => void;
  projectName: (id?: string) => string;
};

const PRIORITY_RANK: Record<string, number> = {
  Tinggi: 0,
  Sedang: 1,
  Rendah: 2,
};

function priorityTone(priority?: TodoPriority | null) {
  if (priority === "Tinggi") return "high";
  if (priority === "Sedang") return "medium";
  if (priority === "Rendah") return "low";
  return "";
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(timestamp?: number) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export default function OverviewView({
  userName,
  projects,
  todos,
  requests,
  notes,
  loading,
  onNavigate,
  onOpenProject,
  onOpenTask,
  onOpenRequest,
  onOpenNote,
  onChangeTaskStatus,
  onConvertRequest,
  onAddTaskToday,
  onAddProject,
  onAddNote,
  projectName,
}: Props) {
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => now.toLocaleDateString("en-CA"), [now]);
  const todayLabel = useMemo(() => formatLongDate(now), [now]);

  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const overdueTodos = useMemo(
    () =>
      todos.filter(
        (task) => task.status !== "Selesai" && Boolean(task.date) && task.date! < today,
      ),
    [todos, today],
  );

  const dueTodayTodos = useMemo(
    () =>
      todos.filter(
        (task) => task.status !== "Selesai" && task.date === today,
      ),
    [todos, today],
  );

  const workingTodos = useMemo(
    () => todos.filter((task) => task.status === "Dikerjakan"),
    [todos],
  );

  const reviewTodos = useMemo(
    () => todos.filter((task) => task.status === "On Review"),
    [todos],
  );

  const focusTodos = useMemo(() => {
    const seen = new Set<string>();
    const combined: Item[] = [];
    for (const task of [...overdueTodos, ...dueTodayTodos, ...workingTodos, ...reviewTodos]) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      combined.push(task);
    }
    return combined.sort((a, b) => {
      const aOverdue = Boolean(a.date && a.date < today) ? 0 : 1;
      const bOverdue = Boolean(b.date && b.date < today) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;

      const aToday = a.date === today ? 0 : 1;
      const bToday = b.date === today ? 0 : 1;
      if (aToday !== bToday) return aToday - bToday;

      const aPrio = a.priority ? PRIORITY_RANK[a.priority] ?? 3 : 3;
      const bPrio = b.priority ? PRIORITY_RANK[b.priority] ?? 3 : 3;
      if (aPrio !== bPrio) return aPrio - bPrio;

      return (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99");
    });
  }, [overdueTodos, dueTodayTodos, workingTodos, reviewTodos, today]);

  const activeProjects = useMemo(() => {
    const working = projects.filter((p) => p.status === "Dikerjakan");
    if (working.length > 0) return working;
    return projects.filter((p) => p.status === "Direncanakan").slice(0, 4);
  }, [projects]);

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

  const pendingRequests = useMemo(
    () =>
      requests
        .filter((request) => request.status === "Baru" && !request.convertedId)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [requests],
  );

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4),
    [notes],
  );

  const attentionCount = overdueTodos.length + dueTodayTodos.length;

  return (
    <div className="overview-page">
      <div className="todo-hero overview-hero">
        <div className="todo-hero-main">
          <div className="todo-hero-copy">
            <h1>Hari ini</h1>
            <p className="todo-hero-sub">
              Ringkasan ruang kerja <span className="todo-hero-user">{userName}</span> · {todayLabel}
            </p>
          </div>
        </div>

        <div className="overview-quick-actions">
          <button
            type="button"
            className="primary todo-add-btn"
            onClick={() => onAddTaskToday(today)}
          >
            + Tugas hari ini
          </button>
          <button type="button" onClick={onAddProject}>
            + Proyek
          </button>
          <button type="button" onClick={onAddNote}>
            + Catatan
          </button>
        </div>
      </div>

      <dl className="overview-kpi-grid" aria-label="Ringkasan aktivitas hari ini">
        <div className="overview-kpi card" data-alert={attentionCount > 0}>
          <dt>PERLU PERHATIAN</dt>
          <dd>
            <strong>{attentionCount}</strong>
            <small>
              {overdueTodos.length} terlambat · {dueTodayTodos.length} tenggat hari ini
            </small>
          </dd>
        </div>
        <div className="overview-kpi card">
          <dt>TUGAS DIKERJAKAN</dt>
          <dd>
            <strong>{workingTodos.length}</strong>
            <small>
              {reviewTodos.length > 0
                ? `${reviewTodos.length} on review · ${todos.length} total`
                : `dari ${todos.length} total to-do`}
            </small>
          </dd>
        </div>
        <div className="overview-kpi card">
          <dt>PROYEK AKTIF</dt>
          <dd>
            <strong>{projects.filter((p) => p.status === "Dikerjakan").length}</strong>
            <small>dari {projects.length} total proyek</small>
          </dd>
        </div>
        <div className="overview-kpi card">
          <dt>REQUEST BARU</dt>
          <dd>
            <strong>{pendingRequests.length}</strong>
            <small>menunggu tindak lanjut</small>
          </dd>
        </div>
      </dl>

      {loading ? (
        <div className="archive-loading card" role="status">
          <p>Memuat ringkasan hari ini…</p>
        </div>
      ) : (
        <div className="overview-grid">
          <div className="overview-main-column">
            <section className="card detail-section" aria-labelledby="overview-focus-heading">
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <WorkspaceIcon name="todos" />
                  <h2 id="overview-focus-heading">Fokus tugas hari ini</h2>
                  <span className="count">{focusTodos.length}</span>
                </div>
                <div className="overview-section-links">
                  <button
                    type="button"
                    className="overview-link-btn"
                    onClick={() => onNavigate("calendar")}
                  >
                    Buka kalender
                  </button>
                  <button
                    type="button"
                    className="overview-link-btn"
                    onClick={() => onNavigate("todos")}
                  >
                    Semua to-do
                  </button>
                </div>
              </div>

              {focusTodos.length > 0 ? (
                <div className="detail-todo-list">
                  {focusTodos.slice(0, 8).map((task) => {
                    const isOverdue = Boolean(task.date && task.date < today);
                    const isToday = task.date === today;
                    const checklist = task.checklist || [];
                    const checklistDone = checklist.filter((c) => c.done).length;
                    return (
                      <article key={task.id} className="detail-todo-row">
                        <div className="detail-todo-main">
                          <div className="todo-card-tags">
                            <span
                              className={`todo-status-chip tone-${todoTone(task.status)}`}
                            >
                              {task.status}
                            </span>
                            <span className="todo-project-label">
                              {projectName(task.projectId)}
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
                            {isOverdue && (
                              <span className="todo-overdue-chip">Terlambat</span>
                            )}
                            {isToday && !isOverdue && (
                              <span className="todo-today-chip">Hari ini</span>
                            )}
                            {task.date && (
                              <span
                                className={
                                  "detail-todo-date " +
                                  (isOverdue ? "is-overdue" : "")
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
                  <p>Tidak ada tugas terlambat atau tenggat hari ini. Semua terkendali.</p>
                  <button type="button" onClick={() => onAddTaskToday(today)}>
                    + Tambah tugas hari ini
                  </button>
                </div>
              )}
            </section>

            <section className="card detail-section" aria-labelledby="overview-projects-heading">
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <WorkspaceIcon name="projects" />
                  <h2 id="overview-projects-heading">Proyek aktif</h2>
                  <span className="count">{activeProjects.length}</span>
                </div>
                <button
                  type="button"
                  className="overview-link-btn"
                  onClick={() => onNavigate("projects")}
                >
                  Semua proyek
                </button>
              </div>

              {activeProjects.length > 0 ? (
                <div className="overview-project-list">
                  {activeProjects.map((project) => {
                    const stats = todoStatsByProject.get(project.id);
                    const noteCount = noteCountByProject.get(project.id) || 0;
                    return (
                      <article key={project.id} className="overview-project-row">
                        <div className="overview-project-head">
                          <div className="overview-project-meta">
                            <span className="badge" data-status={project.status}>
                              {project.status}
                            </span>
                            {project.date && (
                              <span className="detail-todo-date">
                                Target {project.date}
                              </span>
                            )}
                            {noteCount > 0 && (
                              <span className="project-meta-chip">
                                <WorkspaceIcon name="notes" />
                                <span>{noteCount} Catatan</span>
                              </span>
                            )}
                          </div>
                          <div className="overview-project-actions">
                            <button
                              type="button"
                              onClick={() => onNavigate("todos", project.id)}
                            >
                              Kanban
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenProject(project.id)}
                            >
                              Detail
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="detail-todo-title"
                          onClick={() => onOpenProject(project.id)}
                        >
                          {project.title}
                        </button>
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
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="detail-empty-box">
                  <p>Belum ada proyek yang sedang dikerjakan.</p>
                  <button type="button" onClick={onAddProject}>
                    + Tambah proyek
                  </button>
                </div>
              )}
            </section>
          </div>

          <div className="overview-side-column">
            <section className="card detail-section" aria-labelledby="overview-requests-heading">
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <WorkspaceIcon name="requests" />
                  <h2 id="overview-requests-heading">Request baru</h2>
                  <span className="count">{pendingRequests.length}</span>
                </div>
                <button
                  type="button"
                  className="overview-link-btn"
                  onClick={() => onNavigate("requests")}
                >
                  Semua request
                </button>
              </div>

              {pendingRequests.length > 0 ? (
                <div className="overview-request-list">
                  {pendingRequests.slice(0, 5).map((request) => (
                    <article key={request.id} className="overview-request-row">
                      <button
                        type="button"
                        className="detail-todo-title"
                        onClick={() => onOpenRequest(request)}
                      >
                        {request.title}
                      </button>
                      <small className="overview-request-meta">
                        {request.requester || "Peminta belum diisi"}
                        {request.date ? ` · Tenggat ${request.date}` : ""}
                      </small>
                      <div className="overview-request-actions">
                        <button
                          type="button"
                          onClick={() => onConvertRequest(request, "projects")}
                        >
                          Jadikan proyek
                        </button>
                        <button
                          type="button"
                          onClick={() => onConvertRequest(request, "todos")}
                        >
                          Jadikan to-do
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="detail-muted-copy">
                  Tidak ada request baru yang menunggu tindak lanjut.
                </p>
              )}
            </section>

            <section className="card detail-section" aria-labelledby="overview-notes-heading">
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <WorkspaceIcon name="notes" />
                  <h2 id="overview-notes-heading">Catatan terakhir</h2>
                  <span className="count">{notes.length}</span>
                </div>
                <button
                  type="button"
                  className="overview-link-btn"
                  onClick={() => onNavigate("notes")}
                >
                  Semua notes
                </button>
              </div>

              {recentNotes.length > 0 ? (
                <div className="detail-notes-list">
                  {recentNotes.map((note) => {
                    const linkedProject = note.projectId
                      ? projectMap.get(note.projectId)
                      : undefined;
                    return (
                      <button
                        key={note.id}
                        type="button"
                        className="detail-note-row"
                        onClick={() => onOpenNote(note.id)}
                      >
                        <div className="detail-note-copy">
                          <div className="overview-note-head">
                            <strong>{note.title}</strong>
                            {linkedProject && (
                              <span className="note-project-chip">
                                <WorkspaceIcon name="folder" />
                                <span>{linkedProject.title}</span>
                              </span>
                            )}
                          </div>
                          <p>{note.content || "Belum ada isi catatan."}</p>
                        </div>
                        <span className="detail-note-date">
                          {formatShortDate(note.updatedAt)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="detail-empty-box">
                  <p>Belum ada catatan tersimpan.</p>
                  <button type="button" onClick={onAddNote}>
                    + Buat catatan
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
