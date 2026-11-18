# Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive, locally and Firebase-persisted Notes workspace with a dedicated in-app detail editor.

**Architecture:** Extend the current workspace data model with a minimal `Note` record and a `notes` collection. Keep navigation and screen selection in `app/page.tsx`, while isolating the list/detail surface in a new `NotesView` component. Reuse the existing modal exclusively for destructive confirmation and unsaved-change decisions.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Firebase Firestore, browser localStorage, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-notes-design.md`

## Global Constraints

- Preserve the existing workspace visual system and existing behavior outside Notes.
- Notes use plain text only and have no categories, attachments, sharing, tags, project links, or rich text.
- Store Firebase notes at `users/{uid}/notes`; local mode must safely load existing data without a `notes` field.
- Notes list uses three/two/one columns across desktop/tablet/phone and has no horizontal overflow.
- Detail actions are real, keyboard-accessible controls; delete requires confirmation and appears beside save only for existing notes.
- Keep generated test reports out of version control.

## Review Focus

- Existing local storage that lacks `notes` must still open all pre-existing workspace sections.
- A note changed but not saved must not be silently lost through back navigation or section navigation.
- A Firestore snapshot error for the Notes collection must expose the existing actionable error alert rather than leave Notes loading.
- Long unbroken text and long titles must wrap without horizontal page overflow at 390px.
- Delete cancellation must leave the editor and note data unchanged; confirmed deletion must return to the list.

---

### Task 1: Define Notes persistence and navigation

**Files:**
- Modify: `app/types.ts`
- Modify: `app/page.tsx`
- Modify: `app/Sidebar.tsx`
- Modify: `app/WorkspaceIcon.tsx`
- Modify: `firestore.rules`
- Test: `tests/notes.spec.ts`

**Interfaces:**
- Produces `Note` with `id`, `title`, `content`, and `updatedAt` fields.
- Produces `Section` value `notes` and data model that safely defaults missing local notes to `[]`.

- [ ] **Step 1: Write failing navigation/persistence tests**

```ts
test("opens Notes from workspace navigation and preserves legacy local data", async ({ page }) => {
  // Seed local data without notes, navigate through Notes, and assert its empty state.
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/notes.spec.ts`

Expected: FAIL because Notes is not a workspace destination.

- [ ] **Step 3: Add Notes data and navigation**

Extend types, workspace data initialization, local-data normalization, Firestore listeners, owner rules, labels, navigation icons, and mobile navigation to recognize `notes`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/notes.spec.ts`

Expected: PASS for Notes navigation and legacy local data.

### Task 2: Build list and detail behavior

**Files:**
- Create: `app/NotesView.tsx`
- Modify: `app/page.tsx`
- Test: `tests/notes.spec.ts`

**Interfaces:**
- Consumes: `Note[]`, `loading`, error/notice callbacks, and note create/update/delete callbacks.
- Produces: Notes list/detail in-app UI with `onBack`, `onSave`, `onDelete`, and unsaved-change confirmation behavior.

- [ ] **Step 1: Write failing create/edit/delete and unsaved-change tests**

```ts
test("creates, saves, edits, discards, and deletes a note", async ({ page }) => {
  // Use actual controls; verify persisted content and confirmation states.
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/notes.spec.ts`

Expected: FAIL because Notes list/editor controls do not exist.

- [ ] **Step 3: Implement `NotesView` and page-level persistence callbacks**

Keep draft state in `NotesView`; compare title/content to the opened note before navigating away; use the existing `Modal` for discard/delete confirmation.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npm test -- tests/notes.spec.ts`

Expected: PASS for create, save, discard, delete cancel, and delete confirmation.

### Task 3: Style responsive Notes surfaces and verify integration

**Files:**
- Modify: `app/style.css`
- Test: `tests/notes.spec.ts`

**Interfaces:**
- Consumes: semantic class names from `NotesView`.
- Produces: Notes grid and detail layout that inherit workspace tokens.

- [ ] **Step 1: Write failing responsive layout tests**

```ts
test("notes use three, two, and one columns without horizontal overflow", async ({ page }) => {
  // Seed three notes; verify grid columns at desktop/tablet/mobile and page width at mobile.
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/notes.spec.ts`

Expected: FAIL because no Notes grid exists.

- [ ] **Step 3: Implement scoped Notes styles**

Use existing color variables, visible focus states, 44px controls, text wrapping, and dedicated responsive breakpoints.

- [ ] **Step 4: Run the full suite and production checks**

Run: `npm test && node .\\node_modules\\typescript\\bin\\tsc --noEmit --incremental false && npm run build`

Expected: all Playwright tests, TypeScript, and production build pass.

- [ ] **Step 5: Run detector and manual visual checks**

Run: `C:\\Users\\mfadh\\.config\\opencode\\skills\\impeccable\\scripts\\impeccable.cmd detect --json app\\NotesView.tsx app\\style.css app\\page.tsx app\\Sidebar.tsx`

Expected: inspect any findings in context, then render and check desktop/mobile light/dark states.

## Self-review

- Spec coverage: Tasks 1–3 cover persistence, navigation, list/detail, destructive flow, unsaved drafts, responsive layout, and verification.
- Type consistency: `Note` is separate from existing `Item`; the new `notes` data array does not overload project/to-do/request statuses.
- Review focus: each listed edge case is assigned to Task 1–3 tests.
- Proportion: implementation choices are specified without embedding implementation bodies.
