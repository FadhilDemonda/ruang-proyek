export type Section = "projects" | "todos" | "requests";

export const TODO_STATUSES = [
  "Belum Mulai",
  "Dikerjakan",
  "On Review",
  "Selesai",
] as const;
export type TodoTone = "todo" | "progress" | "review" | "done";

export function todoTone(status: string): TodoTone {
  if (status === "Dikerjakan") return "progress";
  if (status === "On Review") return "review";
  if (status === "Selesai") return "done";
  return "todo";
}

export const TODO_PRIORITIES = ["Tinggi", "Sedang", "Rendah"] as const;
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  projectId?: string;
};

export type Item = {
  id: string;
  title: string;
  description?: string;
  status: string;
  date?: string;
  folder?: string;
  analysis?: string;
  projectId?: string;
  requester?: string;
  requestDate?: string;
  links?: { label: string; url: string }[];
  position?: number;
  updatedAt?: number;
  convertedType?: string;
  convertedId?: string;
  completedAt?: number | null;
  priority?: TodoPriority | null;
  checklist?: ChecklistItem[];
};
