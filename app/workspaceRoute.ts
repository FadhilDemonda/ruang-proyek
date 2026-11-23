import type { Section } from "./types";

export type WorkspaceSection = Section | "notes" | "overview" | "calendar";

type WorkspaceRoute = {
  section: WorkspaceSection;
  detailId?: string | null;
  projectId?: string;
};

export function readWorkspaceRoute(params: Pick<URLSearchParams, "get">) {
  const value = params.get("section");
  const section: WorkspaceSection =
    value === "projects" ||
    value === "todos" ||
    value === "requests" ||
    value === "notes" ||
    value === "calendar"
      ? value
      : "overview";
  const detailId = params.get("detail");
  const supportsProject =
    section === "todos" || section === "notes" || section === "calendar";
  return {
    section,
    detailId: section === "notes" ? detailId : detailId || null,
    projectId: supportsProject ? params.get("project") || "" : "",
  } satisfies WorkspaceRoute;
}

export function workspaceHref({ section, detailId, projectId }: WorkspaceRoute) {
  const params = new URLSearchParams();
  if (section !== "overview" || detailId != null) params.set("section", section);
  if (detailId != null) params.set("detail", detailId);
  if (
    (section === "todos" || section === "notes" || section === "calendar") &&
    projectId
  ) {
    params.set("project", projectId);
  }
  return params.size ? `/workspace?${params}` : "/workspace";
}
