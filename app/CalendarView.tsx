"use client";

import { useMemo, useState } from "react";
import Select from "./Select";
import WorkspaceIcon from "./WorkspaceIcon";
import { TODO_STATUSES, type Item, type TodoPriority } from "./types";

type CalendarItemKind = "projects" | "todos" | "requests";

type CalendarEntry = {
  key: string;
  kind: CalendarItemKind;
  item: Item;
  date: string;
  dateKind: "target" | "due" | "received";
  overdue: boolean;
  done: boolean;
  projectId?: string;
};

type Props = {
  projects: Item[];
  todos: Item[];
  requests: Item[];
  projectFilter: string;
  loading: boolean;
  onProjectFilterChange: (projectId: string) => void;
  onOpenItem: (kind: CalendarItemKind, id: string) => void;
  onAddTaskOnDate: (date: string) => void;
  onChangeTaskStatus: (task: Item, status: string) => void;
  projectName: (id?: string) => string;
};

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const KIND_LABELS: Record<CalendarItemKind, string> = {
  projects: "Proyek",
  todos: "To-do",
  requests: "Request",
};

function priorityTone(priority?: TodoPriority | null) {
  if (priority === "Tinggi") return "high";
  if (priority === "Sedang") return "medium";
  if (priority === "Rendah") return "low";
  return "";
}

function toIsoDate(year: number, monthIndex: number, day: number) {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function formatMonthTitle(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}

function formatSelectedDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export default function CalendarView({
  projects,
  todos,
  requests,
  projectFilter,
  loading,
  onProjectFilterChange,
  onOpenItem,
  onAddTaskOnDate,
  onChangeTaskStatus,
  projectName,
}: Props) {
  const today = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const [initialYear, initialMonth] = useMemo(() => {
    const [y, m] = today.split("-").map(Number);
    return [y, m - 1];
  }, [today]);

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(today);
  const [kindFilter, setKindFilter] = useState<"Semua" | CalendarItemKind>("Semua");

  const allEntries = useMemo<CalendarEntry[]>(() => {
    const list: CalendarEntry[] = [];
    for (const project of projects) {
      if (!project.date) continue;
      const done = project.status === "Selesai" || project.status === "Diarsipkan";
      list.push({
        key: `projects:${project.id}`,
        kind: "projects",
        item: project,
        date: project.date,
        dateKind: "target",
        overdue: !done && project.date < today,
        done,
        projectId: project.id,
      });
    }
    for (const todo of todos) {
      if (!todo.date) continue;
      const done = todo.status === "Selesai";
      list.push({
        key: `todos:${todo.id}`,
        kind: "todos",
        item: todo,
        date: todo.date,
        dateKind: "due",
        overdue: !done && todo.date < today,
        done,
        projectId: todo.projectId,
      });
    }
    for (const request of requests) {
      const effectiveDate = request.date || request.requestDate;
      if (!effectiveDate) continue;
      const done = request.status === "Selesai" || request.status === "Dibatalkan";
      list.push({
        key: `requests:${request.id}`,
        kind: "requests",
        item: request,
        date: effectiveDate,
        dateKind: request.date ? "due" : "received",
        overdue: Boolean(request.date) && !done && request.date! < today,
        done,
      });
    }
    return list;
  }, [projects, todos, requests, today]);

  const scopedByProject = useMemo(() => {
    if (!projectFilter) return allEntries;
    return allEntries.filter(
      (entry) =>
        (entry.kind === "projects" && entry.item.id === projectFilter) ||
        (entry.kind === "todos" && entry.projectId === projectFilter),
    );
  }, [allEntries, projectFilter]);

  const filteredEntries = useMemo(() => {
    if (kindFilter === "Semua") return scopedByProject;
    return scopedByProject.filter((entry) => entry.kind === kindFilter);
  }, [scopedByProject, kindFilter]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of filteredEntries) {
      const group = map.get(entry.date) || [];
      group.push(entry);
      map.set(entry.date, group);
    }
    return map;
  }, [filteredEntries]);

  const unscheduledItems = useMemo(() => {
    const items: { kind: CalendarItemKind; item: Item }[] = [];
    if (kindFilter === "Semua" || kindFilter === "todos") {
      for (const todo of todos) {
        if (todo.date || todo.status === "Selesai") continue;
        if (projectFilter && todo.projectId !== projectFilter) continue;
        items.push({ kind: "todos", item: todo });
      }
    }
    if (kindFilter === "Semua" || kindFilter === "projects") {
      for (const project of projects) {
        if (project.date || project.status === "Selesai" || project.status === "Diarsipkan") continue;
        if (projectFilter && project.id !== projectFilter) continue;
        items.push({ kind: "projects", item: project });
      }
    }
    if ((kindFilter === "Semua" || kindFilter === "requests") && !projectFilter) {
      for (const request of requests) {
        if (request.date || request.requestDate || request.status === "Selesai" || request.status === "Dibatalkan") continue;
        items.push({ kind: "requests", item: request });
      }
    }
    return items;
  }, [projects, todos, requests, kindFilter, projectFilter]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const cells: {
      iso: string;
      dayNumber: number;
      inCurrentMonth: boolean;
    }[] = [];

    for (let index = 0; index < totalCells; index += 1) {
      const dateObj = new Date(viewYear, viewMonth, index - startOffset + 1);
      cells.push({
        iso: toIsoDate(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
        dayNumber: dateObj.getDate(),
        inCurrentMonth: dateObj.getMonth() === viewMonth,
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const monthPrefix = useMemo(
    () => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`,
    [viewYear, viewMonth],
  );

  const monthStats = useMemo(() => {
    const inMonth = filteredEntries.filter((entry) => entry.date.startsWith(monthPrefix));
    return {
      monthTotal: inMonth.length,
      overdueTotal: filteredEntries.filter((entry) => entry.overdue).length,
      unscheduledTotal: unscheduledItems.length,
    };
  }, [filteredEntries, monthPrefix, unscheduledItems.length]);

  const kindCounts = useMemo(
    () => ({
      all: scopedByProject.length,
      projects: scopedByProject.filter((e) => e.kind === "projects").length,
      todos: scopedByProject.filter((e) => e.kind === "todos").length,
      requests: scopedByProject.filter((e) => e.kind === "requests").length,
    }),
    [scopedByProject],
  );

  const selectedEntries = entriesByDate.get(selectedDate) || [];

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function jumpToday() {
    setViewYear(initialYear);
    setViewMonth(initialMonth);
    setSelectedDate(today);
  }

  return (
    <div className="calendar-page">
      <div className="todo-hero">
        <div className="todo-hero-main">
          <div className="todo-hero-copy">
            <h1>Kalender tenggat</h1>
            <p className="todo-hero-sub">
              Pantau jadwal proyek, tenggat to-do, dan permintaan masuk dalam satu kalender.
            </p>
          </div>
        </div>

        <div className="todo-hero-right">
          <dl className="todo-stats" aria-label="Ringkasan jadwal">
            <div className="todo-stat">
              <dt>BULAN INI</dt>
              <dd className="tone-todo">
                <span>{monthStats.monthTotal}</span>
              </dd>
            </div>
            <div className="todo-stat">
              <dt>TERLAMBAT</dt>
              <dd className="tone-progress">
                <span>{monthStats.overdueTotal}</span>
              </dd>
            </div>
            <div className="todo-stat">
              <dt>TANPA TANGGAL</dt>
              <dd className="tone-done">
                <span>{monthStats.unscheduledTotal}</span>
              </dd>
            </div>
          </dl>

          <button
            type="button"
            className="primary todo-add-btn"
            onClick={() => onAddTaskOnDate(selectedDate)}
          >
            <span className="btn-plus">+</span>{" "}
            <span>Tambah tugas</span>
          </button>
        </div>
      </div>

      <div className="calendar-toolbar card">
        <div className="calendar-nav-group">
          <button
            type="button"
            className="calendar-icon-btn"
            aria-label="Bulan sebelumnya"
            onClick={() => shiftMonth(-1)}
          >
            <WorkspaceIcon name="chevronLeft" />
          </button>
          <h2 className="calendar-month-title">{formatMonthTitle(viewYear, viewMonth)}</h2>
          <button
            type="button"
            className="calendar-icon-btn"
            aria-label="Bulan berikutnya"
            onClick={() => shiftMonth(1)}
          >
            <WorkspaceIcon name="chevronRight" />
          </button>
          <button type="button" className="calendar-today-btn" onClick={jumpToday}>
            Hari ini
          </button>
        </div>

        <div className="calendar-filter-group">
          <div
            className="todo-filter-pills"
            role="group"
            aria-label="Filter modul kalender"
          >
            {(
              [
                { value: "Semua", label: "Semua", count: kindCounts.all },
                { value: "projects", label: "Proyek", count: kindCounts.projects },
                { value: "todos", label: "To-do", count: kindCounts.todos },
                { value: "requests", label: "Request", count: kindCounts.requests },
              ] as const
            ).map((pill) => (
              <button
                key={pill.value}
                type="button"
                className="todo-pill-btn"
                aria-pressed={kindFilter === pill.value}
                onClick={() => setKindFilter(pill.value)}
              >
                <span>{pill.label}</span>
                <span className="todo-pill-count">{pill.count}</span>
              </button>
            ))}
          </div>

          {projects.length > 0 && (
            <div className="todo-project-picker">
              <WorkspaceIcon name="folder" />
              <Select
                aria-label="Filter proyek kalender"
                value={projectFilter}
                onChange={(e) => onProjectFilterChange(e.target.value)}
              >
                <option value="">Semua Proyek</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="archive-loading card" role="status">
          <p>Memuat jadwal kalender…</p>
        </div>
      ) : (
        <div className="calendar-layout">
          <section className="calendar-board card" aria-label="Grid kalender bulanan">
            <div className="calendar-weekdays" aria-hidden="true">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((cell) => {
                const dayEntries = entriesByDate.get(cell.iso) || [];
                const isToday = cell.iso === today;
                const isSelected = cell.iso === selectedDate;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    className="calendar-cell"
                    data-outside={!cell.inCurrentMonth}
                    data-today={isToday}
                    data-selected={isSelected}
                    aria-pressed={isSelected}
                    aria-label={`${formatSelectedDate(cell.iso)}, ${dayEntries.length} jadwal`}
                    onClick={() => {
                      setSelectedDate(cell.iso);
                      if (!cell.inCurrentMonth) {
                        const [y, m] = cell.iso.split("-").map(Number);
                        setViewYear(y);
                        setViewMonth(m - 1);
                      }
                    }}
                  >
                    <div className="calendar-cell-head">
                      <span className="calendar-day-num">{cell.dayNumber}</span>
                      {dayEntries.length > 0 && (
                        <span className="calendar-day-count">{dayEntries.length}</span>
                      )}
                    </div>
                    <div className="calendar-cell-events">
                      {dayEntries.slice(0, 3).map((entry) => (
                        <span
                          key={entry.key}
                          className={`calendar-event-pill kind-${entry.kind}`}
                          data-overdue={entry.overdue}
                          data-done={entry.done}
                        >
                          {entry.item.title}
                        </span>
                      ))}
                      {dayEntries.length > 3 && (
                        <span className="calendar-more-label">
                          +{dayEntries.length - 3} lainnya
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="calendar-rail">
            <section
              className="card detail-section"
              aria-labelledby="calendar-selected-heading"
            >
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <WorkspaceIcon name="calendar" />
                  <h2 id="calendar-selected-heading">
                    {formatSelectedDate(selectedDate)}
                  </h2>
                </div>
                <span className="count">{selectedEntries.length}</span>
              </div>

              {selectedEntries.length > 0 ? (
                <div className="calendar-agenda-list">
                  {selectedEntries.map((entry) => (
                    <article
                      key={entry.key}
                      className="calendar-agenda-item"
                      data-done={entry.done}
                    >
                      <div className="todo-card-tags">
                        <span className={`calendar-kind-chip kind-${entry.kind}`}>
                          {KIND_LABELS[entry.kind]}
                        </span>
                        <span className="badge" data-status={entry.item.status}>
                          {entry.item.status}
                        </span>
                        {entry.kind === "todos" && entry.item.priority && (
                          <span
                            className={`priority-chip priority-${priorityTone(entry.item.priority)}`}
                          >
                            {entry.item.priority}
                          </span>
                        )}
                        {entry.overdue && (
                          <span className="todo-overdue-chip">Terlambat</span>
                        )}
                        {entry.dateKind === "received" && (
                          <span className="project-meta-chip">Tanggal masuk</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="detail-todo-title"
                        onClick={() => onOpenItem(entry.kind, entry.item.id)}
                      >
                        {entry.item.title}
                      </button>
                      {entry.kind === "todos" && (
                        <div className="calendar-agenda-foot">
                          <small className="todo-project-label">
                            {projectName(entry.item.projectId)}
                          </small>
                          <div className="detail-todo-controls">
                            <Select
                              aria-label={`Status ${entry.item.title}`}
                              value={entry.item.status}
                              onChange={(e) =>
                                onChangeTaskStatus(entry.item, e.target.value)
                              }
                            >
                              {TODO_STATUSES.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </Select>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="detail-muted-copy">
                  Tidak ada proyek, to-do, atau request terjadwal pada tanggal ini.
                </p>
              )}

              <button
                type="button"
                className="detail-inline-add calendar-add-date-btn"
                onClick={() => onAddTaskOnDate(selectedDate)}
              >
                <WorkspaceIcon name="plus" />
                <span>Tambah tugas di tanggal ini</span>
              </button>
            </section>

            <section
              className="card detail-section"
              aria-labelledby="calendar-unscheduled-heading"
            >
              <div className="detail-section-head">
                <div className="detail-section-title">
                  <h2 id="calendar-unscheduled-heading">Belum dijadwalkan</h2>
                  <span className="count">{unscheduledItems.length}</span>
                </div>
              </div>

              {unscheduledItems.length > 0 ? (
                <div className="note-switcher">
                  {unscheduledItems.slice(0, 6).map(({ kind, item }) => (
                    <button
                      key={`${kind}:${item.id}`}
                      type="button"
                      className="note-switcher-item"
                      onClick={() => onOpenItem(kind, item.id)}
                    >
                      <span className="note-switcher-title">{item.title}</span>
                      <small>{KIND_LABELS[kind]}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="detail-muted-copy">
                  Semua item aktif sudah memiliki jadwal tanggal.
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
