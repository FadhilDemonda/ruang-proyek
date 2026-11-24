# Ruang Proyek — Project Index

> Read this file first before scanning or reading large source files. Open only the specific module and line range needed for the task.

## 1. Stack & Commands

- **Framework**: Next.js `^15.3.0` (App Router), React `^19.0.0`, TypeScript `^5.8.0`
- **Backend / Sync**: Firebase Auth + Cloud Firestore (`firebase ^11.6.0`) with `persistentLocalCache` + `persistentMultipleTabManager` in `app/firebase.ts`; automatic `localStorage` fallback (`ruang-proyek-local-v1`) when Firebase env vars are empty
- **UI / Drag & Drop**: Custom CSS (imported in cascade order via `app/layout.tsx`), `@dnd-kit/core`, `@dnd-kit/sortable`
- **Windows PowerShell**: Always use `npm.cmd` / `npx.cmd` instead of bare `npm` / `npx` (avoids `.ps1` execution policy errors):
  - Type check: `npx.cmd tsc --noEmit`
  - Production build: `npm.cmd run build`
  - E2E suite (MS Edge, port `3100`, local mode): `npm.cmd test` (`playwright.config.ts`)

## 2. Routes (`app/`)

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `app/page.tsx` | Marketing/overview landing page + interactive preview |
| `/workspace` | `app/workspace/page.tsx` -> `app/WorkspaceApp.tsx` | Main workspace (`Hari Ini`, `Proyek`, `To-do`, `Kalender`, `Request`, `Notes`) |
| `/login` | `app/login/page.tsx` -> `app/AuthScreen.tsx` | Sign-in page |
| `/register` | `app/register/page.tsx` -> `app/AuthScreen.tsx` | Registration page |
| `/profil` | `app/profil/page.tsx` -> `app/profil/Preview.tsx` | Profile showcase / preview route |
| `/manifest.webmanifest` | `app/manifest.ts` | Dynamic PWA web app manifest |
| Root layout | `app/layout.tsx` | Metadata, viewport, `<PwaRegister />`, ordered CSS imports |

## 3. Core Architecture & State

| File | Lines | Responsibility |
| --- | --- | --- |
| `app/types.ts` | 54 | `Section`, `TODO_STATUSES`, `TODO_PRIORITIES`, `todoTone()`, `ChecklistItem`, `Note`, `Item` |
| `app/workspaceConfig.ts` | 44 | `DATA_COLLECTIONS`, `SECTION_LABELS`, `SECTION_STATUSES`, `LOCAL_STORAGE_KEY`, `WorkspaceData`, `blankData()`, `emptyItem()` |
| `app/workspaceRoute.ts` | 42 | `WorkspaceSection`, `readWorkspaceRoute()`, `workspaceHref()` (query-param navigation for static/PWA-friendly routing) |
| `app/useWorkspaceStore.ts` | 515 | Auth subscription, Firestore real-time listeners + `localStorage` fallback, offline-safe `commitWrite`, CRUD for projects/todos/requests/notes, `signOutUser` |
| `app/WorkspaceApp.tsx` | 789 | Workspace shell: routing, filters, theme/sidebar state, command palette (`Ctrl+K`), view dispatch, delete/notes-leave modals |
| `app/firebase.ts` | 38 | Firebase app init, `auth`, `db` with multi-tab persistent IndexedDB cache |
| `firestore.rules` | 11 | Per-user `users/{uid}/{document=**}` read/write authorization rules |

## 4. Feature Views & Components

| Component | Lines | Scope |
| --- | --- | --- |
| `app/OverviewView.tsx` | 225 | `Hari Ini` overview dashboard (today focus, due/active summary, quick navigation) |
| `app/ProjectsView.tsx` | 803 | Project list, status filter, inline project detail with linked tasks & notes |
| `app/TodoView.tsx` | 835 | Kanban board (`@dnd-kit`) + List view, status/priority/project filters, mobile column switcher |
| `app/CalendarView.tsx` | 560 | Monthly calendar grid for deadlines, task selection, quick add on date |
| `app/RequestsView.tsx` | 164 | Requests list, search/status filter, convert-to-project/todo actions |
| `app/NotesView.tsx` | 873 | Rich block/markdown notes list & editor, auto-save, project linking, compact mobile controls |
| `app/ItemDetail.tsx` | 235 | Shared detail view for To-do (with interactive checklist) & Request items |
| `app/ItemFormModal.tsx` | 287 | Create/edit modal for Projects, Todos (priority + checklist builder), and Requests (incl. conversion) |
| `app/CommandPalette.tsx` | 370 | `Ctrl+K` / `Cmd+K` quick jump & search across sections, items, notes, and actions |
| `app/Sidebar.tsx` | 295 | Desktop collapsible sidebar + mobile `<dialog>` drawer, project shortcuts, avatar upload |
| `app/AuthScreen.tsx` | 457 | Email/password & Google auth UI |
| `app/Select.tsx` | 309 | Accessible custom dropdown (`Select`) |
| `app/Modal.tsx` | 63 | Accessible modal wrapper (`<dialog>`) |
| `app/HeaderDate.tsx` | 79 | Header live date widget |
| `app/ThemeToggle.tsx` & `app/themeTransition.ts` | 39 / 77 | Light/dark theme switcher & View Transition helper |
| `app/WorkspaceIcon.tsx` & `app/Logo.tsx` | 36 / 3 | Inline SVG workspace icons & brand mark |

## 5. Stylesheets (Cascade Order Matters!)

Imported strictly in this order in `app/layout.tsx`:
1. `app/styles/base.css` (1025L) — Reset, theme CSS variables, auth/landing/base layout tokens
2. `app/styles/todo.css` (744L) — To-do Kanban columns, cards, badges, list table, filters
3. `app/styles/shell.css` (492L) — App shell, sidebar, mobile drawer, header, breadcrumbs, toast
4. `app/styles/projects-notes.css` (1019L) — Projects cards/detail, Notes list/editor/toolbar
5. `app/styles/features.css` (1409L) — ItemDetail, Overview (`Hari Ini`), Calendar, Command Palette, Priority/Checklist, responsive overrides

Scoped styles:
- `app/auth.module.css` (460L) — Login/Register styles
- `app/profil/profil.css` (896L) — Profile preview styles

## 6. PWA & Offline

- `app/manifest.ts` (36L), `app/icon.svg` (1L), `public/icons/*` (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`)
- `app/PwaRegister.tsx` (27L) registers `public/sw.js` (104L) for app-shell / asset caching (`Cache-Control` / `Service-Worker-Allowed` headers in `next.config.ts`)
- Offline Firestore writes resolve from local cache (`commitWrite` in `app/useWorkspaceStore.ts`) and sync automatically when online

## 7. E2E Tests (`tests/`)

| File | Lines | Coverage |
| --- | --- | --- |
| `tests/avatar.spec.ts` | 24 | Sidebar avatar upload & persistence |
| `tests/notes.spec.ts` | 158 | Notes create/edit, auto-save, delete, project link |
| `tests/productivity-features.spec.ts` | 388 | Overview, To-do priority/checklist, linked notes, Calendar, `Ctrl+K` palette |
| `tests/pwa.spec.ts` | 48 | Web manifest, icons, service worker registration/response |
| `tests/ui-regressions.spec.ts` | 426 | Core CRUD, views, mobile drawer, regressions |
