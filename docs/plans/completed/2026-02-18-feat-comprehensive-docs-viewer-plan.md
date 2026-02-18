---
title: "Comprehensive Docs Viewer in Tauri UI (all docs/ markdown)"
date: 2026-02-18
status: completed
tags: [tauri, ui, docs, markdown, knowledge-base]
milestone: M1
---

## Goal

Enable the Tauri UI to browse and read markdown documents across the full `docs/` tree (not only plans), with metadata + rendered content, while preserving strict filesystem safety boundaries.

## Context

- Current implementation is plan-specific end-to-end:
  - frontend labels and loading copy are tied to plans and `docs/plans/active` (`apps/app/src/App.tsx:123`, `apps/app/src/App.tsx:130`, `apps/app/src/App.tsx:134`)
  - Rust boundary allowlist is hard-coded to `docs/plans/active` (`apps/app/src-tauri/src/plan_viewer.rs:7`, `apps/app/src-tauri/src/plan_viewer.rs:56`, `apps/app/src-tauri/src/plan_viewer.rs:151`)
  - shared contract types are plan-only (`packages/core/src/contracts.ts:5`, `packages/core/src/contracts.ts:18`, `packages/core/src/contracts.ts:20`)
- PRD and architecture position `docs/` as the system of record across multiple knowledge types, not only plans (`docs/PRD.md:248`, `docs/PRD.md:252`, `docs/design-docs/architecture-overview.md:375`).
- Existing prior art already solved markdown rendering + path-boundary safety for plan files (`docs/solutions/2026-02-18-tauri-plan-markdown-viewer.md`).
- `docs/plans/.template.md` and `docs/solutions/.template.md` contain intentionally blank metadata placeholders; these should remain accessible in the viewer but discoverable via a filter, not forced in default listing.

## Prior Art

- `docs/plans/completed/2026-02-18-feat-tauri-plan-markdown-viewer-plan.md`
- `docs/solutions/2026-02-18-tauri-plan-markdown-viewer.md`
- `docs/plans/.template.md`
- `docs/design-docs/ADR-002-knowledge.md`

## Approach

1. **Define docs-viewer scope and data contract**
   - [x] Action: Define exact inclusion rules for `docs/**/*.md` with filter controls that can include/exclude template/hidden docs.
   - [x] Action: Define generalized document types in `@coda/core` (summary + full document) with fields needed by both IPC and UI.
   - [x] Deliverables: Contract updates documenting id/path strategy, metadata shape, and display labels for non-plan docs.
   - [x] Exit criteria: A single contract supports plans, solutions, design docs, references, and PRD markdown consistently.

2. **Generalize Rust file access from plan-only to docs-root**
   - [x] Action: Replace/extend plan-specific commands with docs-scoped commands (`list_doc_summaries`, `get_doc_document`) rooted at `docs/`.
   - [x] Action: Add recursive markdown discovery under `docs/` with canonical path enforcement and traversal rejection.
   - [x] Action: Implement deterministic ordering/grouping metadata (for example by top-level docs section + filename/date).
   - [x] Deliverables: Rust command handlers and parser updates that return typed docs payloads for mixed document types.
   - [x] Exit criteria: API can list/open arbitrary allowed docs markdown files without reading outside `docs/`.

3. **Handle metadata variability explicitly**
   - [x] Action: Treat frontmatter fields as optional for rendering; when a field is missing, do not render that metadata row/label.
   - [x] Action: Ensure malformed files fail with clear error messages that include file path context.
   - [x] Deliverables: Boundary validation policy + implementation aligned with project frontmatter conventions.
   - [x] Exit criteria: Viewer behavior is deterministic for valid docs, filtered template docs, missing optional metadata fields, and malformed documents.

4. **Update Tauri UI from plan viewer to docs viewer**
   - [x] Action: Replace plan-specific labels/states/selectors with docs-wide naming and browsing affordances.
   - [x] Action: Add filter control(s) so template/hidden docs can be shown on demand.
   - [x] Action: Show document path/section context in selection UI so users can distinguish similarly named files.
   - [x] Action: Preserve rendered markdown + metadata panel and adapt fields for non-plan docs.
   - [x] Deliverables: UI flow that can browse and read files across `docs/PRD.md`, `docs/design-docs/`, `docs/solutions/`, and `docs/plans/`.
   - [x] Exit criteria: User can open the app, select multiple doc categories, and read rendered content without raw markdown parsing issues.

5. **Add regression coverage and run full validation gate**
   - [x] Action: Add Rust tests for recursive listing, hidden/template handling policy, malformed metadata behavior, and traversal rejection.
   - [x] Action: Add/extend frontend tests for selection + load/error states with docs-wide payloads.
   - [x] Action: Run full gate and app smoke checks.
   - [x] Deliverables: Passing automated tests + manual verification evidence for docs-wide viewer flow.
   - [x] Exit criteria: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm validate` pass; manual Tauri viewer smoke succeeds.

6. **Compound step and architecture follow-up**
   - [x] Action: Record implementation learnings in `docs/solutions/` after work is complete.
   - [x] Action: Update design docs if docs-viewer contracts or knowledge-boundary assumptions change.
   - [x] Deliverables: New solution entry and any required architecture note updates.
   - [x] Exit criteria: Compound artifacts exist and point to this plan.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm validate`
- `cd apps/app/src-tauri && cargo test`
- `pnpm --filter @coda/app tauri dev` (manual smoke: browse docs across multiple directories and verify rendered markdown + metadata)
- `pnpm --filter @coda/app tauri build`

## Risks

1. **Metadata strictness mismatch**
   - Docs files may not share identical metadata requirements, and template files intentionally have placeholders.
   - Mitigation: optional metadata rendering (skip missing fields) plus explicit filter behavior for template/hidden docs.
2. **Path boundary regression**
   - Expanding from one directory to recursive `docs/` increases traversal and canonicalization surface area.
   - Mitigation: keep strict canonical root checks at `docs/` and add dedicated traversal tests.
3. **UI discoverability**
   - A flat list across all docs can become noisy.
   - Mitigation: include section/path context and deterministic ordering in summary payload.
4. **Scope creep**
   - Docs viewer may drift into annotation/search/indexing work.
   - Mitigation: keep this plan scoped to read/browse/render path only.

## Progress Log

- 2026-02-18: Draft plan created to generalize Tauri markdown viewing from `docs/plans/active` to the full `docs/` tree with safe boundary and regression coverage.
- 2026-02-18: Scope decisions confirmed: template/hidden docs should be shown via filter; missing frontmatter fields should be omitted from rendering, not hard-failed.
- 2026-02-18: Implemented docs-wide contracts, Rust docs-root commands (`list_doc_summaries`, `get_doc_document`), recursive safe discovery, and optional frontmatter handling.
- 2026-02-18: Updated Tauri UI to docs viewer with hidden/template filter, section/path-aware selector labels, and metadata-row omission for missing fields.
- 2026-02-18: Added Rust + frontend regression tests; full automated gate passed (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm validate`, `cargo test`, `pnpm --filter @coda/app tauri build`).
- 2026-02-18: `pnpm --filter @coda/app tauri dev` startup smoke passes (Vite + Rust app launch). In-window docs browsing verification still requires local manual UI interaction.
- 2026-02-18: Manual in-window docs browsing verification completed by user (multiple docs categories + rendered metadata/content confirmed).
