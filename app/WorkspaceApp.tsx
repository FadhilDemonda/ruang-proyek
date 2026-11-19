"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Select from "./Select";
import HeaderDate from "./HeaderDate";
import WorkspaceIcon from "./WorkspaceIcon";
import Sidebar from "./Sidebar";
import Modal from "./Modal";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { type DragEndEvent } from "@dnd-kit/core";
import TodoView from "./TodoView";
import NotesView from "./NotesView";
import ProjectsView from "./ProjectsView";
import ItemDetail from "./ItemDetail";
import { TODO_STATUSES, type Item, type Note, type Section } from "./types";
import { readWorkspaceRoute, workspaceHref, type WorkspaceSection } from "./workspaceRoute";

const labels: Record<WorkspaceSection, string> = {
  projects: "Proyek",
  todos: "To-do",
  requests: "Request",
  notes: "Notes",
};
const statuses: Record<Section, string[]> = {
  projects: ["Direncanakan", "Dikerjakan", "Selesai", "Diarsipkan"],
  todos: [...TODO_STATUSES],
  requests: ["Baru", "Dikerjakan", "Selesai", "Dibatalkan"],
};
const empty = (section: Section): Item => ({
  id: "",
  title: "",
  description: "",
  status: statuses[section][0],
  date: "",
  folder: "",
  projectId: "",
  requester: "",
  links: [],
});
type Data = Record<Section, Item[]> & { notes: Note[] };
const localKey = "ruang-proyek-local-v1";
const blankData = (): Data => ({ projects: [], todos: [], requests: [], notes: [] });

export default function Home() {
  return (
    <Suspense fallback={<main className="center">Memuat sesi…</main>}>
      <Workspace />
    </Suspense>
  );
}

function Workspace() {
  const router = useRouter();
  const { section, detailId, projectId } = readWorkspaceRoute(useSearchParams());
  const [user, setUser] = useState<Pick<
      User,
      "uid" | "displayName" | "email"
    > | null>(null),
    [checking, setChecking] = useState(true),
    [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Data>(blankData()),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const setNotice = useCallback((message: string) => setToast({ message }), []);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("Semua"),
    [view, setView] = useState<"list" | "board">("board"),
    [mobileColumn, setMobileColumn] = useState("Belum Mulai"),
    [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesLeaveRequest, setNotesLeaveRequest] = useState(0);
  const [pendingNotesRoute, setPendingNotesRoute] = useState<{
    section: WorkspaceSection;
    projectId: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<{
    section: Section;
    item: Item;
  } | null>(null);
  const [editing, setEditing] = useState<Item | null>(null),
    [editSection, setEditSection] = useState<Section>("projects"),
    [conversion, setConversion] = useState<Item | null>(null);
  const detail = section !== "notes" && detailId
    ? items[section].find((item) => item.id === detailId)
    : undefined;
  const selectedProject = items.projects.find((project) => project.id === projectId);
  const projectFilter = loading || selectedProject ? projectId : "";
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    setCollapsed(localStorage.getItem("ruang-sidebar") === "collapsed");
    setDark(localStorage.getItem("ruang-theme") === "dark");
    setView(
      (localStorage.getItem("ruang-view") as "list" | "board") ||
        (matchMedia("(max-width: 700px)").matches ? "list" : "board"),
    );
    if (!auth) {
      try {
        const saved = localStorage.getItem(localKey);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<Data>;
          setItems({ ...blankData(), ...parsed, notes: Array.isArray(parsed.notes) ? parsed.notes : [] });
        }
      } catch {
        setError("Data lokal tidak dapat dibaca.");
      }
      setUser({
        uid: "local",
        displayName: "Ruang pribadi",
        email: "Mode lokal",
      });
      setLoading(false);
      setChecking(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
      setItems(blankData());
      if (!u) {
        const target = workspaceHref(readWorkspaceRoute(new URLSearchParams(location.search)));
        router.replace(target === "/workspace" ? "/login" : `/login?next=${encodeURIComponent(target)}`);
      }
    });
  }, [router]);
  useEffect(() => {
    if (!user || !db) return;
    setLoading(true);
    const sections = Object.keys(labels) as WorkspaceSection[];
    const pending = new Set(sections);
    function loaded(section: WorkspaceSection) {
      pending.delete(section);
      if (pending.size === 0) setLoading(false);
    }
    const unsubs = sections.map((s) =>
      onSnapshot(
        collection(db!, "users", user.uid, s),
        (snap) => {
          setItems((prev) => ({
            ...prev,
            [s]: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Item | Note),
          }));
          loaded(s);
        },
        () => {
          setError("Data gagal dimuat. Periksa koneksi dan aturan Firestore.");
          loaded(s);
        },
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [user]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("ruang-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    function closeOverlays() {
      setEditing(null);
      setDeleting(null);
      setConversion(null);
      setMobileMenu(false);
      setPendingNotesRoute(null);
    }
    window.addEventListener("popstate", closeOverlays);
    return () => window.removeEventListener("popstate", closeOverlays);
  }, []);
  useEffect(() => {
    setSearch("");
    setFilter("Semua");
  }, [section]);
  function saveLocal(next: Data) {
    localStorage.setItem(localKey, JSON.stringify(next));
    setItems(next);
  }
  const path = (s: Section) => collection(db!, "users", user!.uid, s);
  const notePath = () => collection(db!, "users", user!.uid, "notes");
  const visible = useMemo(
    () =>
      (section === "notes" ? [] : items[section])
        .filter(
          (i) =>
            (!search ||
              `${i.title} ${i.description || ""} ${i.requester || ""}`
                .toLowerCase()
                .includes(search.toLowerCase())) &&
            (filter === "Semua" || i.status === filter) &&
            (section !== "todos" ||
              !projectFilter ||
              i.projectId === projectFilter),
        )
        .sort((a, b) =>
          section === "todos"
            ? (a.position || 0) - (b.position || 0)
            : (b.updatedAt || 0) - (a.updatedAt || 0),
        ),
    [items, section, search, filter, projectFilter],
  );
  function navigate(s: WorkspaceSection, projectId = "") {
    setSearch("");
    setFilter("Semua");
    const href = workspaceHref({ section: s, projectId });
    if (`${location.pathname}${location.search}` !== href) {
      window.history.pushState(null, "", href);
      window.scrollTo(0, 0);
    }
  }
  function nav(s: WorkspaceSection, projectId = "") {
    if (section === "notes" && notesDirty) {
      setPendingNotesRoute({ section: s, projectId });
      setNotesLeaveRequest((value) => value + 1);
      return;
    }
    navigate(s, projectId);
  }
  function selectProject(id: string) {
    nav("todos", id);
  }
  function openDetail(target: WorkspaceSection, id: string) {
    const href = workspaceHref({
      section: target,
      detailId: id,
      projectId: target === section ? projectFilter : "",
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
  async function saveNote(draft: Pick<Note, "id" | "title" | "content">) {
    if (!user) throw new Error("Sesi tidak tersedia.");
    const title = draft.title.trim();
    if (!title) throw new Error("Judul catatan wajib diisi.");
    const payload = { title, content: draft.content, updatedAt: Date.now() };
    try {
      if (!db) {
        const note: Note = { id: draft.id || crypto.randomUUID(), ...payload };
        const next = {
          ...items,
          notes: draft.id
            ? items.notes.map((item) => item.id === draft.id ? note : item)
            : [...items.notes, note],
        };
        saveLocal(next);
        return note;
      }
      if (draft.id) {
        await updateDoc(doc(notePath(), draft.id), payload);
        return { id: draft.id, ...payload };
      }
      const created = await addDoc(notePath(), payload);
      return { id: created.id, ...payload };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Catatan gagal disimpan.";
      setError(message);
      throw new Error(message);
    }
  }
  async function deleteNote(note: Note) {
    try {
      if (!db) {
        saveLocal({ ...items, notes: items.notes.filter((item) => item.id !== note.id) });
      } else await deleteDoc(doc(notePath(), note.id));
      setNotice("Catatan dihapus.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Catatan gagal dihapus.";
      setError(message);
      throw new Error(message);
    }
  }
  function edit(s: Section, item?: Item, defaultProjectId?: string) {
    setEditSection(s);
    setEditing(
      item
        ? { ...item }
        : {
            ...empty(s),
            ...(s === "todos"
              ? { projectId: defaultProjectId ?? projectFilter }
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
      const { id, ...rest } = editing;
      const payload = {
        ...rest,
        title: rest.title.trim(),
        updatedAt: Date.now(),
        ...(editSection === "todos"
          ? {
              completedAt:
                rest.status === "Selesai"
                  ? rest.completedAt || Date.now()
                  : null,
            }
          : {}),
      };
      if (!payload.title) throw new Error("Judul wajib diisi.");
      for (const link of payload.links || []) {
        const u = new URL(link.url);
        if (!["http:", "https:"].includes(u.protocol) || !link.label.trim())
          throw new Error("Link memerlukan nama dan URL HTTP/HTTPS.");
      }
      if (!db) {
        const next = structuredClone(items);
        if (conversion) {
          const request = next.requests.find((r) => r.id === conversion.id);
          if (!request || request.convertedId)
            throw new Error("Request ini sudah dikonversi.");
          const newId = crypto.randomUUID();
          next[editSection].push({
            ...payload,
            id: newId,
            position: Date.now(),
          });
          request.convertedId = newId;
          request.convertedType = editSection;
          request.updatedAt = Date.now();
        } else if (id) {
          next[editSection] = next[editSection].map((item) =>
            item.id === id ? { ...payload, id } : item,
          );
        } else
          next[editSection].push({
            ...payload,
            id: crypto.randomUUID(),
            position: Date.now(),
          });
        saveLocal(next);
      } else if (conversion) {
        await runTransaction(db, async (tx) => {
          const source = doc(db!, "users", user.uid, "requests", conversion.id);
          const snap = await tx.get(source);
          if (snap.data()?.convertedId)
            throw new Error("Request ini sudah dikonversi.");
          const target = doc(path(editSection));
          tx.set(target, { ...payload, position: Date.now() });
          tx.update(source, {
            convertedId: target.id,
            convertedType: editSection,
            updatedAt: Date.now(),
          });
        });
      } else if (id) {
        await updateDoc(doc(path(editSection), id), payload);
      } else
        await addDoc(path(editSection), { ...payload, position: Date.now() });
      setConversion(null);
      setEditing(null);
      setNotice(id ? "Perubahan tersimpan." : `${labels[editSection]} dibuat.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(item: Item, status: string) {
    if (!user) return;
    setError("");
    const changes = {
      status,
      position: Date.now(),
      completedAt: status === "Selesai" ? Date.now() : null,
      updatedAt: Date.now(),
    };
    try {
      if (!db)
        saveLocal({
          ...items,
          todos: items.todos.map((t) =>
            t.id === item.id ? { ...t, ...changes } : t,
          ),
        });
      else await updateDoc(doc(path("todos"), item.id), changes);
      setNotice("Status to-do tersimpan.");
    } catch {
      setError("Status gagal disimpan. Coba lagi.");
    }
  }
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !user) return;
    const task = items.todos.find((t) => t.id === String(active.id));
    if (!task) return;
    const target = items.todos.find((t) => t.id === String(over.id));
    if (target?.id === task.id) return;
    const status = target?.status || String(over.id).replace(/^column:/, "");
    if (!statuses.todos.includes(status)) return;
    if (
      (search || projectFilter || filter !== "Semua") &&
      task.status === status
    )
      return;
    const ordered = items.todos
      .filter((t) => t.status === status && t.id !== task.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    const index = target
      ? Math.max(
          0,
          ordered.findIndex((t) => t.id === target.id),
        )
      : ordered.length;
    ordered.splice(index, 0, {
      ...task,
      status,
      completedAt: status === "Selesai" ? task.completedAt || Date.now() : null,
    });
    try {
      if (!db) {
        const replacements = new Map(
          ordered.map((t, i) => [
            t.id,
            { ...t, position: (i + 1) * 1000, updatedAt: Date.now() },
          ]),
        );
        saveLocal({
          ...items,
          todos: items.todos.map((t) => replacements.get(t.id) || t),
        });
      } else {
        const { writeBatch } = await import("firebase/firestore");
        const batch = writeBatch(db);
        ordered.forEach((t, i) =>
          batch.update(doc(path("todos"), t.id), {
            status: t.status,
            position: (i + 1) * 1000,
            completedAt: t.completedAt || null,
            updatedAt: Date.now(),
          }),
        );
        await batch.commit();
      }
      setNotice("Perubahan tersimpan.");
    } catch {
      setError("Gagal memindahkan tugas. Coba lagi.");
    }
  }
  function remove(section: Section, item: Item) {
    setDeleting({ section, item });
  }
  async function removeConfirmed() {
    if (!deleting) return;
    const { section: s, item } = deleting;
    setDeleting(null);
    try {
      if (!db) {
        const next = structuredClone(items);
        next[s] = next[s].filter((i) => i.id !== item.id);
        if (s === "projects")
          next.todos = next.todos.map((t) =>
            t.projectId === item.id ? { ...t, projectId: "" } : t,
          );
        saveLocal(next);
      } else {
        if (
          s === "projects" &&
          items.todos.some((t) => t.projectId === item.id)
        )
          throw new Error(
            "Lepaskan proyek dari to-do terkait sebelum menghapus proyek.",
          );
        await deleteDoc(doc(path(s), item.id));
      }
      const current = readWorkspaceRoute(new URLSearchParams(location.search));
      if (current.section === s && current.detailId === item.id) closeDetail();
      setNotice(`${labels[s]} dihapus.`);
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
  if (!user)
    return (
      <main className="center" role="status">
        Membuka halaman masuk…
      </main>
    );
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
              <button type="button" aria-label="Tutup notifikasi" onClick={() => setToast(null)}>
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
          localStorage.setItem(
            "ruang-sidebar",
            next ? "collapsed" : "expanded",
          );
        }}
        onClose={() => setMobileMenu(false)}
        onTheme={() => setDark(!dark)}
        onSignOut={
          auth
            ? () => {
                void signOut(auth!);
              }
            : undefined
        }
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
            <span className="crumb">
              <WorkspaceIcon name="workspace" /> Ruang kerja <i>/</i>{" "}
              <strong>{labels[section]}</strong>
            </span>
          </div>
          <div className="header-actions">
            <HeaderDate />
            <button
              onClick={() => setDark(!dark)}
              aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
            >
              <WorkspaceIcon name={dark ? "sun" : "moon"} />
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
              active={section === "notes"}
              detailId={section === "notes" ? detailId : null}
              loading={loading}
              storageLabel={db ? "Tersinkron Firestore" : "Mode lokal (browser)"}
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
                  navigate(pendingNotesRoute.section, pendingNotesRoute.projectId);
                }
              }}
              onNotice={setNotice}
              onError={setError}
          />
          {section === "notes" ? null : detailId && !detail ? (
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
              statuses={statuses.projects}
              loading={loading}
              search={search}
              filter={filter}
              detail={detail ?? null}
              onSearchChange={setSearch}
              onFilterChange={setFilter}
              onSelectDetail={(project) => project ? openDetail("projects", project.id) : closeDetail()}
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
              onAddTaskForProject={(projectId) => {
                setConversion(null);
                edit("todos", undefined, projectId);
              }}
              onOpenTask={(task) => openDetail("todos", task.id)}
              onChangeTaskStatus={changeStatus}
              onNotice={setNotice}
              onError={setError}
            />
          ) : detail ? (
            <ItemDetail
              section={section}
              item={detail}
              projectName={projectName(detail.projectId)}
              onBack={closeDetail}
              onEdit={() => edit(section, detail)}
              onDelete={() => remove(section, detail)}
              onConvert={(target) => convert(detail, target)}
            />
          ) : section === "todos" ? (
            <TodoView
              todos={items.todos}
              visibleTodos={visible}
              projects={items.projects}
              selectedProject={selectedProject}
              userName={user.displayName || user.email || "Pengguna"}
              loading={loading}
              search={search}
              filter={filter}
              projectFilter={projectFilter}
              view={view}
              mobileColumn={mobileColumn}
              onSearchChange={setSearch}
              onFilterChange={(status) => {
                setFilter(status);
                if (status !== "Semua") setMobileColumn(status);
              }}
              onProjectFilterChange={(projectId) => {
                window.history.replaceState(null, "", workspaceHref({ section, projectId }));
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
                if (status) {
                  setEditSection("todos");
                  setEditing({
                    ...empty("todos"),
                    status,
                    projectId: projectFilter,
                  });
                  setError("");
                } else {
                  edit("todos");
                }
              }}
              onEditTask={(task) => edit("todos", task)}
              onOpenTask={(task) => openDetail("todos", task.id)}
              onChangeStatus={(task, status) => changeStatus(task, status)}
              onRemoveTask={(task) => remove("todos", task)}
              onDragEnd={handleDragEnd}
              projectName={projectName}
            />
          ) : (
            <>
              <div className="heading">
                <div>
                  <h1>Daftar request</h1>
                  <p>Kelola permintaan masuk dan tindak lanjutnya.</p>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    setConversion(null);
                    edit("requests");
                  }}
                >
                  + Tambah request
                </button>
              </div>
              <section className="archive-panel" aria-label={labels.requests}>
                <div className="archive-toolbar">
                  <h2>
                    Semua request <span>{items.requests.length}</span>
                  </h2>
                  <div className="filterrow">
                    <label className="sr archive-search">
                      <WorkspaceIcon name="search" />
                      Cari
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari request…"
                      />
                    </label>
                    <label className="sr">
                      Filter status
                      <Select
                        aria-label="Filter status"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="Semua">Semua status</option>
                        {statuses.requests.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </Select>
                    </label>
                  </div>
                </div>
                {loading ? (
                  <p>Memuat data…</p>
                ) : (
                  <div className="archive-list">
                    {visible.length === 0 && (
                      <div className="archive-empty">
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
                          {items.requests.length
                            ? "Tidak ada hasil yang cocok"
                            : "Belum ada request"}
                        </h3>
                        <p>
                          {items.requests.length
                            ? "Coba kata kunci atau status lain."
                            : "Catat permintaan pertama untuk mulai melacak progresnya."}
                        </p>
                        {items.requests.length > 0 && (
                          <button
                            onClick={() => {
                              setSearch("");
                              setFilter("Semua");
                            }}
                          >
                            Reset pencarian dan filter
                          </button>
                        )}
                      </div>
                    )}
                    {visible.map((item) => (
                      <article key={item.id} className="entry">
                        <div className="row">
                          <span className="badge" data-status={item.status}>
                            {item.status}
                          </span>
                          <span>{item.date || ""}</span>
                        </div>
                        <button
                          className="itemtitle"
                          onClick={() => openDetail("requests", item.id)}
                        >
                          {item.title}
                        </button>
                        <p>{item.description || ""}</p>
                        <div className="row">
                          <small>
                            {item.requester || "Peminta belum diisi"}
                            {item.requestDate
                              ? " · Masuk " + item.requestDate
                              : ""}
                          </small>
                          <div>
                            {item.convertedId ? (
                              <button onClick={() => convert(item, "projects")}>
                                Lihat hasil konversi
                              </button>
                            ) : (
                              <>
                                <button onClick={() => convert(item, "projects")}>Jadikan proyek</button>{" "}
                                <button onClick={() => convert(item, "todos")}>Jadikan to-do</button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="row actions">
                          <button onClick={() => edit("requests", item)}>
                            Edit
                          </button>
                          <button onClick={() => remove("requests", item)}>
                            Hapus
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <nav className="bottom">
        {(Object.keys(labels) as WorkspaceSection[]).map((s) => (
          <button
            key={s}
            className={s === section ? "active" : ""}
            onClick={() => nav(s)}
          >
            {labels[s]}
          </button>
        ))}
      </nav>
      {deleting && (
        <Modal labelledBy="delete-heading" onClose={() => setDeleting(null)}>
          <div className="dialog card">
            <h2 id="delete-heading">Hapus {deleting.item.title}?</h2>
            <p>
              {deleting.section === "projects"
                ? "To-do terkait tetap tersimpan sebagai tugas mandiri."
                : "Tindakan ini tidak dapat dibatalkan."}
            </p>
            <div className="row">
              <button type="button" onClick={() => setDeleting(null)}>
                Batal
              </button>
              <button
                type="button"
                className="primary"
                onClick={removeConfirmed}
              >
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}
      {editing && (
        <Modal
          labelledBy="edit-heading"
          onClose={() => {
            if (!busy) {
              setEditing(null);
              setConversion(null);
            }
          }}
        >
          <form
            className="dialog card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
          >
            <div className="row">
              <h2 id="edit-heading">
                {editing.id ? "Edit" : conversion ? "Konversi ke" : "Tambah"}{" "}
                {labels[editSection]}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setConversion(null);
                }}
                aria-label="Tutup"
              >
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
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </label>
            <label>
              Deskripsi
              <textarea
                rows={3}
                value={editing.description || ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </label>
            <label>
              Status
              <Select
                aria-label="Status"
                value={editing.status}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value })
                }
              >
                {statuses[editSection].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </label>
            <label>
              {editSection === "projects" ? "Tanggal proyek" : "Tenggat"}
              <input
                type="date"
                value={editing.date || ""}
                onChange={(e) =>
                  setEditing({ ...editing, date: e.target.value })
                }
              />
            </label>
            {editSection === "requests" && (
              <label>
                Tanggal masuk
                <input
                  type="date"
                  value={editing.requestDate || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, requestDate: e.target.value })
                  }
                />
              </label>
            )}
            {editSection === "requests" && (
              <label>
                Nama peminta
                <input
                  value={editing.requester || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, requester: e.target.value })
                  }
                />
              </label>
            )}
            {editSection === "todos" && (
              <label>
                Proyek
                <Select
                  aria-label="Proyek tugas"
                  value={editing.projectId || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, projectId: e.target.value })
                  }
                >
                  <option value="">Tugas mandiri</option>
                  {items.projects.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {editSection === "projects" && (
              <>
                <label>
                  Lokasi folder komputer
                  <input
                    placeholder="D:\\Projects\\Nama proyek"
                    value={editing.folder || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, folder: e.target.value })
                    }
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
                          setEditing({ ...editing, links });
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
                          setEditing({ ...editing, links });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
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
                    setEditing({
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
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setConversion(null);
                }}
              >
                Batal
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
