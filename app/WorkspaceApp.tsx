"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { type DragEndEvent } from "@dnd-kit/core";
import HeaderDate from "./HeaderDate";
import WorkspaceIcon from "./WorkspaceIcon";
import Sidebar from "./Sidebar";
import Modal from "./Modal";
import { transitionTheme } from "./themeTransition";
import TodoView from "./TodoView";
import NotesView from "./NotesView";
import ProjectsView from "./ProjectsView";
import RequestsView from "./RequestsView";
import OverviewView from "./OverviewView";
import CalendarView from "./CalendarView";
import CommandPalette from "./CommandPalette";
import ItemDetail from "./ItemDetail";
import ItemFormModal from "./ItemFormModal";
import { useWorkspaceStore } from "./useWorkspaceStore";
import {
  SECTION_LABELS as labels,
  SECTION_STATUSES as STATUSES,
  emptyItem as empty,
} from "./workspaceConfig";
import type { Item, Section } from "./types";
import { readWorkspaceRoute, workspaceHref, type WorkspaceSection } from "./workspaceRoute";

export default function Home() {
  return (
    <Suspense fallback={<main className="center">Memuat sesi…</main>}>
      <Workspace />
    </Suspense>
  );
}

function Workspace() {
  const { section, detailId, projectId } = readWorkspaceRoute(useSearchParams());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const setNotice = useCallback((message: string) => setToast({ message }), []);
  const handleError = useCallback((message: string) => setError(message), []);

  const {
    user,
    checking,
    items,
    loading,
    isSynced,
    signOutUser,
    saveNote,
    deleteNote,
    saveItem,
    changeStatus,
    updateTaskChecklist,
    reorderTodo,
    removeItem,
  } = useWorkspaceStore({ onNotice: setNotice, onError: handleError });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [priorityFilter, setPriorityFilter] = useState("Semua");
  const [view, setView] = useState<"list" | "board">("board");
  const [mobileColumn, setMobileColumn] = useState("Belum Mulai");
  const [dark, setDark] = useState(false);
  const themeReady = useRef(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesLeaveRequest, setNotesLeaveRequest] = useState(0);
  const [pendingNotesRoute, setPendingNotesRoute] = useState<{
    section: WorkspaceSection;
    projectId: string;
    detailId?: string | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<{
    section: Section;
    item: Item;
  } | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [editSection, setEditSection] = useState<Section>("projects");
  const [conversion, setConversion] = useState<Item | null>(null);

  const isItemSection =
    section === "projects" || section === "todos" || section === "requests";
  const detail =
    isItemSection && detailId
      ? items[section].find((item) => item.id === detailId)
      : undefined;
  const selectedProject = items.projects.find((project) => project.id === projectId);
  const projectFilter =
    section === "notes" && projectId === "__none__"
      ? "__none__"
      : loading || selectedProject
        ? projectId
        : "";

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setCollapsed(localStorage.getItem("ruang-sidebar") === "collapsed");
    const isDark = localStorage.getItem("ruang-theme") === "dark";
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    themeReady.current = true;
    setView(
      (localStorage.getItem("ruang-view") as "list" | "board") ||
        (matchMedia("(max-width: 700px)").matches ? "list" : "board"),
    );
  }, []);

  useEffect(() => {
    if (!themeReady.current) return;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("ruang-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    function closeOverlays() {
      setEditing(null);
      setDeleting(null);
      setConversion(null);
      setMobileMenu(false);
      setCommandOpen(false);
      setPendingNotesRoute(null);
    }
    window.addEventListener("popstate", closeOverlays);
    return () => window.removeEventListener("popstate", closeOverlays);
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    setSearch("");
    setFilter("Semua");
    setPriorityFilter("Semua");
  }, [section]);

  const visible = useMemo(
    () =>
      (!isItemSection ? [] : items[section])
        .filter(
          (i) =>
            (!search ||
              `${i.title} ${i.description || ""} ${i.requester || ""}`
                .toLowerCase()
                .includes(search.toLowerCase())) &&
            (filter === "Semua" || i.status === filter) &&
            (section !== "todos" ||
              priorityFilter === "Semua" ||
              i.priority === priorityFilter) &&
            (section !== "todos" || !projectFilter || i.projectId === projectFilter),
        )
        .sort((a, b) =>
          section === "todos"
            ? (a.position || 0) - (b.position || 0)
            : (b.updatedAt || 0) - (a.updatedAt || 0),
        ),
    [items, section, isItemSection, search, filter, priorityFilter, projectFilter],
  );

  function navigate(
    s: WorkspaceSection,
    nextProjectId = "",
    nextDetailId?: string | null,
  ) {
    setSearch("");
    setFilter("Semua");
    setPriorityFilter("Semua");
    const href = workspaceHref({
      section: s,
      projectId: nextProjectId,
      detailId: nextDetailId,
    });
    if (`${location.pathname}${location.search}` !== href) {
      window.history.pushState(null, "", href);
      window.scrollTo(0, 0);
    }
  }

  function nav(s: WorkspaceSection, nextProjectId = "") {
    if (section === "notes" && notesDirty) {
      setPendingNotesRoute({ section: s, projectId: nextProjectId });
      setNotesLeaveRequest((value) => value + 1);
      return;
    }
    navigate(s, nextProjectId);
  }

  function selectProject(id: string) {
    nav("todos", id);
  }

  function openDetail(
    target: WorkspaceSection,
    id: string,
    projectOverride?: string,
  ) {
    if (section === "notes" && target !== "notes" && notesDirty) {
      setPendingNotesRoute({
        section: target,
        projectId: projectOverride ?? "",
        detailId: id,
      });
      setNotesLeaveRequest((value) => value + 1);
      return;
    }
    const resolvedProject =
      projectOverride !== undefined
        ? projectOverride
        : target === section
          ? projectFilter
          : "";
    const href = workspaceHref({
      section: target,
      detailId: id,
      projectId: resolvedProject,
    });
    if (`${location.pathname}${location.search}` === href) return;
    const fromList = target === section && detailId == null;
    window.history.pushState({ workspaceFromList: fromList }, "", href);
    window.scrollTo(0, 0);
  }

  function closeDetail() {
    const current = readWorkspaceRoute(new URLSearchParams(location.search));
    if (current.section !== section || current.detailId !== detailId) return;
    const href = workspaceHref({ section, projectId: projectFilter });
    if (window.history.state?.workspaceFromList) window.history.back();
    else {
      window.history.replaceState(null, "", href);
      window.scrollTo(0, 0);
    }
  }

  function savedNoteRoute(id: string) {
    const current = readWorkspaceRoute(new URLSearchParams(location.search));
    if (current.section !== "notes" || current.detailId !== "") return;
    window.history.replaceState(
      { workspaceFromList: window.history.state?.workspaceFromList },
      "",
      workspaceHref({ section: "notes", detailId: id }),
    );
  }

  function edit(
    s: Section,
    item?: Item,
    defaults?: { projectId?: string; date?: string; status?: string },
  ) {
    setEditSection(s);
    setEditing(
      item
        ? {
            ...item,
            checklist: item.checklist ? item.checklist.map((c) => ({ ...c })) : [],
          }
        : {
            ...empty(s),
            ...(s === "todos"
              ? {
                  projectId:
                    defaults?.projectId ??
                    (section === "todos" ? projectFilter : ""),
                  date: defaults?.date ?? "",
                  status: defaults?.status ?? empty(s).status,
                }
              : {}),
          },
    );
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !user) return;
    setBusy(true);
    setError("");
    try {
      await saveItem(editSection, editing, conversion);
      setConversion(null);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const hasFilter = Boolean(
      search || projectFilter || filter !== "Semua" || priorityFilter !== "Semua",
    );
    await reorderTodo(String(active.id), String(over.id), hasFilter);
  }

  function remove(s: Section, item: Item) {
    setDeleting({ section: s, item });
  }

  async function removeConfirmed() {
    if (!deleting) return;
    const { section: s, item } = deleting;
    setDeleting(null);
    try {
      await removeItem(s, item);
      const current = readWorkspaceRoute(new URLSearchParams(location.search));
      if (current.section === s && current.detailId === item.id) closeDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  function convert(request: Item, s: "projects" | "todos") {
    if (request.convertedId) {
      const target = request.convertedType as Section;
      const found = items[target]?.find((i) => i.id === request.convertedId);
      if (found) openDetail(target, found.id);
      else setError("Hasil konversi sudah tidak tersedia.");
      return;
    }
    setConversion(request);
    setEditSection(s);
    setEditing({
      ...empty(s),
      title: request.title,
      description: request.description || "",
    });
  }

  if (checking) return <main className="center">Memuat sesi…</main>;
  if (!user) {
    return (
      <main className="center" role="status">
        Membuka halaman masuk…
      </main>
    );
  }

  const projectName = (id?: string) =>
    items.projects.find((p) => p.id === id)?.title || "Tugas mandiri";

  return (
    <div className={"app " + (collapsed ? "sidebar-collapsed" : "")}>
      <div className="workspace-toast-slot">
        <div role="status" className={toast ? "workspace-toast" : undefined}>
          {toast && (
            <>
              <WorkspaceIcon name="check" />
              <span>{toast.message}</span>
              <button
                type="button"
                aria-label="Tutup notifikasi"
                onClick={() => setToast(null)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </>
          )}
        </div>
      </div>

      <Sidebar
        key={user.uid}
        uid={user.uid}
        onNotice={setNotice}
        projects={items.projects}
        loading={loading}
        section={section}
        projectId={projectFilter}
        detailId={detailId}
        collapsed={collapsed}
        mobileOpen={mobileMenu}
        dark={dark}
        name={user.displayName || "Pengguna"}
        email={user.email || ""}
        onNavigate={nav}
        onProject={selectProject}
        onAddProject={() => {
          setConversion(null);
          edit("projects");
        }}
        onToggle={() => {
          const next = !collapsed;
          setCollapsed(next);
          localStorage.setItem("ruang-sidebar", next ? "collapsed" : "expanded");
        }}
        onClose={() => setMobileMenu(false)}
        onTheme={() => setDark(!dark)}
        onSignOut={signOutUser}
      />

      <main>
        <header>
          <div className="header-location">
            <button
              type="button"
              className="mobile-menu-toggle"
              aria-haspopup="dialog"
              aria-expanded={mobileMenu}
              onClick={() => setMobileMenu(true)}
            >
              Menu
            </button>
            <nav className="crumb" aria-label="Breadcrumb">
              <WorkspaceIcon name="workspace" />
              <button
                type="button"
                className="crumb-link"
                onClick={() => nav("overview")}
              >
                Ruang kerja
              </button>
              <i aria-hidden="true">/</i>
              {section === "todos" && selectedProject ? (
                <>
                  <button
                    type="button"
                    className="crumb-link"
                    onClick={() => nav("todos")}
                  >
                    {labels[section]}
                  </button>
                  <i aria-hidden="true">/</i>
                  <button
                    type="button"
                    className="crumb-link is-current"
                    title="Lihat detail proyek"
                    onClick={() => openDetail("projects", selectedProject.id)}
                  >
                    {selectedProject.title}
                  </button>
                </>
              ) : (
                <strong>{labels[section]}</strong>
              )}
            </nav>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="command-trigger"
              aria-label="Cari dan perintah cepat (Ctrl+K)"
              title="Pencarian cepat (Ctrl+K)"
              onClick={() => setCommandOpen(true)}
            >
              <WorkspaceIcon name="search" />
              <span className="command-trigger-label">Cari cepat…</span>
              <kbd className="command-kbd">Ctrl K</kbd>
            </button>
            <HeaderDate />
            <button
              type="button"
              className="theme-toggle"
              onClick={(event) => {
                const next = !dark;
                transitionTheme(next, () => setDark(next), event.currentTarget);
              }}
              aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
              title={dark ? "Mode terang" : "Mode gelap"}
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                <WorkspaceIcon name={dark ? "sun" : "moon"} />
              </span>
            </button>
          </div>
        </header>

        <div className="content">
          {error && (
            <div role="alert" className="message error">
              {error} <button onClick={() => setError("")}>Tutup</button>
            </div>
          )}

          <NotesView
            notes={items.notes}
            projects={items.projects}
            projectFilter={section === "notes" ? projectFilter : ""}
            active={section === "notes"}
            detailId={section === "notes" ? detailId : null}
            loading={loading}
            storageLabel={isSynced ? "Tersinkron Firestore" : "Mode lokal (browser)"}
            onProjectFilterChange={(nextProjectId) => {
              window.history.replaceState(
                null,
                "",
                workspaceHref({ section: "notes", projectId: nextProjectId }),
              );
            }}
            onOpenProject={(id) => openDetail("projects", id)}
            onAddProject={() => {
              setConversion(null);
              edit("projects");
            }}
            onOpen={(id) => openDetail("notes", id)}
            onBack={closeDetail}
            onCreated={savedNoteRoute}
            onSave={saveNote}
            onDelete={deleteNote}
            onDirtyChange={setNotesDirty}
            leaveRequest={notesLeaveRequest}
            onLeaveResolved={(discarded) => {
              setPendingNotesRoute(null);
              if (discarded && pendingNotesRoute) {
                setNotesDirty(false);
                navigate(
                  pendingNotesRoute.section,
                  pendingNotesRoute.projectId,
                  pendingNotesRoute.detailId,
                );
              }
            }}
            onNotice={setNotice}
            onError={setError}
          />

          {section === "notes" ? null : section === "overview" ? (
            <OverviewView
              projects={items.projects}
              todos={items.todos}
              requests={items.requests}
              notes={items.notes}
              loading={loading}
              onNavigate={nav}
              onOpenProject={(id) => openDetail("projects", id)}
              onOpenTask={(task) => openDetail("todos", task.id)}
              onOpenRequest={(request) => openDetail("requests", request.id)}
              onOpenNote={(id) => openDetail("notes", id)}
              onChangeTaskStatus={changeStatus}
              onConvertRequest={convert}
              onAddTaskToday={(todayDate) => {
                setConversion(null);
                edit("todos", undefined, { date: todayDate });
              }}
              onAddProject={() => {
                setConversion(null);
                edit("projects");
              }}
              onAddNote={() => openDetail("notes", "", "")}
              projectName={projectName}
            />
          ) : section === "calendar" ? (
            <CalendarView
              projects={items.projects}
              todos={items.todos}
              requests={items.requests}
              projectFilter={projectFilter}
              loading={loading}
              onProjectFilterChange={(nextProjectId) => {
                window.history.replaceState(
                  null,
                  "",
                  workspaceHref({ section: "calendar", projectId: nextProjectId }),
                );
              }}
              onOpenItem={(kind, id) => openDetail(kind, id)}
              onAddTaskOnDate={(date) => {
                setConversion(null);
                edit("todos", undefined, { date, projectId: projectFilter });
              }}
              onChangeTaskStatus={changeStatus}
              projectName={projectName}
            />
          ) : detailId && !detail ? (
            <div className="project-detail-page">
              <div className="detail-nav">
                <button type="button" className="back-button" onClick={closeDetail}>
                  <WorkspaceIcon name="back" /> Kembali ke {labels[section].toLowerCase()}
                </button>
              </div>
              {loading ? <p role="status">Memuat detail…</p> : <h1>Detail tidak ditemukan</h1>}
            </div>
          ) : section === "projects" ? (
            <ProjectsView
              projects={items.projects}
              visibleProjects={visible}
              todos={items.todos}
              notes={items.notes}
              statuses={STATUSES.projects}
              loading={loading}
              search={search}
              filter={filter}
              detail={detail ?? null}
              onSearchChange={setSearch}
              onFilterChange={setFilter}
              onSelectDetail={(project) =>
                project ? openDetail("projects", project.id) : closeDetail()
              }
              onAddProject={() => {
                setConversion(null);
                edit("projects");
              }}
              onEditProject={(project) => {
                setConversion(null);
                edit("projects", project);
              }}
              onDeleteProject={(project) => remove("projects", project)}
              onOpenKanban={selectProject}
              onAddTaskForProject={(pid) => {
                setConversion(null);
                edit("todos", undefined, { projectId: pid });
              }}
              onOpenTask={(task) => openDetail("todos", task.id)}
              onOpenNote={(id) => openDetail("notes", id)}
              onAddNoteForProject={(pid) => openDetail("notes", "", pid)}
              onChangeTaskStatus={changeStatus}
              onNotice={setNotice}
              onError={setError}
            />
          ) : detail && (section === "todos" || section === "requests") ? (
            <ItemDetail
              section={section}
              item={detail}
              projectName={projectName(detail.projectId)}
              onBack={closeDetail}
              onEdit={() => edit(section, detail)}
              onDelete={() => remove(section, detail)}
              onConvert={(target) => convert(detail, target)}
              onUpdateChecklist={
                section === "todos"
                  ? (checklist) => updateTaskChecklist(detail, checklist)
                  : undefined
              }
            />
          ) : section === "todos" ? (
            <TodoView
              todos={items.todos}
              visibleTodos={visible}
              projects={items.projects}
              selectedProject={selectedProject}
              userName={user.displayName || "Pengguna"}
              loading={loading}
              search={search}
              filter={filter}
              priorityFilter={priorityFilter}
              projectFilter={projectFilter}
              view={view}
              mobileColumn={mobileColumn}
              onSearchChange={setSearch}
              onFilterChange={(status) => {
                setFilter(status);
                if (status !== "Semua") setMobileColumn(status);
              }}
              onPriorityFilterChange={setPriorityFilter}
              onProjectFilterChange={(pid) => {
                window.history.replaceState(
                  null,
                  "",
                  workspaceHref({ section, projectId: pid }),
                );
              }}
              onViewChange={(nextView) => {
                setView(nextView);
                localStorage.setItem("ruang-view", nextView);
              }}
              onMobileColumnChange={(status) => {
                setMobileColumn(status);
                if (filter !== "Semua") setFilter(status);
              }}
              onAddTask={(status) => {
                setConversion(null);
                edit("todos", undefined, { status, projectId: projectFilter });
              }}
              onEditTask={(task) => edit("todos", task)}
              onOpenTask={(task) => openDetail("todos", task.id)}
              onOpenProjectDetail={(id) => openDetail("projects", id)}
              onChangeStatus={(task, status) => changeStatus(task, status)}
              onRemoveTask={(task) => remove("todos", task)}
              onDragEnd={handleDragEnd}
              projectName={projectName}
            />
          ) : (
            <RequestsView
              requests={items.requests}
              visibleRequests={visible}
              loading={loading}
              search={search}
              filter={filter}
              onSearchChange={setSearch}
              onFilterChange={setFilter}
              onAddRequest={() => {
                setConversion(null);
                edit("requests");
              }}
              onOpenRequest={(id) => openDetail("requests", id)}
              onEditRequest={(item) => edit("requests", item)}
              onDeleteRequest={(item) => remove("requests", item)}
              onConvertRequest={(item, target) => convert(item, target)}
            />
          )}
        </div>
      </main>

      <nav className="bottom" aria-label="Menu bawah">
        {(Object.keys(labels) as WorkspaceSection[]).map((s) => (
          <button
            key={s}
            type="button"
            className={s === section ? "active" : ""}
            onClick={() => nav(s)}
          >
            <WorkspaceIcon name={s} />
            <span>{labels[s]}</span>
          </button>
        ))}
      </nav>

      {commandOpen && (
        <CommandPalette
          projects={items.projects}
          todos={items.todos}
          requests={items.requests}
          notes={items.notes}
          dark={dark}
          onClose={() => setCommandOpen(false)}
          onNavigate={nav}
          onOpenDetail={(target, id) => openDetail(target, id)}
          onAddProject={() => {
            setConversion(null);
            edit("projects");
          }}
          onAddTask={() => {
            setConversion(null);
            edit("todos");
          }}
          onAddRequest={() => {
            setConversion(null);
            edit("requests");
          }}
          onAddNote={() => openDetail("notes", "", "")}
          onToggleTheme={() => setDark((prev) => !prev)}
          projectName={projectName}
        />
      )}

      {deleting && (
        <Modal labelledBy="delete-heading" onClose={() => setDeleting(null)}>
          <div className="dialog card">
            <h2 id="delete-heading">Hapus {deleting.item.title}?</h2>
            <p>
              {deleting.section === "projects"
                ? "To-do dan catatan terkait tetap tersimpan sebagai item mandiri."
                : "Tindakan ini tidak dapat dibatalkan."}
            </p>
            <div className="row">
              <button type="button" onClick={() => setDeleting(null)}>
                Batal
              </button>
              <button type="button" className="primary" onClick={removeConfirmed}>
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <ItemFormModal
          editing={editing}
          editSection={editSection}
          projects={items.projects}
          isConversion={Boolean(conversion)}
          busy={busy}
          error={error}
          onChange={setEditing}
          onSubmit={save}
          onClose={() => {
            setEditing(null);
            setConversion(null);
          }}
        />
      )}
    </div>
  );
}
