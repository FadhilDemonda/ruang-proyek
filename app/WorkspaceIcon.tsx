const paths = {
  projects: "M3 7V5a1 1 0 0 1 1-1h5l3 3h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7ZM3 9h18",
  todos: "M4 4h16v16H4zM9 4v16m5-16v16",
  requests: "M3 14l3-9h12l3 9v5H3zM3 14h5l2 3h4l2-3h5",
  notes: "M6 3h9l3 3v15H6zM15 3v4h4M9 11h6M9 15h6",
  search: "m20 20-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  panel: "M3 4h18v16H3zM9 4v16",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19m0-14-1.5 1.5m-11 11L5 19m11-7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  workspace: "M3 4h18v16H3zM3 9h18M9 9v11",
  back: "M19 12H5m6 6-6-6 6-6",
  arrowRight: "M5 12h14m-5-5 5 5-5 5",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9",
  copy: "M9 9h10v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1",
  check: "m5 13 4 4L19 7",
  external: "M14 4h6v6M10 14 20 4M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5",
  folder: "M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
};

export default function WorkspaceIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
