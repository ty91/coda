---
title: "Projects sidebar FolderPlus project registration flow"
date: 2026-02-19
tags: [tauri, app, projects-sidebar, project-registration, dialog]
status: "active"
---

## Problem

The app supported project listing/switching but did not provide an in-app entry point to register a new project root. Users had to edit `~/.coda/config.toml` manually.

## Root Cause

- `ProjectsSidebar` rendered only a static `Projects` label with no add action.
- Rust IPC exposed `list_projects`, `get_active_project`, `set_active_project` only.
- No folder picker flow existed in the frontend runtime.
- Global config persistence path for registration was not implemented in runtime state.

## Solution

- Added a `FolderPlus` icon action to `ProjectsSidebar` with explicit `addActionState` contract (`idle | selecting | registering`) and accessible state labels.
- Added Tauri folder picker flow via `@tauri-apps/plugin-dialog` and wired `FolderPlus -> open folder -> register_project IPC`.
- Added Rust registration pipeline:
  - canonicalize selected root path
  - reject duplicate root path
  - require `docs/` directory
  - derive unique `project_id`
  - append to `~/.coda/config.toml` with deterministic key ordering and atomic file replacement
  - reload in-memory registry after persistence
- Added regression coverage for:
  - frontend add flow success/cancel/failure
  - runtime persistence/reload
  - duplicate/docs-missing rejection
  - deterministic global config ordering

## Prevention

- Keep icon-only actions behind explicit state contracts and accessibility labels.
- Keep registration validation at backend boundary even when frontend picker exists.
- Persist config writes atomically to avoid partial config corruption.
- Lock add-flow regression tests to success/cancel/error branches to prevent silent UX drift.

## Related

- `docs/plans/completed/2026-02-19-feat-projects-sidebar-folder-plus-add-project-plan.md`
- `apps/app/src/components/ProjectsSidebar.tsx`
- `apps/app/src/App.tsx`
- `apps/app/src-tauri/src/project_registration.rs`
- `apps/app/src-tauri/src/project_runtime.rs`
