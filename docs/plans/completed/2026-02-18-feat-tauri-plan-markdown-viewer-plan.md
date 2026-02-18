---
title: "Milestone 1 Plan Markdown Viewer in Tauri UI"
date: 2026-02-18
status: "completed"
tags: [tauri, ui, plans, markdown, milestone-1]
milestone: M1
---

## Goal

Allow a user to open Coda plans in the Tauri app and read them as rendered markdown with visible metadata (title, date, status, tags), so plan review can happen in UI without reading raw files in an editor.

## Context

- PRD requires a P1 plan viewer in Tauri: rendered markdown + plan metadata (`docs/PRD.md:243`).
- UX spec states plan content should be rendered markdown, not raw JSON (`docs/design-docs/ux-specification.md:185`, `docs/design-docs/ux-specification.md:198`).
- Design tensions doc keeps M1 UI intentionally minimal: plan viewer + annotation + status; richer UI deferred (`docs/design-docs/design-tensions.md:44`).
- Architecture overview M1 baseline includes basic Tauri UI that displays plans (`docs/design-docs/architecture-overview.md:376`).
- Current app is scaffold-only: `apps/app/src/App.tsx:43` still shows "Plan / Work Placeholder", and Rust IPC exposes only health check (`apps/app/src-tauri/src/lib.rs:8`).

## Prior Art

- `docs/plans/completed/2026-02-18-tauri-cli-scaffold-plan.md` established app shell, Rust command bridge, and full validation gate.
- `docs/solutions/2026-02-18-tauri-cli-scaffold.md` captures known Tauri packaging constraint (`bundle.targets = ["app"]`) and current testing flow.
- `docs/plans/.template.md` is the required plan structure baseline.

## Approach

1. **Define plan source + data contract for viewer**
   - [x] Action: Define which plan directories are in scope for M1 viewer (at minimum `docs/plans/active/`; decide whether to include `docs/plans/completed/` now).
   - [x] Action: Define typed plan summary/detail payload shape shared between Tauri IPC and React.
   - [x] Deliverables: Short contract spec in code-facing docs or type definitions with required fields: file path/id, title, date, status, tags, markdown body.
   - [x] Exit criteria: Contract supports rendering one full plan file without frontend string parsing hacks.

2. **Add Tauri-side plan file read + parse pipeline**
   - [x] Action: Add Tauri command(s) to list eligible plan files and load one plan content payload.
   - [x] Action: Parse YAML frontmatter and markdown body at boundary; validate required metadata fields and produce typed response.
   - [x] Action: Enforce safe filesystem boundary (no path traversal; reads only from allowed `docs/plans/` roots).
   - [x] Deliverables: Rust command handler(s) + tests for success path and invalid/missing frontmatter/path rejection.
   - [x] Exit criteria: Frontend can request a plan and always receive either valid typed data or explicit structured error.

3. **Replace placeholder with markdown plan viewer in React**
   - [x] Action: Replace current plan placeholder panel with plan list selector + detail pane.
   - [x] Action: Render markdown body into readable HTML in center content area; display metadata above content.
   - [x] Action: Handle loading, empty-state, and fetch-error states with explicit UI messaging.
   - [x] Deliverables: Functional viewer for at least one real plan file in `docs/plans/active/`.
   - [x] Exit criteria: User can launch app, choose a plan, and read rendered sections/headings/checklists without raw markdown artifacts.

4. **Lock scope and defer annotation cleanly**
   - [x] Action: Keep annotation UI/actions out of this change; no inline comments/approval controls yet.
   - [x] Action: Add TODO markers or follow-up note that references future annotation phase requirements from UX spec.
   - [x] Deliverables: Explicit non-goals documented in code comments/docs to prevent accidental scope creep.
   - [x] Exit criteria: PR scope is only viewer/read path; annotation features intentionally absent and documented as next phase.

5. **Validate end-to-end and compound**
   - [x] Action: Run full repo gate (`pnpm validate`) after implementation.
   - [x] Action: Run app-level manual smoke check for plan loading/render path in Tauri dev mode.
   - [x] Action: Capture implementation learnings in `docs/solutions/` and note architecture impact if boundaries/contracts changed.
   - [x] Deliverables: Passing validation evidence + new solution entry linked to this plan.
   - [x] Exit criteria: Viewer works on desktop app with reproducible checks and documented compound output.

## Validation

- `pnpm validate`
- `pnpm --filter @coda/app tauri dev` (manual: open app, select plan, verify rendered markdown + metadata)
- `pnpm --filter @coda/app tauri build`
- If Rust unit tests are added for parser/IPC: `cd apps/app/src-tauri && cargo test`

## Risks

1. **Frontmatter variability**
   - Some plan files may miss required keys or have malformed YAML.
   - Mitigation: strict boundary validation with explicit error states in UI.
2. **Filesystem safety**
   - Plan load endpoint could become a path traversal vector if raw paths are accepted.
   - Mitigation: canonicalize paths and enforce `docs/plans/` allowlist in Rust.
3. **Markdown rendering mismatch**
   - Checklist/table rendering may differ from expected GitHub-style markdown.
   - Mitigation: choose renderer with required syntax coverage and add render regression tests for representative plan content.
4. **Scope creep into annotation**
   - Reviewer note/approval controls can expand effort quickly.
   - Mitigation: enforce viewer-only scope in this plan; create follow-up plan for annotation.

## Progress Log

- 2026-02-18: Draft plan created for M1 viewer-first UI scope (render plan markdown in Tauri; annotation deferred).
- 2026-02-18: Added shared plan document contracts in `packages/core` and Rust Tauri commands for listing/loading plans from `docs/plans/active`.
- 2026-02-18: Replaced app placeholder with plan selector + rendered markdown viewer (metadata, loading, empty/error states); annotation kept out-of-scope with explicit TODO note.
- 2026-02-18: Validation complete (`pnpm validate`, `cargo test`, `pnpm --filter @coda/app tauri build`, `pnpm --filter @coda/app tauri dev` startup smoke).
