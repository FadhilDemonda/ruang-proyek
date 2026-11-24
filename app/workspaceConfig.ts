import { TODO_STATUSES, type Item, type Note, type Section } from "./types";
import type { WorkspaceSection } from "./workspaceRoute";

export const DATA_COLLECTIONS = ["projects", "todos", "requests", "notes"] as const;

export const SECTION_LABELS: Record<WorkspaceSection, string> = {
  overview: "Hari Ini",
  projects: "Proyek",
  todos: "To-do",
  calendar: "Kalender",
  requests: "Request",
  notes: "Notes",
};

export const SECTION_STATUSES: Record<Section, string[]> = {
  projects: ["Direncanakan", "Dikerjakan", "Selesai", "Diarsipkan"],
  todos: [...TODO_STATUSES],
  requests: ["Baru", "Dikerjakan", "Selesai", "Dibatalkan"],
};

export const LOCAL_STORAGE_KEY = "ruang-proyek-local-v1";

export type WorkspaceData = Record<Section, Item[]> & { notes: Note[] };

export const blankData = (): WorkspaceData => ({
  projects: [],
  todos: [],
  requests: [],
  notes: [],
});

export const emptyItem = (section: Section): Item => ({
  id: "",
  title: "",
  description: "",
  status: SECTION_STATUSES[section][0],
  date: "",
  folder: "",
  projectId: "",
  requester: "",
  links: [],
  priority: null,
  checklist: [],
});
