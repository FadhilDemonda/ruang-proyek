import type { Section } from "./types";

export type WorkspaceSection = Section | "notes";

type WorkspaceRoute = {
  section: WorkspaceSection;
  detailId?: string | null;
  projectId?: string;
};

export function readWorkspaceRoute(params: Pick<URLSearchParams, "get">) {
  const value = params.get("section");
  const section = value === "todos" || value === "requests" || value === "notes"
    ? value
    : "projects";
  const detailId = params.get("detail");
  return {
    section,
    detailId: section === "notes" ? detailId : detailId || null,
    projectId: section === "todos" ? params.get("project") || "" : "",
  } satisfies WorkspaceRoute;
}

export function workspaceHref({ section, detailId, projectId }: WorkspaceRoute) {
  const params = new URLSearchParams();
  if (section !== "projects" || detailId != null) params.set("section", section);
  if (detailId != null) params.set("detail", detailId);
  if (section === "todos" && projectId) params.set("project", projectId);
  return params.size ? `/?${params}` : "/";
}
