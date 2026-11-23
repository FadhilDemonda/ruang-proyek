# Hari Ini: task-first simplification

## Direction

Approved in-session: execute directly; show tasks first, remove statistic cards, and collapse secondary information. This is a scoped distill of the existing workspace, not a replacement brand.

Mode: Operate. Audience: the person returning to their daily workspace. Primary job: identify and act on the next task.

Reading: a daily task surface in the existing olive workspace language. ENERGY 1 / RHYTHM 1 / MOTION 1.

- Palette: existing olive action color and neutral surfaces preserve workspace recognition; red only identifies overdue tasks.
- Typography: retain Plus Jakarta Sans for consistency with adjacent modules; task titles lead metadata rather than competing with badges.
- Layout: one 920px reading column, one task surface, and unboxed disclosure rows reduce simultaneous decisions.
- Spacing: 36px separates purposes; smaller gaps keep each task's title, context, and status together.
- Icons: reuse the existing calendar, folder, inbox, document, check, and chevron symbols for their literal actions or content.
- Motion: native disclosure and existing interaction feedback; no new entrance effects or decorative animation.

## Removed complexity and access paths

- Four KPI cards removed. Relevant counts sit beside the task heading and disclosure labels.
- Initial focus list limited to five tasks. The explicit “Lihat … tugas lainnya” control reveals the rest; “Semua to-do” opens the full module.
- Duplicate status badges removed. Each task keeps one editable status control.
- Checklist details and secondary priority badges moved out of the overview presentation; task detail retains them.
- Project progress and note excerpts removed from the overview presentation; their detail pages remain reachable by title.
- Project, request, and note previews collapsed by default, each showing up to three items with access to the full module.
- Project/note creation and request conversion remain inside the relevant disclosure.

## Verification

- Production: `npm.cmd run build` passed, including TypeScript checking.
- Browser: six productivity tests passed in the main run. The added empty/error test initially matched Next.js's route announcer as well as the app alert; its locator was scoped to `.content`, and the targeted rerun passed.
- Viewports: 1440px and 390px, light and dark; 360px empty/error state. No horizontal overflow in the measured renders.
- Captures: `.impeccable/review/overview-{1440,390}-{light,dark}.png`, `overview-expanded.png`, and `overview-empty-error.png`. Captures were opened and inspected after disabling transition timing for screenshots.
- Browser runtime: no uncaught page errors during the full overview interaction sequence.
- Contrast: all measured text-role combinations exceed AA. Minimum measured light contrast 5.03:1 (primary on soft); minimum dark 7.72:1 (overdue text on surface).
- Detector ran once on the changed component and stylesheet. Its only findings were existing Plus Jakarta Sans declarations, retained for the approved cross-module consistency.

### Recorded interaction checks

- Add task opens the form with today's deadline; Escape closes it.
- Status selection saves “Selesai”, removes that task from focus, and displays confirmation.
- Five-task limit expands to seven and contracts to five; completed and future unstarted tasks stay excluded.
- Project disclosure opens with keyboard Enter; request and note disclosures reveal their content on click.
- Add project opens its form; Escape closes it.
- Both request conversion actions open a form with the request title preserved.
- Calendar, all tasks, task detail, project detail, project Kanban, all projects, request detail, all requests, note detail, new note, and all notes each navigate to their expected route.
- The theme control switches both ways and renders the page in both palettes.
- Empty project/request/note disclosures remain usable alongside the existing local-data error alert.

## Delivery gate (changed surface)

### Hard gate

- R-02 PASS: new UI copy contains no em dashes.
- R-03 PASS: measured 360/390/1440px layouts have no horizontal overflow; new controls are at least 44px tall.
- R-17 PASS: counts derive from actual item arrays.
- R-18 PASS: no testimonials introduced.
- R-23 PASS: approved layout uses existing icons; no new identity or person assets.
- R-24 PASS: route actions verified in the browser, listed above.
- R-25 PASS: measured text-palette contrasts exceed 4.5:1 in both themes.
- R-26 PASS: every overview action exercised, including disclosure, expansion, status, creation, conversion, and navigation.
- R-27 PASS: empty/error states exercised; loading branch retains a named status region and suppresses premature counts.
- R-28 PASS: no FAQ introduced.
- R-32 PASS: native buttons/details and existing keyboard-operable Select; Enter disclosure checked; shared visible focus outline retained.
- R-33 PASS: source edited directly with patches.
- R-34 PASS: both palettes captured and inspected using the real theme control.
- R-35 PASS: production build and recorded browser interactions completed.
- R-36 PASS: no security, customer, or performance claims introduced.
- R-37 PASS: user approved task-first simplification and retained olive/font identity.
- R-38 PASS: display content comes from workspace data; test fixtures stay in tests.
- R-39 PASS: named native controls, pointer affordance, hover/active feedback, inherited disabled/focus behavior; no new continuous motion.
- R-40 PASS: no media or third-party scripts added; no unmeasured performance score claimed.

### Purpose gate

- R-01 PASS: olive identifies primary action; no gradient/glow added.
- R-04 PASS: existing icons identify literal module types and actions.
- R-06 PASS: existing face preserves cross-module consistency, with title-first hierarchy.
- R-07 PASS: no background pattern introduced.
- R-08 PASS: chevrons communicate disclosure; no decorative CTA arrows.
- R-09 PASS: count text replaces redundant badges.
- R-10 PASS: no blur/glass introduced.
- R-12 PASS: focus surface has no decorative shadow.
- R-13 PASS: no glow introduced.
- R-14 PASS: secondary modules use disclosure rows rather than competing cards.
- R-19 PASS: native disclosure adds no decorative motion.
- R-22 PASS: no illustration added.

### Liveliness and quality

- Dials PASS: calm task-first hierarchy, predictable list rhythm, existing interaction-only motion.
- Focal point PASS: focus list is the only large surface; secondary modules defer to it.
- R-05/R-11 PASS: one content-driven column, consistent radii, no nested cards.
- R-15/R-16 PASS: action labels name the specific task; no marketing copy introduced.
- R-20/R-21/R-29/R-30 PASS: recognizable existing olive workspace, functional theme choice, no new palette or copied product identity.
- R-31 PASS: major visual decisions and their reasons recorded above.
- C-1/C-2/C-3/C-4/C-5 PASS: documented intent, exercised controls, task-driven composition, responsive states, and data-derived content.

Qualitative follow-up: verify with the owner that secondary disclosures are sufficiently discoverable. Task-completion speed was not measured with real users.
