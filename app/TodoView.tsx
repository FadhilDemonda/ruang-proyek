"use client";

import { useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Select from "./Select";
import WorkspaceIcon from "./WorkspaceIcon";
import { TODO_STATUSES, type Item } from "./types";

type TodoStatus = (typeof TODO_STATUSES)[number];

type Props = {
  todos: Item[];
  visibleTodos: Item[];
  projects: Item[];
  selectedProject?: Item;
  userName: string;
  loading: boolean;
  search: string;
  filter: string;
  projectFilter: string;
  view: "list" | "board";
  mobileColumn: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onProjectFilterChange: (id: string) => void;
  onViewChange: (view: "list" | "board") => void;
  onMobileColumnChange: (status: string) => void;
  onAddTask: (status?: string) => void;
  onEditTask: (task: Item) => void;
  onOpenTask: (task: Item) => void;
  onOpenProjectDetail: (projectId: string) => void;
  onChangeStatus: (task: Item, status: string) => void;
  onRemoveTask: (task: Item) => void;
  onDragEnd: (event: DragEndEvent) => void;
  projectName: (id?: string) => string;
};

type ColumnConfig = {
  status: TodoStatus;
  title: string;
  tone: "progress" | "todo" | "done";
  emptyText: string;
};

// Display order mirrors the reference layout: active work first, queue second, completed third.
const BOARD_COLUMNS: ColumnConfig[] = [
  {
    status: "Dikerjakan",
    title: "Dikerjakan",
    tone: "progress",
    emptyText: "Belum ada tugas yang dikerjakan.",
  },
  {
    status: "Belum Mulai",
    title: "Berikutnya (To-do)",
    tone: "todo",
    emptyText: "Belum ada tugas dalam antrean.",
  },
  {
    status: "Selesai",
    title: "Tugas Selesai",
    tone: "done",
    emptyText: "Belum ada tugas yang selesai.",
  },
];

function StatusIcon({
  tone,
  size = 16,
}: {
  tone: ColumnConfig["tone"];
  size?: number;
}) {
  if (tone === "progress") {
    return (
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (tone === "todo") {
    return (
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6h11" />
        <path d="M9 12h11" />
        <path d="M9 18h11" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}

function TodoColumn({
  status,
  active,
  children,
}: {
  status: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });
  return (
    <section
      ref={setNodeRef}
      aria-label={`Kolom ${status}`}
      className={
        "todo-column " +
        (active ? "mobile-active " : "") +
        (isOver ? "over" : "")
      }
    >
      {children}
    </section>
  );
}

function TodoTaskCard({
  task,
  projectName,
  onOpen,
  onStatus,
  onRemove,
}: {
  task: Item;
  projectName: string;
  onOpen: () => void;
  onStatus: (status: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const today = new Date().toLocaleDateString("en-CA");
  const overdue = Boolean(
    task.date && task.status !== "Selesai" && task.date < today,
  );

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="todo-card card"
    >
      <div className="todo-card-top">
        <div className="todo-card-tags">
          <span className="todo-project-label">{projectName}</span>
          {overdue && <span className="todo-overdue-chip">Terlambat</span>}
        </div>
        <button
          type="button"
          className="todo-handle"
          aria-label={`Geser ${task.title}`}
          {...attributes}
          {...listeners}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
        </button>
      </div>

      <button type="button" className="todo-card-title" onClick={onOpen}>
        {task.title}
      </button>

      {task.description && (
        <p className="todo-card-desc">{task.description}</p>
      )}

      <div className="todo-card-foot">
        <span className={"todo-card-date " + (overdue ? "is-overdue" : "")}>
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {task.date || "Tanpa tenggat"}
        </span>
        <div className="todo-card-controls">
          <Select
            aria-label={`Pindahkan ${task.title}`}
            value={task.status}
            onChange={(e) => onStatus(e.target.value)}
          >
            {TODO_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <button
            type="button"
            className="todo-delete-btn"
            aria-label={`Hapus ${task.title}`}
            title="Hapus tugas"
            onClick={onRemove}
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

export default function TodoView(props: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Compute summary counts within the active project scope (or full workspace).
  const counts = useMemo(() => {
    const scoped = props.projectFilter
      ? props.todos.filter((t) => t.projectId === props.projectFilter)
      : props.todos;
    return {
      all: scoped.length,
      todo: scoped.filter((t) => t.status === "Belum Mulai").length,
      progress: scoped.filter((t) => t.status === "Dikerjakan").length,
      done: scoped.filter((t) => t.status === "Selesai").length,
    };
  }, [props.todos, props.projectFilter]);

  const statusTabs: { label: string; value: string; count?: number }[] = [
    { label: "Semua", value: "Semua", count: counts.all },
    { label: "Belum Mulai", value: "Belum Mulai" },
    { label: "Dikerjakan", value: "Dikerjakan" },
    { label: "Selesai", value: "Selesai" },
  ];

  const today = new Date().toLocaleDateString("en-CA");

  return (
    <div className="todo-page">
      <div className="todo-hero">
        <div className="todo-hero-main">
          <div className="todo-hero-copy">
            <h1>{props.selectedProject?.title || "To-do saya"}</h1>
            <p className="todo-hero-sub">
              {props.selectedProject ? "Tugas dan progres untuk proyek ini." : "Tugas dan progres dari seluruh proyekmu."}
            </p>
            {props.selectedProject && (
              <div className="project-mode-switch" role="group" aria-label="Tampilan proyek">
                <button
                  type="button"
                  className="project-mode-btn is-active"
                  aria-current="page"
                >
                  <WorkspaceIcon name="todos" />
                  <span>Kanban To-do</span>
                </button>
                <button
                  type="button"
                  className="project-mode-btn"
                  onClick={() => props.onOpenProjectDetail(props.selectedProject!.id)}
                >
                  <WorkspaceIcon name="projects" />
                  <span>Isi Proyek</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="todo-hero-right">
          <dl className="todo-stats" aria-label="Ringkasan status tugas">
            <div className="todo-stat">
              <dt>BELUM MULAI</dt>
              <dd className="tone-todo">
                <span className="todo-stat-dot" aria-hidden="true" />
                <span>{counts.todo}</span>
              </dd>
            </div>
            <div className="todo-stat">
              <dt>DIKERJAKAN</dt>
              <dd className="tone-progress">
                <span className="todo-stat-dot" aria-hidden="true" />
                <span>{counts.progress}</span>
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
            onClick={() => props.onAddTask()}
          >
            + Tambah tugas
          </button>
        </div>
      </div>

      <div className="todo-toolbar card">
        <div
          className="todo-filter-pills"
          role="group"
          aria-label="Filter status tugas"
        >
          {statusTabs.map((tab) => {
            const pressed = props.filter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                className="todo-pill-btn"
                aria-pressed={pressed}
                onClick={() => props.onFilterChange(tab.value)}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="todo-pill-count">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="todo-toolbar-right">
          <div className="todo-search">
            <svg
              aria-hidden="true"
              className="todo-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              aria-label="Cari tugas"
              value={props.search}
              onChange={(e) => props.onSearchChange(e.target.value)}
              placeholder="Cari tugas…"
            />
            {props.search && (
              <button
                type="button"
                className="todo-search-clear"
                aria-label="Hapus pencarian"
                onClick={() => props.onSearchChange("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="todo-project-picker">
            <svg
              aria-hidden="true"
              className="todo-folder-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinejoin="round"
            >
              <path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
            </svg>
            <Select
              value={props.projectFilter}
              aria-label="Filter proyek"
              onChange={(e) => props.onProjectFilterChange(e.target.value)}
            >
              <option value="">
                Semua Proyek ({props.projects.length})
              </option>
              {props.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </div>

          <div
            className="todo-view-switch"
            role="group"
            aria-label="Mode tampilan"
          >
            <button
              type="button"
              className="todo-view-btn"
              aria-label="Tampilan Kanban"
              title="Tampilan Kanban"
              aria-pressed={props.view === "board"}
              onClick={() => props.onViewChange("board")}
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="5" height="16" rx="1" />
                <rect x="10" y="4" width="5" height="11" rx="1" />
                <rect x="17" y="4" width="4" height="14" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className="todo-view-btn"
              aria-label="Tampilan Daftar"
              title="Tampilan Daftar"
              aria-pressed={props.view === "list"}
              onClick={() => props.onViewChange("list")}
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {props.loading ? (
        <div className="todo-empty-slot" role="status">
          <p>Memuat daftar tugas…</p>
        </div>
      ) : props.view === "board" ? (
        <>
          <label className="mobile-select">
            Kolom
            <Select
              aria-label="Kolom Kanban"
              value={props.mobileColumn}
              onChange={(e) => props.onMobileColumnChange(e.target.value)}
            >
              {BOARD_COLUMNS.map((col) => (
                <option key={col.status} value={col.status}>
                  {col.title}
                </option>
              ))}
            </Select>
          </label>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={props.onDragEnd}
          >
            <div className="todo-board">
              {BOARD_COLUMNS.map((col) => {
                const tasks = props.visibleTodos.filter(
                  (t) => t.status === col.status,
                );
                return (
                  <TodoColumn
                    key={col.status}
                    status={col.status}
                    active={props.mobileColumn === col.status}
                  >
                    <div className="todo-column-head">
                      <h2 className={`todo-column-title tone-${col.tone}`}>
                        <span className="todo-column-icon" aria-hidden="true">
                          <StatusIcon tone={col.tone} size={16} />
                        </span>
                        <span>{col.title}</span>
                      </h2>
                      <span className="todo-col-count">{tasks.length}</span>
                    </div>

                    <div className="todo-column-body">
                      <SortableContext
                        items={tasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {tasks.length === 0 ? (
                          <div className="todo-empty-slot">
                            <span
                              className={`todo-empty-icon tone-${col.tone}`}
                              aria-hidden="true"
                            >
                              <StatusIcon tone={col.tone} size={18} />
                            </span>
                            <p>{col.emptyText}</p>
                          </div>
                        ) : (
                          <div className="todo-card-stack">
                            {tasks.map((task) => (
                              <TodoTaskCard
                                key={task.id}
                                task={task}
                                projectName={props.projectName(task.projectId)}
                                onOpen={() => props.onOpenTask(task)}
                                onStatus={(nextStatus) =>
                                  props.onChangeStatus(task, nextStatus)
                                }
                                onRemove={() => props.onRemoveTask(task)}
                              />
                            ))}
                          </div>
                        )}
                      </SortableContext>

                      <button
                        type="button"
                        className="todo-col-add"
                        onClick={() => props.onAddTask(col.status)}
                      >
                        + Tambah tugas
                      </button>
                    </div>
                  </TodoColumn>
                );
              })}
            </div>
          </DndContext>
        </>
      ) : (
        <div className="todo-list">
          {props.visibleTodos.length === 0 ? (
            <div className="todo-empty-slot">
              <span className="todo-empty-icon tone-todo" aria-hidden="true">
                <StatusIcon tone="todo" size={18} />
              </span>
              <p>Belum ada tugas untuk ditampilkan.</p>
            </div>
          ) : (
            props.visibleTodos.map((task) => {
              const overdue = Boolean(
                task.date && task.status !== "Selesai" && task.date < today,
              );
              const tone =
                task.status === "Dikerjakan"
                  ? "progress"
                  : task.status === "Selesai"
                    ? "done"
                    : "todo";
              return (
                <article key={task.id} className="todo-list-row card">
                  <div className="todo-list-main">
                    <div className="todo-card-tags">
                      <span className={`todo-status-chip tone-${tone}`}>
                        {task.status}
                      </span>
                      <span className="todo-project-label">
                        {props.projectName(task.projectId)}
                      </span>
                      {overdue && (
                        <span className="todo-overdue-chip">Terlambat</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="todo-card-title"
                      onClick={() => props.onOpenTask(task)}
                    >
                      {task.title}
                    </button>
                    {task.description && (
                      <p className="todo-card-desc">{task.description}</p>
                    )}
                  </div>

                  <div className="todo-list-actions">
                    <span
                      className={
                        "todo-card-date " + (overdue ? "is-overdue" : "")
                      }
                    >
                      {task.date || "Tanpa tenggat"}
                    </span>
                    <Select
                      aria-label={`Status ${task.title}`}
                      value={task.status}
                      onChange={(e) =>
                        props.onChangeStatus(task, e.target.value)
                      }
                    >
                      {TODO_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => props.onEditTask(task)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="todo-delete-btn"
                      aria-label={`Hapus ${task.title}`}
                      title="Hapus tugas"
                      onClick={() => props.onRemoveTask(task)}
                    >
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
