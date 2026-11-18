export type Section = "projects" | "todos" | "requests";

export type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
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
};

export const TODO_STATUSES = ["Belum Mulai", "Dikerjakan", "Selesai"] as const;
