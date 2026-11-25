"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import Link from "next/link";
import WorkspaceIcon from "./WorkspaceIcon";
import Logo from "./Logo";
import { containDialogFocus } from "./Modal";
import type { WorkspaceSection } from "./workspaceRoute";

const MAX_SIDEBAR_PROJECTS = 3;

type Props = {
  projects: { id: string; title: string }[];
  loading: boolean;
  section: WorkspaceSection;
  projectId: string;
  detailId?: string | null;
  collapsed: boolean;
  mobileOpen: boolean;
  dark: boolean;
  name: string;
  email: string;
  uid: string;
  onNotice: (message: string) => void;
  onNavigate: (section: WorkspaceSection) => void;
  onProject: (id: string) => void;
  onAddProject: () => void;
  onToggle: () => void;
  onClose: () => void;
  onTheme: () => void;
  onSignOut?: () => void;
};

const destinations: { section: WorkspaceSection; label: string }[] = [
  { section: "overview", label: "Hari Ini" },
  { section: "projects", label: "Proyek" },
  { section: "todos", label: "To-do" },
  { section: "calendar", label: "Kalender" },
  { section: "requests", label: "Request" },
  { section: "notes", label: "Notes" },
];

type PillState = {
  top: number;
  left: number;
  width: number;
  height: number;
  visible: boolean;
  animate: boolean;
};

type NavSectionProps = {
  projects: { id: string; title: string }[];
  loading: boolean;
  section: WorkspaceSection;
  projectId: string;
  detailId?: string | null;
  compact: boolean;
  openSignal: boolean;
  onClose: () => void;
  onNavigate: (section: WorkspaceSection) => void;
  onProject: (id: string) => void;
  onAddProject: () => void;
};

function SidebarNavSection({
  projects,
  loading,
  section,
  projectId,
  detailId,
  compact,
  openSignal,
  onClose,
  onNavigate,
  onProject,
  onAddProject,
}: NavSectionProps) {
  const navWrapRef = useRef<HTMLDivElement>(null);
  const hasMeasuredRef = useRef(false);
  const lastWrapSizeRef = useRef({ width: 0, height: 0 });
  const [pill, setPill] = useState<PillState>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    visible: false,
    animate: false,
  });

  const activeProjectId =
    section === "todos"
      ? projectId
      : section === "projects"
        ? detailId || ""
        : "";

  const visibleProjects = (() => {
    if (projects.length <= MAX_SIDEBAR_PROJECTS) return projects;
    const head = projects.slice(0, MAX_SIDEBAR_PROJECTS);
    if (!activeProjectId || head.some((p) => p.id === activeProjectId)) {
      return head;
    }
    const activeProject = projects.find((p) => p.id === activeProjectId);
    return activeProject
      ? [...projects.slice(0, MAX_SIDEBAR_PROJECTS - 1), activeProject]
      : head;
  })();

  const hasMoreProjects = projects.length > MAX_SIDEBAR_PROJECTS;

  useLayoutEffect(() => {
    const wrap = navWrapRef.current;
    if (!wrap) return;

    const measure = (animate: boolean) => {
      const activeButton = wrap.querySelector<HTMLButtonElement>("button.active");
      if (!activeButton) {
        setPill((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }
      const wrapRect = wrap.getBoundingClientRect();
      const btnRect = activeButton.getBoundingClientRect();
      if (btnRect.width <= 0 || btnRect.height <= 0) {
        return;
      }
      const top = btnRect.top - wrapRect.top + wrap.scrollTop;
      const left = btnRect.left - wrapRect.left + wrap.scrollLeft;
      const width = btnRect.width;
      const height = btnRect.height;

      const shouldAnimate = animate && hasMeasuredRef.current;
      hasMeasuredRef.current = true;
      lastWrapSizeRef.current = { width: wrap.clientWidth, height: wrap.clientHeight };
      setPill({ top, left, width, height, visible: true, animate: shouldAnimate });
    };

    measure(true);

    const resizeObserver = new ResizeObserver(() => {
      const nextW = wrap.clientWidth;
      const nextH = wrap.clientHeight;
      if (
        nextW === lastWrapSizeRef.current.width &&
        nextH === lastWrapSizeRef.current.height
      ) {
        return;
      }
      measure(false);
    });
    resizeObserver.observe(wrap);

    return () => resizeObserver.disconnect();
  }, [section, projectId, detailId, compact, openSignal, visibleProjects.length]);

  return (
    <div
      ref={navWrapRef}
      className="sidebar-navigation"
      data-pill-ready={pill.visible ? "true" : "false"}
    >
      <span
        className={`sidebar-active-pill${pill.animate ? " is-animated" : ""}`}
        aria-hidden="true"
        style={{
          transform: `translate3d(${pill.left}px, ${pill.top}px, 0)`,
          width: `${pill.width}px`,
          height: `${pill.height}px`,
          opacity: pill.visible ? 1 : 0,
        }}
      />
      <span className="eyebrow sidebar-label">Ruang kerja</span>
      <nav aria-label="Menu utama">
        {destinations.map(({ section: destSection, label }) => {
          const active =
            section === destSection &&
            !projectId &&
            !(destSection === "projects" && detailId);
          return (
            <button
              type="button"
              key={destSection}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={compact ? label : undefined}
              onClick={() => {
                onClose();
                onNavigate(destSection);
              }}
            >
              <WorkspaceIcon name={destSection} />
              <span className="sidebar-label">{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-project-heading">
        <span className="eyebrow sidebar-label">Pintasan proyek</span>
        <button
          type="button"
          className="project-add"
          aria-label="Tambah proyek"
          title="Tambah proyek"
          onClick={() => {
            onClose();
            onAddProject();
          }}
        >
          <WorkspaceIcon name="plus" />
        </button>
      </div>
      {loading ? (
        <p className="sidebar-hint sidebar-label" role="status">
          Memuat proyek…
        </p>
      ) : visibleProjects.length ? (
        <>
          <nav aria-label="Proyek saya" className="project-navigation">
            {visibleProjects.map((project) => {
              const active =
                (section === "todos" && projectId === project.id) ||
                (section === "projects" && detailId === project.id);
              return (
                <button
                  type="button"
                  key={project.id}
                  className={"project-nav-item " + (active ? "active" : "")}
                  aria-current={active ? "page" : undefined}
                  aria-label={project.title}
                  title={compact ? project.title : project.title}
                  onClick={() => {
                    onClose();
                    onProject(project.id);
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
                  </svg>
                  <span className="sidebar-label project-nav-title">
                    {project.title}
                  </span>
                </button>
              );
            })}
          </nav>
          {hasMoreProjects && (
            <button
              type="button"
              className="sidebar-see-all sidebar-label"
              aria-label="Lihat semua proyek"
              onClick={() => {
                onClose();
                onNavigate("projects");
              }}
            >
              <span>Lihat semua ({projects.length})</span>
              <WorkspaceIcon name="arrowRight" />
            </button>
          )}
        </>
      ) : (
        <p className="sidebar-hint sidebar-label">
          Proyekmu akan muncul di sini.
        </p>
      )}
    </div>
  );
}

export default function Sidebar(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [photo, setPhoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const localKey = "ruang-proyek-avatar-" + props.uid;

  useEffect(() => {
    if (!db) {
      setPhoto(localStorage.getItem(localKey) || "");
      return;
    }
    return onSnapshot(doc(db, "users", props.uid), snapshot => {
      const value = snapshot.data()?.avatar;
      setPhoto(typeof value === "string" && value.startsWith("data:image/webp;base64,") ? value : "");
    }, () => setPhotoError("Foto profil gagal dimuat."));
  }, [props.uid, localKey]);

  async function uploadPhoto(file?: File) {
    if (!file || uploading) return;
    setPhotoError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setPhotoError("Pilih JPG, PNG, atau WebP hingga 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 160;
      try {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error();
        const size = Math.min(bitmap.width, bitmap.height);
        ctx.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 160, 160);
      } finally {
        bitmap.close();
      }
      const avatar = canvas.toDataURL("image/webp", 0.78);
      if (!avatar.startsWith("data:image/webp;base64,")) throw new Error();
      if (db) await setDoc(doc(db, "users", props.uid), { avatar }, { merge: true });
      else localStorage.setItem(localKey, avatar);
      setPhoto(avatar);
      props.onNotice("Foto profil tersimpan.");
    } catch {
      setPhotoError("Foto gagal disimpan. Coba pilih foto lagi.");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    const element = dialog.current;
    if (props.mobileOpen) element?.showModal();
    else element?.close();
  }, [props.mobileOpen]);

  useEffect(() => {
    const breakpoint = matchMedia("(min-width: 701px)");
    const closeOnDesktop = () => {
      if (breakpoint.matches) props.onClose();
    };
    breakpoint.addEventListener("change", closeOnDesktop);
    return () => breakpoint.removeEventListener("change", closeOnDesktop);
  }, [props.onClose]);

  function content(mobile: boolean) {
    const compact = !mobile && props.collapsed;
    return (
      <>
        <div className="sidebar-header">
          <Link href="/" className="brand" aria-label="Beranda Ruang Proyek" style={{ color: "inherit", textDecoration: "none" }}>
            <Logo />
            <div className="sidebar-label brand-text">
              <span className="brand-copy">Ruang Proyek</span>
              <span className="brand-sub">Workspace</span>
            </div>
          </Link>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={
              mobile ? "Tutup menu" : compact ? "Buka sidebar" : "Tutup sidebar"
            }
            aria-expanded={mobile ? true : !compact}
            onClick={mobile ? props.onClose : props.onToggle}
          >
            {mobile ? "×" : <WorkspaceIcon name="panel" />}
          </button>
        </div>

        <SidebarNavSection
          projects={props.projects}
          loading={props.loading}
          section={props.section}
          projectId={props.projectId}
          detailId={props.detailId}
          compact={compact}
          openSignal={mobile ? props.mobileOpen : !compact}
          onClose={props.onClose}
          onNavigate={props.onNavigate}
          onProject={props.onProject}
          onAddProject={props.onAddProject}
        />

        <div className="account">
          <div className="account-card">
            <div className="account-person">
              <label className="avatar" title="Ganti foto profil">
                {photo ? <img src={photo} alt="" /> : props.name.slice(0, 1).toUpperCase()}
                <span className="avatar-edit" aria-hidden="true">+</span>
                <input type="file" aria-label="Ganti foto profil" accept="image/jpeg,image/png,image/webp"
                  disabled={uploading} onChange={event => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    void uploadPhoto(file);
                  }} />
              </label>
              <div className="account-meta sidebar-label">
                <strong>{props.name}</strong>
                <small title={props.email}>{props.email}</small>
              </div>
            </div>
            {photoError && <small role="alert">{photoError}</small>}
            {uploading && <small role="status">Menyimpan foto…</small>}
            {props.onSignOut ? (
              <button
                type="button"
                className="account-action sidebar-label"
                onClick={props.onSignOut}
              >
                <WorkspaceIcon name="logout" />
                <span>Keluar</span>
              </button>
            ) : (
              <div className="account-footer sidebar-label">
                <div className="account-status">
                  <span className="account-status-dot" aria-hidden="true" />
                  <small>Data tersimpan di browser ini</small>
                </div>
                <Link
                  className="account-login"
                  href="/login"
                  onClick={props.onClose}
                >
                  <span>Masuk / Buat akun</span>
                  <WorkspaceIcon name="arrowRight" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <aside aria-label="Navigasi ruang kerja">{content(false)}</aside>
      <dialog
        ref={dialog}
        className="mobile-sidebar"
        aria-label="Menu ruang kerja"
        onKeyDown={containDialogFocus}
        onCancel={(event) => {
          event.preventDefault();
          props.onClose();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <div className="mobile-sidebar-body">{content(true)}</div>
      </dialog>
    </>
  );
}
