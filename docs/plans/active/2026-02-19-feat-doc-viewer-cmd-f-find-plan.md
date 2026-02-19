---
title: "Add Cmd+F in-document find to docs viewer"
date: 2026-02-19
status: draft
tags: [tauri, app, docs-viewer, keyboard-shortcut, find, milestone-1]
milestone: M1
---

## Goal

When the user presses Cmd+F in the docs viewer, an in-document find flow opens for the currently selected document, searches both markdown body and frontmatter-derived metadata, supports match navigation, and works without regressing existing docs load/read behavior.

## Context

- The reader renders markdown in `DocViewerPanel`, so find UX and match highlighting should be anchored to this surface (`apps/app/src/components/DocViewerPanel.tsx:68`, `apps/app/src/components/DocViewerPanel.tsx:89`).
- Frontmatter-derived metadata is already rendered in the reader (`Section`, `Path`, `Status`, `Date`, `Milestone`, `Tags`), so search scope can include this metadata panel plus markdown body (`apps/app/src/components/DocViewerPanel.tsx:16`, `apps/app/src/components/DocViewerPanel.tsx:74`).
- `App` currently manages document list/selection/load states but has no search-query or match-navigation state (`apps/app/src/App.tsx:30`, `apps/app/src/App.tsx:37`, `apps/app/src/App.tsx:169`).
- Existing frontend coverage verifies tree navigation and document loading, but no keyboard-shortcut/find regression tests exist yet (`apps/app/src/App.test.tsx:109`, `apps/app/src/App.test.tsx:140`).
- Prior docs-viewer work intentionally scoped away from search/indexing, so this plan adds an explicit and bounded in-document search scope only (`docs/plans/completed/2026-02-18-feat-comprehensive-docs-viewer-plan.md`).
- External research decision: skipped. This is a local UI behavior feature with strong in-repo context and no high-risk external API/security dependency.

## Prior Art

- `docs/solutions/2026-02-18-comprehensive-docs-viewer.md`
- `docs/solutions/2026-02-19-doc-viewer-plannotator-layout-alignment.md`
- `docs/solutions/2026-02-19-doc-viewer-markdown-list-markers.md`
- `docs/plans/completed/2026-02-18-feat-comprehensive-docs-viewer-plan.md`

## Approach

1. **Lock find interaction contract**
   - [x] Action: Define exact shortcut and interaction behavior for macOS and non-macOS (`Cmd+F` / `Ctrl+F`), plus close/navigation keys (`Esc`, `Enter`, `Shift+Enter`).
   - [x] Action: Define scope boundaries: search within current document only (markdown body + frontmatter-derived metadata), no cross-file search/indexing in this milestone.
   - [x] Deliverables: A concrete behavior contract (trigger, empty query behavior, no-match behavior, doc-switch reset behavior).
   - [x] Exit criteria: Implementation and tests can assert deterministic behavior without UX ambiguity.

2. **Add find state and keyboard boundary in app layer**
   - [x] Action: Add docs-viewer find state ownership in `App` (query, match count, active match index, open/closed state).
   - [x] Action: Register and clean up keyboard handlers so shortcut capture is limited to viewer context and does not break normal input fields.
   - [x] Deliverables: Stable app-level find state transitions wired into the viewer panel props.
   - [x] Exit criteria: Pressing shortcut reliably opens the find UI and focuses the query input without affecting unrelated controls.

3. **Implement in-document matching + active-match navigation**
   - [x] Action: Add match discovery/highlighting over the reader content with case-insensitive text matching for markdown body and frontmatter metadata rows.
   - [x] Action: Implement next/previous navigation and active-match scroll-into-view behavior.
   - [x] Deliverables: Visible match highlighting in body/metadata, current-match indicator, and deterministic next/previous traversal.
   - [x] Exit criteria: Query updates refresh match set correctly; navigation cycles through matches predictably.

4. **Add compact find UI in reader surface**
   - [x] Action: Add a minimal find bar in the reader header/panel with query input, match counter, prev/next controls, and close control.
   - [x] Action: Keep design language aligned with existing monochrome docs viewer tokens and spacing.
   - [x] Deliverables: Accessible find controls with keyboard-friendly focus order and ARIA labels.
   - [x] Exit criteria: Find UI is usable via keyboard only and visually consistent with current viewer styling.

5. **Add regression and edge-case tests**
   - [ ] Action: Extend app tests for shortcut trigger, UI open/close, and no-regression of existing document selection flow.
   - [ ] Action: Add tests for match counting and navigation behavior (including no-match and document-switch reset).
   - [ ] Deliverables: Automated coverage that fails if shortcut wiring or in-document find behavior regresses.
   - [ ] Exit criteria: Removing shortcut wiring or match-navigation logic causes targeted test failures.

6. **Run full gate and manual smoke**
   - [ ] Action: Run full repository gate (`lint`, `typecheck`, `test`, `build`, `validate`).
   - [ ] Action: Run app-focused checks and manual Tauri smoke for Cmd+F flow on docs with multiple matches and zero matches.
   - [ ] Deliverables: Command results and manual verification notes.
   - [ ] Exit criteria: Automated checks pass and manual viewer behavior matches the defined contract.

7. **Compound follow-up**
   - [ ] Action: Capture solved pattern and prevention notes in `docs/solutions/` after implementation.
   - [ ] Action: Update design docs only if this work introduces a reusable keyboard-shortcut convention beyond this feature.
   - [ ] Deliverables: New solution doc linked to this plan.
   - [ ] Exit criteria: Future agents can discover and reuse the in-document find pattern.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test`
- `pnpm --filter @coda/app tauri dev` (manual smoke: `Cmd+F`/`Ctrl+F`, match navigation, close/reset)

## Find Contract

- Trigger: `Meta+F` on macOS and `Ctrl+F` on non-macOS opens find bar and focuses query input.
- Close: `Esc` closes find bar and clears query/match state for the current document.
- Navigate: `Enter` moves to next match, `Shift+Enter` moves to previous match.
- Scope: current selected document only; searchable surface is rendered metadata rows (`Section`, `Path`, `Status`, `Date`, `Milestone`, `Tags`) and rendered markdown body.
- Matching: case-insensitive plain-text matching, ordered by DOM appearance in reader panel.
- Empty query: no highlights, counter `0/0`, navigation controls disabled.
- No-match query: no highlights, counter `0/0`, navigation controls disabled.
- Document switch/reload: reset query, match list, and active match index to avoid stale state carry-over.
- Out of scope for this plan: cross-document/global search, persistent search history, regex mode, whole-word mode.

## Risks

- Highlight implementation may be expensive on very long markdown files.
  - Mitigation: scope matching to rendered reader container and keep updates incremental/debounced as needed.
- Shortcut handling can conflict with text inputs if key filtering is too broad.
  - Mitigation: ignore shortcut interception when focus is in editable elements except the dedicated find input behavior.
- Match state can become stale when switching documents or reloading docs list.
  - Mitigation: reset query/match state on selected-doc identity changes and add regression coverage for reset semantics.
- Frontmatter search can over-match short metadata labels/values and reduce readability.
  - Mitigation: include body-vs-metadata match cases in tests and keep active-match visibility clear during navigation.
- Scope creep into cross-document search/index features.
  - Mitigation: keep this plan strictly in-document and defer global docs search to a separate plan.

## Progress Log

- 2026-02-19: Planning target confirmed: add Cmd+F find behavior in docs viewer.
- 2026-02-19: Checked `docs/plans/active/`; no active plan found for this specific Cmd+F docs-viewer feature.
- 2026-02-19: Reviewed docs-viewer prior art in `docs/solutions/` and completed plans to align scope and avoid regressions.
- 2026-02-19: Reviewed current code-flow boundaries in `apps/app/src/App.tsx`, `apps/app/src/components/DocViewerPanel.tsx`, and `apps/app/src/App.test.tsx`.
- 2026-02-19: External research explicitly skipped because local code and docs context are sufficient for this low-risk UI feature plan.
- 2026-02-19: Scope decision updated by user: in-document find must include markdown body and frontmatter-derived metadata (not body-only).
- 2026-02-19: Step 1 complete. Interaction contract locked for shortcut, key navigation, search scope (body + metadata), empty/no-match behavior, and doc-switch reset semantics.
- 2026-02-19: Step 2 complete. Added app-level find state and keyboard shortcut boundary in `apps/app/src/App.tsx`, plus viewer-prop wiring and input focus handling in `apps/app/src/components/DocViewerPanel.tsx`.
- 2026-02-19: Step 3 complete. Added DOM-order, case-insensitive highlight matching across metadata + markdown body, plus next/previous active-match traversal and scroll-into-view behavior in `DocViewerPanel`.
- 2026-02-19: Step 4 complete. Added compact reader find bar UI with input, counter, prev/next, close controls, and keyboard-friendly ARIA wiring in `DocViewerPanel`.
