# Agent Working Guidelines (`ruang-proyek`)

1. **Read `INDEX.md` first** before listing directories or reading large files. Jump straight to the relevant file and line range.
2. **Targeted reads only**: Do not read full 700–1400 line files (`NotesView.tsx`, `TodoView.tsx`, `ProjectsView.tsx`, `WorkspaceApp.tsx`, `app/styles/*.css`) unless you are refactoring them; grep/search for the selector or symbol and read only the surrounding block.
3. **Preserve CSS cascade order**: Keep the 5 `app/styles/*.css` imports in `app/layout.tsx` in exact order (`base.css` -> `todo.css` -> `shell.css` -> `projects-notes.css` -> `features.css`).
4. **Windows commands**: Run `npm.cmd` / `npx.cmd` instead of `npm` / `npx`.
5. **Verification**: After any code edit, run `npx.cmd tsc --noEmit`, `npm.cmd run build`, and `npm.cmd test`. Note that `playwright.config.ts` disables Firebase env vars so E2E tests run against local browser storage on `http://127.0.0.1:3100`.
