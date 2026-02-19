---
title: "Tauri docs viewer multi-project management with isolated state"
date: 2026-02-19
tags: [tauri, docs-viewer, multi-project, watcher, ipc]
status: "active"
---

## Problem

The Tauri app assumed a single workspace root and a single `docs/` tree. Users could not switch between registered projects, and docs/watcher updates from one project could leak into another project's UI state.

## Root Cause

The backend resolved paths from `CARGO_MANIFEST_DIR` and did not model an active project. The watcher emitted unscoped `docs_changed` events, and the frontend stored docs selection/find state as one global view.

## Solution

We implemented a project-aware runtime across Rust IPC, watcher lifecycle, and React UI.

- Added project registry/domain contract in Rust with validation for project IDs, root path existence, `docs/` existence, and duplicate ID/path rejection.
- Added project runtime state and IPC commands:
  - `list_projects`
  - `get_active_project`
  - `set_active_project`
- Persisted active project pointer to `~/.coda/app-state.toml` and restored it at app startup.
- Routed docs commands (`list_doc_summaries`, `get_doc_document`) through the active project root/docs paths.
- Rebuilt watcher architecture as **active-project single watcher** with stop/join replacement on project switch.
- Extended `docs_changed` payload with `project_id` to enforce event routing context.
- Added project sidebar UI and `PanelLeft` titlebar toggle (`aria-controls`, `aria-expanded`, `aria-pressed`).
- Added project-scoped view-state handling in UI (selected doc + tree expansion cache) and reset find state on project switch.
- Added active project context badge in the header to reduce ask/docs context confusion.

## Prevention

- Keep filesystem access behind active project context; avoid implicit workspace-root globals.
- Scope watcher events with project identifiers and filter in the UI.
- Replace watcher threads with explicit stop/join rules on context switch to avoid orphan threads.
- Keep project-switch behavior covered with regression tests for sidebar toggle, project switch, and state restoration.

## Related

- `docs/plans/active/2026-02-19-feat-tauri-multi-project-management-plan.md`
- `apps/app/src-tauri/src/project_registry.rs`
- `apps/app/src-tauri/src/project_runtime.rs`
- `apps/app/src-tauri/src/docs_watcher.rs`
- `apps/app/src/App.tsx`
- `apps/app/src/App.test.tsx`
