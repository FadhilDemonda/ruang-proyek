# Notes Design

## Intent

Add a Notes workspace for personal free-form notes, stored alongside the existing projects, to-do items, and requests. A person can create many notes, scan recent work from a responsive card grid, then open one note in a dedicated in-app detail screen to edit plain text.

## Goals

- Add **Notes** to the desktop sidebar, mobile menu, and mobile bottom navigation.
- Show saved notes in a responsive grid: three columns when the workspace is wide, two at intermediate widths, one on phones.
- Each card shows title, a clipped excerpt of plain text content, and its actual last-edited time.
- Provide an explicit empty, loading, and error state.
- Open a note into its own in-app detail screen with the existing shell and header retained.
- Detail screen has a back action, labelled plain-text title/content fields, and adjacent **Hapus** and primary **Simpan** actions.
- Hapus is available only after a note exists, requires confirmation, and returns to the Notes list after completion.
- Save data in local storage when Firebase is not configured; otherwise persist under `users/{uid}/notes` and allow Firestore access under the existing authenticated-owner rules.
- Warn before leaving a changed note without saving, with choices to keep editing or discard changes.

## Non-goals

- Rich text, Markdown rendering, checklists, categories, tags, attachments, search, sharing, project linkage, and data migration beyond safely handling pre-existing local data that has no `notes` property.
- Changes to existing project, to-do, request, authentication, or visual identity behavior.

## Chosen approach

Use the existing single-page workspace state model rather than add a separate URL route. This preserves the established shell, sidebar, theme behavior, local/Firebase fallback, and the application's current navigation convention. The note detail is a distinct screen state inside the workspace, not a modal.

## Design decisions

- **Visual language:** inherit the existing green workspace shell, panel border, typography, focus token, and primary button. No new brand colors or generated assets.
- **Composition:** the Notes list leads with its title and one specific action, then the card grid. Cards are content containers for records, not decorative feature cards.
- **Typography:** title is the scan target; excerpt gives context; edited time supports recency decisions.
- **Responsive behavior:** desktop 3 columns, medium widths 2, phone 1; detail actions wrap rather than clip.
- **Interaction:** cards are semantic buttons with an accessible name; forms use visible labels; back/close actions have real behavior; destructive action opens the existing focus-managed confirmation dialog.

## State and copy

- New note starts as “Catatan baru” only as the form heading; the title field itself is empty and required.
- Empty state: “Belum ada catatan” with “Buat catatan pertama untuk menyimpan ide, konteks, atau keputusan penting.”
- Loading state: “Memuat catatan…”
- Error state follows existing workspace alert behavior.
- Last-edited label uses a local Indonesian date/time derived from actual `updatedAt` data.

## Verification scope

Playwright tests must prove local-mode navigation, empty state, create, save, responsive grid count, open detail, unsaved-change prompt, discard, deletion cancellation/confirmation, theme continuity, and no horizontal overflow at a 390px viewport. Type checking, production build, detector scan, and a rendered desktop/mobile visual pass are required.
