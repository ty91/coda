---
title: "Tauri docs viewer UI refactor: modern monochrome + real docs tree sidebar"
date: 2026-02-18
status: draft
tags: [tauri, ui, docs-viewer, ux, refactor]
milestone: M1
---

## Goal

Refactor the Tauri app docs viewer into a clean black-and-white modern interface with a proper sidebar docs tree (section + nested path), while preserving existing docs load/read behavior and safety boundaries.

## Context

- Current UI is scaffold-like and visually colorful/gradient-heavy, not aligned with requested monochrome direction (`apps/app/src/styles.css:1`, `apps/app/src/styles.css:46`, `apps/app/src/styles.css:111`).
- Current document navigation is a flat `<select>` list, which does not expose a docs tree hierarchy (`apps/app/src/App.tsx:35`, `apps/app/src/App.tsx:175`).
- Data boundary already provides enough metadata to build a tree in frontend (`section`, `docPath`, `displayTitle`) without backend contract changes (`packages/core/src/contracts.ts:8`).
- Existing tests focus on flat selector behavior and hidden/template toggle; tree interaction coverage is missing (`apps/app/src/App.test.tsx:113`, `apps/app/src/App.test.tsx:144`).
- Prior implementation already generalized safe docs loading under `docs/`; this plan should reuse that foundation and stay UI-focused (`docs/plans/completed/2026-02-18-feat-comprehensive-docs-viewer-plan.md`, `docs/solutions/2026-02-18-comprehensive-docs-viewer.md`).
- External research decision: skipped. Local code/docs context is sufficient and risk is low (UI refactor + existing data contract).

## Prior Art

- `docs/plans/completed/2026-02-18-feat-comprehensive-docs-viewer-plan.md`
- `docs/solutions/2026-02-18-comprehensive-docs-viewer.md`
- `docs/solutions/2026-02-18-tauri-plan-markdown-viewer.md`
- `docs/design-docs/ux-specification.md` (mission-control intent, dashboard readability)

## Approach

1. **Define target UI information architecture + constraints**
   - [x] Action: Define sidebar tree model from `DocSummary[]` (section groups, nested folders/files from `docPath`, stable key strategy by `id`).
   - [x] Action: Define interaction rules (expand/collapse, active item, keyboard focus, empty/error states, hidden/template toggle placement).
   - [x] Deliverables: Written IA notes in plan progress + implementation checklist tied to current `App.tsx` states.
   - [x] Exit criteria: Tree behavior and selection rules are unambiguous before implementation.

2. **Refactor React structure for composable layout**
   - [x] Action: Split `App.tsx` into focused presentational units (sidebar tree, document header/metadata, markdown panel, utility controls) while keeping file sizes readable.
   - [x] Action: Keep data fetch lifecycle unchanged (`list_doc_summaries`, `get_doc_document`) and preserve error/loading semantics.
   - [x] Deliverables: Updated React component structure with stable state transitions for doc reload + doc selection.
   - [x] Exit criteria: Selecting a tree node loads same document content as today; refresh and toggle still work.

3. **Implement real docs tree sidebar UX**
   - [x] Action: Build a hierarchical sidebar from doc summaries with section headers and nested path nodes, not a flat dropdown.
   - [x] Action: Support expansion persistence during refresh when possible and deterministic ordering for predictable navigation.
   - [x] Action: Ensure hidden/template docs appear only when toggle is enabled, integrated into tree view.
   - [x] Deliverables: Sidebar tree with clickable leaf docs, active-state highlight, and clear path context.
   - [x] Exit criteria: User can browse docs tree and open files without using dropdown selectors.

4. **Apply monochrome modern visual system**
   - [x] Action: Replace colorful gradients and accent palette with black/white/gray tokenized styles.
   - [x] Action: Introduce consistent typography scale, spacing rhythm, border hierarchy, and subtle motion where useful (without visual noise).
   - [x] Action: Make layout responsive: desktop split view (sidebar + content), mobile stacked with usable navigation.
   - [x] Deliverables: Updated `styles.css` (or split CSS modules if needed) using coherent monochrome tokens and modern layout primitives.
   - [x] Exit criteria: UI reads clearly on desktop/mobile and matches requested black-and-white direction.

5. **Add regression coverage for new navigation model**
   - [x] Action: Replace flat-select assertions with tree-based interaction tests in `App.test.tsx`.
   - [x] Action: Add tests for expand/collapse and hidden/template toggle behavior within tree model.
   - [x] Action: Preserve existing error-state coverage and doc load assertions.
   - [x] Deliverables: Passing frontend tests that lock tree navigation and core fetch behavior.
   - [x] Exit criteria: Test suite fails if sidebar hierarchy or selection flow regresses.

6. **Run full validation gate + manual smoke**
   - [x] Action: Run repository validation commands and capture outcomes.
   - [x] Action: Run Tauri app smoke check for desktop/mobile-ish viewport behavior and docs tree usability.
   - [x] Deliverables: Validation evidence logged in progress section.
   - [x] Exit criteria: Lint/typecheck/tests pass and manual UI checks complete.

7. **Compound documentation follow-up**
   - [x] Action: Record solved UI-pattern learnings in `docs/solutions/` after implementation.
   - [x] Action: Update design docs only if this introduces reusable UI conventions beyond this feature.
   - [x] Deliverables: New solution entry (and architecture/design doc updates if required).
   - [x] Exit criteria: Compound step completed with prevention notes.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm validate`
- `pnpm --filter @coda/app tauri dev` (manual: tree navigation, document load, hidden/template toggle, responsive layout)
- `pnpm --filter @coda/app tauri build`

## Risks

- Tree-state complexity: refresh/toggle may reset expansion unexpectedly.
  - Mitigation: key tree state by stable path IDs and add focused tests.
- UI refactor regression: loading/error/document states may break during component split.
  - Mitigation: preserve existing fetch hooks and regression tests before visual polish.
- Over-polish scope creep: styling work could drift into unrelated feature work.
  - Mitigation: keep strict scope to docs viewer shell, sidebar tree, and readability.
- Accessibility gaps: custom tree components can degrade keyboard/screen-reader usability.
  - Mitigation: semantic buttons/aria attributes + keyboard navigation checks in tests/manual smoke.

## Progress Log

- 2026-02-18: Plan drafted for Tauri docs viewer UI refactor to monochrome modern style with proper hierarchical docs tree sidebar.
- 2026-02-18: Implemented docs-tree IA in frontend (`docs-tree.ts`): section/folder/file nodes with stable keys and ancestor expansion support.
- 2026-02-18: Refactored UI structure into focused components (`DocsSidebar`, `DocViewerPanel`) while keeping `list_doc_summaries` and `get_doc_document` data flow unchanged.
- 2026-02-18: Replaced scaffold visuals with monochrome tokenized style system and responsive sidebar/content layout.
- 2026-02-18: Updated frontend regression coverage for tree-based selection, nested folder expansion, hidden/template toggle, and list error states.
- 2026-02-18: Validation complete: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm validate`, and `pnpm --filter @coda/app tauri build` passed.
- 2026-02-18: `pnpm --filter @coda/app tauri dev` startup smoke passes (Vite + Rust app launch). Full in-window manual tree usability verification remains pending user interaction.
- 2026-02-18: Compound step recorded in `docs/solutions/2026-02-18-tauri-ui-monochrome-docs-sidebar.md`; no architecture doc update required.
- 2026-02-18: User confirmed in-window manual verification for tree navigation, hidden/template toggle, and responsive behavior.
