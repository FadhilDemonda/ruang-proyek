"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  DATA_COLLECTIONS,
  LOCAL_STORAGE_KEY,
  SECTION_LABELS,
  SECTION_STATUSES,
  blankData,
  type WorkspaceData,
} from "./workspaceConfig";
import type { ChecklistItem, Item, Note, Section } from "./types";
import { readWorkspaceRoute, workspaceHref } from "./workspaceRoute";

export type WorkspaceUser = Pick<User, "uid" | "displayName" | "email">;

export function useWorkspaceStore({
  onNotice,
  onError,
}: {
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<WorkspaceData>(blankData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<WorkspaceData>;
          setItems({
            ...blankData(),
            ...parsed,
            notes: Array.isArray(parsed.notes) ? parsed.notes : [],
          });
        }
      } catch {
        onError("Data lokal tidak dapat dibaca.");
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
        const target = workspaceHref(
          readWorkspaceRoute(new URLSearchParams(location.search)),
        );
        router.replace(
          target === "/workspace"
            ? "/login"
            : `/login?next=${encodeURIComponent(target)}`,
        );
      }
    });
  }, [router, onError]);

  useEffect(() => {
    if (!user || !db) return;
    setLoading(true);
    const pending = new Set<string>(DATA_COLLECTIONS);
    function loaded(col: string) {
      pending.delete(col);
      if (pending.size === 0) setLoading(false);
    }
    const unsubs = DATA_COLLECTIONS.map((s) =>
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
          onError("Data gagal dimuat. Periksa koneksi dan aturan Firestore.");
          loaded(s);
        },
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [user, onError]);

  function saveLocal(next: WorkspaceData) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    setItems(next);
  }

  const colRef = (s: Section) => collection(db!, "users", user!.uid, s);
  const noteColRef = () => collection(db!, "users", user!.uid, "notes");

  async function commitWrite(write: Promise<unknown>, fallbackError: string) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      void write.catch((cause) =>
        onError(cause instanceof Error ? cause.message : fallbackError),
      );
      return false;
    }
    await write;
    return true;
  }

  const saveNote = useCallback(
    async (draft: Pick<Note, "id" | "title" | "content" | "projectId">) => {
      if (!user) throw new Error("Sesi tidak tersedia.");
      const title = draft.title.trim();
      if (!title) throw new Error("Judul catatan wajib diisi.");
      const payload = {
        title,
        content: draft.content,
        projectId: draft.projectId || "",
        updatedAt: Date.now(),
      };
      try {
        if (!db) {
          const note: Note = { id: draft.id || crypto.randomUUID(), ...payload };
          const next = {
            ...items,
            notes: draft.id
              ? items.notes.map((item) => (item.id === draft.id ? note : item))
              : [...items.notes, note],
          };
          saveLocal(next);
          return note;
        }
        if (draft.id) {
          await commitWrite(
            updateDoc(doc(noteColRef(), draft.id), payload),
            "Catatan gagal disinkronkan.",
          );
          return { id: draft.id, ...payload };
        }
        const createdRef = doc(noteColRef());
        await commitWrite(
          setDoc(createdRef, payload),
          "Catatan gagal disinkronkan.",
        );
        return { id: createdRef.id, ...payload };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Catatan gagal disimpan.";
        onError(message);
        throw new Error(message);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, items],
  );

  const deleteNote = useCallback(
    async (note: Note) => {
      try {
        let synced = true;
        if (!db) {
          saveLocal({
            ...items,
            notes: items.notes.filter((item) => item.id !== note.id),
          });
        } else {
          synced = await commitWrite(
            deleteDoc(doc(noteColRef(), note.id)),
            "Catatan gagal dihapus dari server.",
          );
        }
        onNotice(
          synced
            ? "Catatan dihapus."
            : "Catatan dihapus offline · Akan disinkronkan saat online.",
        );
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Catatan gagal dihapus.";
        onError(message);
        throw new Error(message);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, items],
  );

  async function saveItem(
    editSection: Section,
    editing: Item,
    conversion: Item | null,
  ) {
    if (!user) return;
    const { id, ...rest } = editing;
    const cleanedChecklist: ChecklistItem[] = (rest.checklist || [])
      .map((c) => ({ ...c, text: c.text.trim() }))
      .filter((c) => c.text.length > 0);
    const payload = {
      ...rest,
      title: rest.title.trim(),
      updatedAt: Date.now(),
      ...(editSection === "todos"
        ? {
            priority: rest.priority || null,
            checklist: cleanedChecklist,
            completedAt:
              rest.status === "Selesai" ? rest.completedAt || Date.now() : null,
          }
        : {
            priority: null,
            checklist: [],
          }),
    };
    if (!payload.title) throw new Error("Judul wajib diisi.");
    for (const link of payload.links || []) {
      const u = new URL(link.url);
      if (!["http:", "https:"].includes(u.protocol) || !link.label.trim()) {
        throw new Error("Link memerlukan nama dan URL HTTP/HTTPS.");
      }
    }

    let synced = true;
    if (!db) {
      const next = structuredClone(items);
      if (conversion) {
        const request = next.requests.find((r) => r.id === conversion.id);
        if (!request || request.convertedId) {
          throw new Error("Request ini sudah dikonversi.");
        }
        const newId = crypto.randomUUID();
        next[editSection].push({ ...payload, id: newId, position: Date.now() });
        request.convertedId = newId;
        request.convertedType = editSection;
        request.updatedAt = Date.now();
      } else if (id) {
        next[editSection] = next[editSection].map((item) =>
          item.id === id ? { ...payload, id } : item,
        );
      } else {
        next[editSection].push({
          ...payload,
          id: crypto.randomUUID(),
          position: Date.now(),
        });
      }
      saveLocal(next);
    } else if (conversion) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error(
          "Konversi request membutuhkan koneksi internet saat menggunakan akun Firebase.",
        );
      }
      await runTransaction(db, async (tx) => {
        const source = doc(db!, "users", user.uid, "requests", conversion.id);
        const snap = await tx.get(source);
        if (snap.data()?.convertedId) {
          throw new Error("Request ini sudah dikonversi.");
        }
        const target = doc(colRef(editSection));
        tx.set(target, { ...payload, position: Date.now() });
        tx.update(source, {
          convertedId: target.id,
          convertedType: editSection,
          updatedAt: Date.now(),
        });
      });
    } else if (id) {
      synced = await commitWrite(
        updateDoc(doc(colRef(editSection), id), payload),
        "Perubahan gagal disinkronkan.",
      );
    } else {
      const createdRef = doc(colRef(editSection));
      synced = await commitWrite(
        setDoc(createdRef, { ...payload, position: Date.now() }),
        "Data gagal disinkronkan.",
      );
    }

    onNotice(
      synced
        ? id
          ? "Perubahan tersimpan."
          : `${SECTION_LABELS[editSection]} dibuat.`
        : "Tersimpan offline · Akan diunggah saat online.",
    );
  }

  async function changeStatus(item: Item, status: string) {
    if (!user) return;
    onError("");
    const changes = {
      status,
      position: Date.now(),
      completedAt: status === "Selesai" ? Date.now() : null,
      updatedAt: Date.now(),
    };
    try {
      let synced = true;
      if (!db) {
        saveLocal({
          ...items,
          todos: items.todos.map((t) =>
            t.id === item.id ? { ...t, ...changes } : t,
          ),
        });
      } else {
        synced = await commitWrite(
          updateDoc(doc(colRef("todos"), item.id), changes),
          "Status gagal disinkronkan.",
        );
      }
      onNotice(
        synced
          ? "Status to-do tersimpan."
          : "Status tersimpan offline · Akan diunggah saat online.",
      );
    } catch {
      onError("Status gagal disimpan. Coba lagi.");
    }
  }

  async function updateTaskChecklist(item: Item, checklist: ChecklistItem[]) {
    if (!user) return;
    onError("");
    const changes = { checklist, updatedAt: Date.now() };
    try {
      let synced = true;
      if (!db) {
        saveLocal({
          ...items,
          todos: items.todos.map((t) =>
            t.id === item.id ? { ...t, ...changes } : t,
          ),
        });
      } else {
        synced = await commitWrite(
          updateDoc(doc(colRef("todos"), item.id), changes),
          "Checklist gagal disinkronkan.",
        );
      }
      onNotice(
        synced
          ? "Checklist tersimpan."
          : "Checklist tersimpan offline · Akan diunggah saat online.",
      );
    } catch {
      onError("Checklist gagal disimpan. Coba lagi.");
    }
  }

  async function reorderTodo(
    activeId: string,
    overId: string,
    hasActiveFilter: boolean,
  ) {
    if (!user) return;
    const task = items.todos.find((t) => t.id === activeId);
    if (!task) return;
    const target = items.todos.find((t) => t.id === overId);
    if (target?.id === task.id) return;
    const status = target?.status || overId.replace(/^column:/, "");
    if (!SECTION_STATUSES.todos.includes(status)) return;
    if (hasActiveFilter && task.status === status) return;

    const ordered = items.todos
      .filter((t) => t.status === status && t.id !== task.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    const index = target
      ? Math.max(0, ordered.findIndex((t) => t.id === target.id))
      : ordered.length;
    ordered.splice(index, 0, {
      ...task,
      status,
      completedAt: status === "Selesai" ? task.completedAt || Date.now() : null,
    });

    try {
      let synced = true;
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
          batch.update(doc(colRef("todos"), t.id), {
            status: t.status,
            position: (i + 1) * 1000,
            completedAt: t.completedAt || null,
            updatedAt: Date.now(),
          }),
        );
        synced = await commitWrite(
          batch.commit(),
          "Urutan tugas gagal disinkronkan.",
        );
      }
      onNotice(
        synced
          ? "Perubahan tersimpan."
          : "Tersimpan offline · Akan diunggah saat online.",
      );
    } catch {
      onError("Gagal memindahkan tugas. Coba lagi.");
    }
  }

  async function removeItem(s: Section, item: Item) {
    let synced = true;
    if (!db) {
      const next = structuredClone(items);
      next[s] = next[s].filter((i) => i.id !== item.id);
      if (s === "projects") {
        next.todos = next.todos.map((t) =>
          t.projectId === item.id ? { ...t, projectId: "" } : t,
        );
        next.notes = next.notes.map((n) =>
          n.projectId === item.id ? { ...n, projectId: "" } : n,
        );
      }
      saveLocal(next);
    } else {
      if (
        s === "projects" &&
        items.todos.some((t) => t.projectId === item.id)
      ) {
        throw new Error(
          "Lepaskan proyek dari to-do terkait sebelum menghapus proyek.",
        );
      }
      if (s === "projects") {
        const linkedNotes = items.notes.filter((n) => n.projectId === item.id);
        if (linkedNotes.length > 0) {
          const { writeBatch } = await import("firebase/firestore");
          const batch = writeBatch(db);
          linkedNotes.forEach((note) =>
            batch.update(doc(noteColRef(), note.id), {
              projectId: "",
              updatedAt: Date.now(),
            }),
          );
          batch.delete(doc(colRef(s), item.id));
          synced = await commitWrite(
            batch.commit(),
            "Penghapusan proyek gagal disinkronkan.",
          );
        } else {
          synced = await commitWrite(
            deleteDoc(doc(colRef(s), item.id)),
            "Penghapusan proyek gagal disinkronkan.",
          );
        }
      } else {
        synced = await commitWrite(
          deleteDoc(doc(colRef(s), item.id)),
          "Penghapusan gagal disinkronkan.",
        );
      }
    }
    onNotice(
      synced
        ? `${SECTION_LABELS[s]} dihapus.`
        : `${SECTION_LABELS[s]} dihapus offline · Akan disinkronkan saat online.`,
    );
  }

  return {
    user,
    checking,
    items,
    loading,
    isSynced: Boolean(db),
    signOutUser: auth
      ? () => {
          void signOut(auth!);
        }
      : undefined,
    saveNote,
    deleteNote,
    saveItem,
    changeStatus,
    updateTaskChecklist,
    reorderTodo,
    removeItem,
  };
}
