"use client";

import { useMemo, useState } from "react";
import Select from "./Select";
import WorkspaceIcon from "./WorkspaceIcon";
import { TODO_STATUSES, type Item, type Note } from "./types";
import type { WorkspaceSection } from "./workspaceRoute";

type Props = {
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

const PRIORITY_RANK: Record<string, number> = { Tinggi: 0, Sedang: 1, Rendah: 2 };

function shortDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(
    new Date(`${date}T00:00:00`),
  );
}

export default function OverviewView({
  projects, todos, requests, notes, loading,
  onNavigate, onOpenProject, onOpenTask, onOpenRequest, onOpenNote,
  onChangeTaskStatus, onConvertRequest, onAddTaskToday, onAddProject, onAddNote,
  projectName,
}: Props) {
  const now = useMemo(() => new Date(), []);
  const today = now.toLocaleDateString("en-CA");
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long",
  }).format(now);
  const [showAllTasks, setShowAllTasks] = useState(false);

  const focusTodos = useMemo(() => todos
    .filter((task) => task.status !== "Selesai" && (
      (task.date && task.date <= today) ||
      task.status === "Dikerjakan" || task.status === "On Review"
    ))
    .sort((a, b) => {
      const rank = (task: Item) => task.date && task.date < today ? 0 : task.date === today ? 1 : 2;
      return rank(a) - rank(b) ||
        (PRIORITY_RANK[a.priority || ""] ?? 3) - (PRIORITY_RANK[b.priority || ""] ?? 3) ||
        (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99");
    }), [todos, today]);
  const overdueCount = focusTodos.filter((task) => task.date && task.date < today).length;
  const activeProjects = projects.filter((project) =>
    project.status === "Dikerjakan" || project.status === "Direncanakan",
  );
  const pendingRequests = requests
    .filter((request) => request.status === "Baru" && !request.convertedId)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const recentNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);

  return (
    <div className="overview-page">
      <div className="overview-heading">
        <div>
          <h1>Hari ini</h1>
          <p><time dateTime={today}>{todayLabel}</time></p>
        </div>
        <button type="button" className="primary overview-add" onClick={() => onAddTaskToday(today)}>
          <WorkspaceIcon name="plus" /> Tambah tugas
        </button>
      </div>

      {loading ? (
        <div className="overview-loading" role="status">Memuat tugas hari ini…</div>
      ) : (
        <>
          <section className="overview-focus" aria-labelledby="overview-focus-heading">
            <div className="overview-section-head">
              <div>
                <h2 id="overview-focus-heading">Fokus hari ini <span>{focusTodos.length}</span></h2>
                <p>{overdueCount > 0
                  ? `${overdueCount} terlambat. Mulai dari yang paling mendesak.`
                  : "Satu per satu, mulai dari sini."}</p>
              </div>
              <button type="button" className="overview-text-button" onClick={() => onNavigate("calendar")}>
                <WorkspaceIcon name="calendar" /> Kalender
              </button>
            </div>

            {focusTodos.length > 0 ? (
              <ul className="overview-task-list">
                {(showAllTasks ? focusTodos : focusTodos.slice(0, 5)).map((task) => {
                  const overdue = Boolean(task.date && task.date < today);
                  return (
                    <li className="overview-task" key={task.id}>
                      <div className="overview-task-copy">
                        <button type="button" className="overview-item-title" onClick={() => onOpenTask(task)}>
                          {task.title}
                        </button>
                        <div className="overview-task-meta">
                          <span>{projectName(task.projectId)}</span>
                          {task.date && (
                            <span className={overdue ? "overview-overdue" : undefined}>
                              {overdue ? `Terlambat · ${shortDate(task.date)}` : task.date === today ? "Hari ini" : shortDate(task.date)}
                            </span>
                          )}
                          {task.priority === "Tinggi" && <span>Prioritas tinggi</span>}
                        </div>
                      </div>
                      <Select aria-label={`Status ${task.title}`} value={task.status}
                        onChange={(event) => onChangeTaskStatus(task, event.target.value)}>
                        {TODO_STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </Select>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="overview-empty">
                <WorkspaceIcon name="check" />
                <h3>Hari ini masih lapang.</h3>
                <p>Tugas yang jatuh tempo atau sedang berjalan akan muncul di sini.</p>
              </div>
            )}

            <div className="overview-focus-footer">
              {focusTodos.length > 5 && (
                <button type="button" className="overview-text-button" aria-expanded={showAllTasks}
                  onClick={() => setShowAllTasks(!showAllTasks)}>
                  {showAllTasks ? "Tampilkan lebih sedikit" : `Lihat ${focusTodos.length - 5} tugas lainnya`}
                </button>
              )}
              <button type="button" className="overview-text-button" onClick={() => onNavigate("todos")}>Semua to-do</button>
            </div>
          </section>

          <section className="overview-workspace" aria-labelledby="overview-workspace-heading">
            <h2 id="overview-workspace-heading">Sekilas ruang kerja</h2>

            <details className="overview-disclosure">
              <summary>
                <WorkspaceIcon name="projects" />
                <span>Proyek aktif</span>
                <span className="overview-disclosure-count">{activeProjects.length}</span>
                <WorkspaceIcon name="chevronRight" />
              </summary>
              <div className="overview-disclosure-body">
                {activeProjects.length ? activeProjects.slice(0, 3).map((project) => (
                  <div className="overview-secondary-row" key={project.id}>
                    <div>
                      <button type="button" className="overview-item-title" onClick={() => onOpenProject(project.id)}>{project.title}</button>
                      <p>{project.status}{project.date ? ` · ${shortDate(project.date)}` : ""}</p>
                    </div>
                    <button type="button" className="overview-text-button" onClick={() => onNavigate("todos", project.id)}>Kanban</button>
                  </div>
                )) : <p className="overview-secondary-empty">Belum ada proyek aktif.</p>}
                <div className="overview-secondary-actions">
                  <button type="button" className="overview-text-button" onClick={onAddProject}>Tambah proyek</button>
                  <button type="button" className="overview-text-button" onClick={() => onNavigate("projects")}>Semua proyek</button>
                </div>
              </div>
            </details>

            <details className="overview-disclosure">
              <summary>
                <WorkspaceIcon name="requests" />
                <span>Request baru</span>
                <span className="overview-disclosure-count">{pendingRequests.length}</span>
                <WorkspaceIcon name="chevronRight" />
              </summary>
              <div className="overview-disclosure-body">
                {pendingRequests.length ? pendingRequests.slice(0, 3).map((request) => (
                  <div className="overview-secondary-row overview-request" key={request.id}>
                    <div>
                      <button type="button" className="overview-item-title" onClick={() => onOpenRequest(request)}>{request.title}</button>
                      <p>{request.requester || "Peminta belum diisi"}{request.date ? ` · ${shortDate(request.date)}` : ""}</p>
                    </div>
                    <div className="overview-secondary-actions">
                      <button type="button" className="overview-text-button" onClick={() => onConvertRequest(request, "projects")}>Jadikan proyek</button>
                      <button type="button" className="overview-text-button" onClick={() => onConvertRequest(request, "todos")}>Jadikan to-do</button>
                    </div>
                  </div>
                )) : <p className="overview-secondary-empty">Tidak ada request baru.</p>}
                <div className="overview-secondary-actions">
                  <button type="button" className="overview-text-button" onClick={() => onNavigate("requests")}>Semua request</button>
                </div>
              </div>
            </details>

            <details className="overview-disclosure">
              <summary>
                <WorkspaceIcon name="notes" />
                <span>Catatan terakhir</span>
                <span className="overview-disclosure-count">{notes.length}</span>
                <WorkspaceIcon name="chevronRight" />
              </summary>
              <div className="overview-disclosure-body">
                {recentNotes.length ? recentNotes.map((note) => (
                  <div className="overview-secondary-row" key={note.id}>
                    <div>
                      <button type="button" className="overview-item-title" onClick={() => onOpenNote(note.id)}>{note.title}</button>
                      <p>{note.projectId ? projectName(note.projectId) : "Catatan pribadi"}</p>
                    </div>
                  </div>
                )) : <p className="overview-secondary-empty">Belum ada catatan.</p>}
                <div className="overview-secondary-actions">
                  <button type="button" className="overview-text-button" onClick={onAddNote}>Buat catatan</button>
                  <button type="button" className="overview-text-button" onClick={() => onNavigate("notes")}>Semua notes</button>
                </div>
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
