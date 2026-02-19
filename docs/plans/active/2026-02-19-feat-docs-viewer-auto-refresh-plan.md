---
title: "Auto-refresh docs viewer when files under docs/ change"
date: 2026-02-19
status: draft
tags: [tauri, docs-viewer, file-watch, auto-refresh, milestone-1]
milestone: M1
---

## Goal

When a user is reading a document in the app, changes under `docs/` should refresh the viewer automatically without requiring manual sidebar refresh.

## Context

- The current app only refreshes the docs list on initial mount and explicit refresh button click (`apps/app/src/App.tsx:43`, `apps/app/src/App.tsx:89`, `apps/app/src/App.tsx:163`).
- The selected document is fetched only when `selectedDocId` changes, so in-place file edits are not reflected automatically (`apps/app/src/App.tsx:93`).
- The backend currently exposes pull-style commands only (`list_doc_summaries`, `get_doc_document`) and has no push event for document changes (`apps/app/src-tauri/src/lib.rs:20`).
- Docs loading in Rust is request-time file read (`apps/app/src-tauri/src/plan_viewer.rs:65`, `apps/app/src-tauri/src/plan_viewer.rs:71`), so automatic updates need an additional watcher/event path.
- Existing UX includes manual sidebar refresh control and tests for that path (`apps/app/src/components/DocsSidebar.tsx:165`, `apps/app/src/App.test.tsx:186`).
- Architecture guidance already positions the Rust sidecar as the place for file watching (`docs/design-docs/architecture-overview.md:199`).
- External references (official):
  - Tauri event system (Rust emit + frontend listen): https://v2.tauri.app/develop/calling-frontend/
  - Tauri event best-practice caution (avoid high-frequency event spam): https://v2.tauri.app/develop/calling-frontend/
  - Tauri filesystem plugin watch permissions complexity (alternative path not chosen for this plan): https://v2.tauri.app/plugin/file-system/
  - Rust `notify` crate API for cross-platform watchers: https://docs.rs/notify/latest/notify/

## Prior Art

- `docs/solutions/2026-02-18-comprehensive-docs-viewer.md`
- `docs/solutions/2026-02-19-lucide-icon-only-sidebar-refresh.md`
- `docs/plans/completed/2026-02-18-feat-comprehensive-docs-viewer-plan.md`
- `docs/plans/completed/2026-02-19-feat-lucide-sidebar-refresh-icon-plan.md`

## Refresh Contract (Locked)

- Event name: `docs_changed`
- Shared payload type: `DocsChangedEventPayload` in `packages/core/src/contracts.ts`
  - `changedDocIds`: docs affected by create/modify/rename target path.
  - `removedDocIds`: docs removed by delete/rename source path.
  - `kinds`: normalized change kinds (`modified|created|removed|renamed|other`).
  - `emittedAtIso`: UTC ISO timestamp from backend emit point.
- Trigger matrix:
  - Modify `docs/**/*.md` -> include doc id in `changedDocIds`, kind `modified`.
  - Create `docs/**/*.md` -> include doc id in `changedDocIds`, kind `created`.
  - Remove `docs/**/*.md` -> include doc id in `removedDocIds`, kind `removed`.
  - Rename `docs/**/*.md` -> old id in `removedDocIds`, new id in `changedDocIds`, kind `renamed`.
- Frontend reaction contract:
  - Always refresh summaries on event.
  - Reload selected document if selected id appears in `changedDocIds`.
  - Clear selection if selected id appears in `removedDocIds` after refresh validation.

## Approach

1. **Lock refresh contract and scope**
   - [x] Action: Define the behavior contract for docs changes: which events trigger list refresh, selected-document reload, and selection clear.
   - [x] Action: Add a shared event payload type in `packages/core/src/contracts.ts` for `docs_changed` notifications to keep Rust/TS in sync.
   - [x] Deliverables: Contract notes (event name, payload fields, trigger matrix for modify/create/remove/rename).
   - [x] Exit criteria: Refresh behavior is deterministic and documented before runtime changes start.

2. **Add Rust docs watcher runtime**
   - [x] Action: Add a dedicated watcher module in `apps/app/src-tauri/src/` (for example `docs_watcher.rs`) and keep `lib.rs` thin.
   - [x] Action: Use `notify` to recursively watch the canonical `docs/` root and filter to markdown paths only.
   - [x] Action: Coalesce bursty filesystem events (debounce/throttle) and emit a compact `docs_changed` event through Tauri.
   - [x] Deliverables: Running watcher lifecycle wired from Tauri setup + backend event emission.
   - [x] Exit criteria: Editing, creating, renaming, or deleting markdown under `docs/` produces stable `docs_changed` events.

3. **Wire frontend event subscription and reload flow**
   - [ ] Action: Subscribe to the backend `docs_changed` event in `apps/app/src/App.tsx` using Tauri `listen`, and clean up with `unlisten`.
   - [ ] Action: On event, refresh summaries; if the selected doc changed, refetch the document; if deleted, clear selection and show empty-state guidance.
   - [ ] Action: Guard against duplicate concurrent reloads so autosync and manual refresh do not race into unstable UI state.
   - [ ] Deliverables: Event-driven docs list + viewer refresh behavior in React state flow.
   - [ ] Exit criteria: The visible reader stays in sync with file changes without user click.

4. **Add regression coverage**
   - [ ] Action: Add Rust tests for watcher event filtering/path mapping/coalescing logic in deterministic unit tests (avoid flaky OS timing dependence where possible).
   - [ ] Action: Add frontend tests mocking Tauri event subscription to verify automatic list/document reload and unlisten cleanup on unmount.
   - [ ] Action: Extend existing refresh-focused tests so auto-refresh behavior does not regress while preserving manual refresh semantics.
   - [ ] Deliverables: Updated tests in `apps/app/src-tauri/src/` and `apps/app/src/App.test.tsx`.
   - [ ] Exit criteria: Tests fail when watcher event handling or auto-refresh state transitions break.

5. **Run full validation and manual smoke**
   - [ ] Action: Run repository gate (`lint`, `typecheck`, `test`, `build`, `validate`) after implementation.
   - [ ] Action: Execute manual Tauri smoke by opening one docs file in the viewer, editing the file on disk, and confirming viewer content updates without refresh click.
   - [ ] Deliverables: Passing gate outputs + manual verification note.
   - [ ] Exit criteria: End-to-end auto-refresh works with no regression in docs navigation and rendering.

6. **Complete compound documentation**
   - [ ] Action: Record watcher-driven docs refresh pattern and failure-prevention notes in `docs/solutions/`.
   - [ ] Action: Update design documentation only if the watcher/event contract changes architectural assumptions.
   - [ ] Deliverables: New solution document with related links.
   - [ ] Exit criteria: Compound step completed with reusable guidance.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test`
- `pnpm --filter @coda/app tauri dev` (manual: edit currently opened `docs/*.md` file and verify auto-refresh)

## Risks

- **Event burst noise from editor save patterns**: one save can emit multiple file system events.
  - Mitigation: debounce/coalesce and filter to meaningful markdown changes before emitting UI events.
- **Selection drift on rename/delete**: selected `docId` can become invalid during updates.
  - Mitigation: revalidate selected ID after summary refresh and clear selection with explicit user feedback.
- **Cross-platform watcher behavior differences**: event kinds vary by OS/editor.
  - Mitigation: rely on normalized change intent, test modify/create/remove/rename paths, and keep fallback manual refresh intact.
- **Subscription lifecycle leaks**: missing `unlisten` causes duplicate handlers and repeated reloads.
  - Mitigation: enforce cleanup in React effect and lock with regression tests.

## Progress Log

- 2026-02-19: Planning target confirmed: auto-refresh docs viewer when files under `docs/` change while reading.
- 2026-02-19: Checked `docs/plans/active/`; no active plan exists for docs watcher-based auto-refresh.
- 2026-02-19: Reviewed prior art in `docs/solutions/` and completed docs-viewer/refresh plans.
- 2026-02-19: Reviewed current frontend/backend docs-viewer flow in `apps/app/src/App.tsx`, `apps/app/src/components/DocsSidebar.tsx`, `apps/app/src-tauri/src/lib.rs`, and `apps/app/src-tauri/src/plan_viewer.rs`.
- 2026-02-19: External research completed using official Tauri event and filesystem plugin docs plus Rust `notify` crate docs.
- 2026-02-19: Chosen direction for this plan: Rust-side watcher + Tauri event emission + frontend subscription refresh flow.
- 2026-02-19: Step 1 complete. Locked `docs_changed` contract and added shared payload type (`DOCS_CHANGED_EVENT`, `DocsChangeKind`, `DocsChangedEventPayload`) in `packages/core/src/contracts.ts`.
- 2026-02-19: Step 2 complete. Added `apps/app/src-tauri/src/docs_watcher.rs` with recursive `docs/` watcher, markdown-only filtering, debounce coalescing, and `docs_changed` event emission; wired startup in `apps/app/src-tauri/src/lib.rs`.
